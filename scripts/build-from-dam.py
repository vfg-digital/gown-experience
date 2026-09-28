"""
Build src/data/products.ts from:
  - the SOH Excel (product master + sizes + gown/cappe pairings)
  - the Content Hub / DAM Cloud API v2 (product model description + Thron image URLs)

The site stays a STATIC export (next.config.js output:'export'): images are NOT
downloaded into the bucket, the generated products.ts references public Thron CDN
URLs that the browser loads at runtime.

The DAM x-api-key is read from the CH_KEY environment variable and is used ONLY
here, at build time. It is never written to a committed file and never shipped to
the browser (the guide states the key is server-to-server only).

Usage (from GOWNS-DE-REVE/):
    $env:CH_KEY="<key>"; python scripts/build-from-dam.py

Options via env:
    CH_KEY        (required) DAM x-api-key
    DAM_DIMENSION (optional) Thron size, default 1280x0
    SOH_XLSX      (optional) path to the SOH xlsx (default: ../Doc/SOH GOWN & CAPPE @08.09.xlsx)

Notes:
  - The corporate proxy performs TLS interception with a private CA, so requests'
    default verification fails. This build-time internal script disables TLS
    verification against the DAM host on purpose (verify=False). It does not run
    in production and transmits no data outward beyond the DAM query itself.
"""

import os
import re
import sys
import json
import time
import shutil
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed

import openpyxl
import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# --------------------------------------------------------------------------- #
# Config
# --------------------------------------------------------------------------- #
API_KEY = os.environ.get("CH_KEY")
if not API_KEY:
    print("ERROR: set the CH_KEY environment variable with the DAM x-api-key.")
    sys.exit(1)

BASE = "https://dam.valentino.com/dam/ext/rest-api"
DIMENSION = os.environ.get("DAM_DIMENSION", "1280x0")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)               # GOWNS-DE-REVE
WORKSPACE_ROOT = os.path.dirname(PROJECT_ROOT)           # gowns
DEFAULT_XLSX = os.path.join(WORKSPACE_ROOT, "Doc", "SOH GOWN & CAPPE @08.09.xlsx")
XLSX = os.environ.get("SOH_XLSX", DEFAULT_XLSX)

OUTPUT_TS = os.path.join(PROJECT_ROOT, "src", "data", "products.ts")
CACHE_JSON = os.path.join(SCRIPT_DIR, ".dam-cache.json")
IMAGES_DIR = os.path.join(PROJECT_ROOT, "public", "images")
DOC_DIR = os.path.join(WORKSPACE_ROOT, "Doc")

GOWN_CATEGORY = "ABITO DA SERA"
CONCURRENCY = 6
TIMEOUT = 60
RETRIES = 3

HEADERS = {"x-api-key": API_KEY, "accept": "application/json"}

# Override manuali dell'immagine del Gowns Closet.
# I media del DAM non hanno un flag "still / su modella", quindi per certi
# prodotti la scelta automatica (shot=d) cade su uno scatto su modella. Per
# questi pochi casi, verificati a occhio, si indica il suffisso del titolo dello
# scatto "ghost" (senza modella) da usare nel closet; verra' zoomato come gli
# scatti manichino. Esempio: "F" = scatto fronte ghost su fondo bianco.
CLOSET_OVERRIDE = {
    "5B0VDK251MM157": "F",  # shot=d "A" era su modella -> uso il ghost fronte
    "3B0VDGX52UP157": "F",  # idem
}

# Immagini locali per i prodotti che il DAM non copre (o copre solo in parte).
# I file (relativi a Doc/) vengono copiati in public/images e serviti dal bucket:
# e' l'unica eccezione al caricamento a runtime da Thron, limitata a questi casi.
# "front" = scatto intero (mostrato nel closet e come prima immagine del pannello),
# "detail" = dettaglio (immagine di dettaglio nel pannello).
LOCAL_MEDIA = {
    "7B3VDLW01EDDJE": {  # gown: il DAM torna 0 media per questo CBC
        "front": "7B3VDLW01EDDJE-ecommerce-high/7B3VDLW01EDDJE-ecommerce-0.jpg",
        "detail": "7B3VDLW01EDDJE-ecommerce-high/7B3VDLW01EDDJE-ecommerce-1.jpg",
    },
    "7B3CG4R01EDDJE": {  # cappa abbinata al gown sopra
        "front": "7B3CG4R01EDDJE-ecommerce-high/7B3CG4R01EDDJE-ecommerce-0.jpg",
        "detail": "7B3CG4R01EDDJE-ecommerce-high/7B3CG4R01EDDJE-ecommerce-1.jpg",
    },
}


def copy_local_image(rel_path):
    """Copia un file da Doc/ a public/images/ e ritorna il path /images/... .
    Ritorna None se il sorgente non esiste (l'item ripiega su DAM/no-media)."""
    if not rel_path:
        return None
    src = os.path.join(DOC_DIR, rel_path)
    if not os.path.isfile(src):
        return None
    os.makedirs(IMAGES_DIR, exist_ok=True)
    name = os.path.basename(rel_path)
    shutil.copyfile(src, os.path.join(IMAGES_DIR, name))
    return f"/images/{name}"

# --------------------------------------------------------------------------- #
# Excel reading
# --------------------------------------------------------------------------- #
def open_workbook(path):
    """OneDrive / Excel keep the file locked; read from a temp copy."""
    tmp = os.path.join(tempfile.gettempdir(), "soh_build.xlsx")
    shutil.copyfile(path, tmp)
    return openpyxl.load_workbook(tmp, read_only=True, data_only=True)


def s(v):
    return "" if v is None else str(v).strip()


def read_excel(path):
    wb = open_workbook(path)
    ws = wb["DB"]
    rows = list(ws.iter_rows(values_only=True))
    header = [s(h) for h in rows[0]]
    idx = {h: i for i, h in enumerate(header)}

    # per SKU CONT master record
    products = {}   # sku_cont -> dict
    for r in rows[1:]:
        if not r:
            continue
        sku = s(r[idx["SKU CONT"]])
        if not sku:
            continue
        rec = products.get(sku)
        if rec is None:
            rec = {
                "sku_cont": sku,
                "category": s(r[idx["CATEGORY"]]),
                "matcont": s(r[idx["MAT CONT"]]),
                "col": s(r[idx["COL"]]),
                "coldesc": s(r[idx["COL DESC"]]),
                "sizes": set(),
                "abbinamento": s(r[idx["ABBINAMENTI"]]) if "ABBINAMENTI" in idx else "",
            }
            products[sku] = rec
        # MAT CONT / COL can be blank on some continuation rows: keep first non-empty
        if not rec["matcont"] and s(r[idx["MAT CONT"]]):
            rec["matcont"] = s(r[idx["MAT CONT"]])
        if not rec["col"] and s(r[idx["COL"]]):
            rec["col"] = s(r[idx["COL"]])
        if not rec["abbinamento"] and "ABBINAMENTI" in idx and s(r[idx["ABBINAMENTI"]]):
            rec["abbinamento"] = s(r[idx["ABBINAMENTI"]])
        size = s(r[idx["SIZE"]])
        if size:
            rec["sizes"].add(size)

    # ABBINAMENTI sheet: GOWN -> CAPPE
    pairings = {}
    if "ABBINAMENTI" in wb.sheetnames:
        aws = wb["ABBINAMENTI"]
        arows = list(aws.iter_rows(values_only=True))
        ah = [s(h).upper() for h in arows[0]]
        gi = ah.index("GOWN") if "GOWN" in ah else 0
        ci = ah.index("CAPPE") if "CAPPE" in ah else 1
        for r in arows[1:]:
            if not r:
                continue
            g = s(r[gi])
            c = s(r[ci])
            if g and c:
                pairings[g] = c

    # merge DB ABBINAMENTI column as secondary source
    for sku, rec in products.items():
        if rec["category"] == GOWN_CATEGORY and rec["abbinamento"] and sku not in pairings:
            pairings[sku] = rec["abbinamento"]

    return products, pairings


def build_cbc(rec_or_sku, products):
    """CBC = MAT CONT + '_' + COL. Fallback: split SKU CONT (color = last 3 chars)."""
    if isinstance(rec_or_sku, dict):
        matcont, col, sku = rec_or_sku["matcont"], rec_or_sku["col"], rec_or_sku["sku_cont"]
    else:
        sku = rec_or_sku
        rec = products.get(sku)
        if rec:
            matcont, col = rec["matcont"], rec["col"]
        else:
            matcont, col = "", ""
    if matcont and col:
        return f"{matcont}_{col}"
    if len(sku) > 3:
        return f"{sku[:-3]}_{sku[-3:]}"
    return sku


# --------------------------------------------------------------------------- #
# DAM fetching
# --------------------------------------------------------------------------- #
def resize_url(url):
    return re.sub(r"/std/\d+x\d+/", f"/std/{DIMENSION}/", url)


def fetch_cbc(cbc):
    url = f"{BASE}/api/v2/products/cbc/{cbc}/full"
    last = None
    for attempt in range(RETRIES):
        try:
            r = requests.get(url, params={"media": "true"}, headers=HEADERS,
                             timeout=TIMEOUT, verify=False)
            if r.status_code == 200:
                return r.json()
            if r.status_code == 404:
                return {"__error__": "404"}
            last = f"HTTP {r.status_code}"
        except Exception as e:  # noqa
            last = repr(e)
        time.sleep(1.5 * (attempt + 1))
    return {"__error__": last or "unknown"}


def fetch_all(cbcs):
    results = {}
    with ThreadPoolExecutor(max_workers=CONCURRENCY) as ex:
        futs = {ex.submit(fetch_cbc, c): c for c in cbcs}
        done = 0
        for fut in as_completed(futs):
            c = futs[fut]
            results[c] = fut.result()
            done += 1
            if done % 20 == 0 or done == len(cbcs):
                print(f"  fetched {done}/{len(cbcs)}")
    return results


# --------------------------------------------------------------------------- #
# Media -> Product images
# --------------------------------------------------------------------------- #
PRE_ORDER = {"f": 0, "b": 1, "s": 2}

# Scatti editoriali / lifestyle (modella in ambientazione): da NON caricare.
# Sono gli shot della famiglia "e". Nota: la famiglia "d" (d, da, db) sono
# dettagli di prodotto e vanno tenuti.
EDITORIAL_SHOTS = {"e", "ea", "eb", "ec", "ed"}


def norm_pre_shot(m):
    """Pre-shooting shot letter. The DAM often leaves `shot` null and encodes it
    only in the title suffix (..._Rf / _Rb / _Rs / _Rd), so fall back to that."""
    sh = (m.get("shot") or "").lower()
    if sh:
        return sh
    t = m.get("title") or ""
    mm = re.search(r"_R([A-Za-z])$", t)
    return mm.group(1).lower() if mm else ""


def parse_media(medias):
    # scarta gli scatti editoriali (famiglia "e"): non vanno mai caricati.
    medias = [m for m in medias if (m.get("shot") or "").lower() not in EDITORIAL_SHOTS]
    pres = [m for m in medias if (m.get("type") or "") == "Pre-shooting"]
    ecom = [m for m in medias if (m.get("type") or "") == "E-commerce"]

    def rank_key(m):
        try:
            return int(m.get("rank"))
        except (TypeError, ValueError):
            return 999

    # --- pre-shooting: classify by normalized shot, front (f) first, detail (d) apart
    pre_tagged = [(norm_pre_shot(m), m) for m in pres]
    pre_detail_media = [m for (sh, m) in pre_tagged if sh == "d"]
    pre_gallery = [(sh, m) for (sh, m) in pre_tagged if sh != "d"]
    pre_gallery.sort(key=lambda p: (PRE_ORDER.get(p[0], 8), p[0]))
    preshoot_urls = [resize_url(m["url"]) for (_, m) in pre_gallery]
    pre_detail_url = resize_url(pre_detail_media[0]["url"]) if pre_detail_media else None
    pre_front_url = next((resize_url(m["url"]) for (sh, m) in pre_gallery if sh == "f"), None)

    # --- ecommerce stills. Two things matter, both keyed off `shot`/title, never
    # off the title alone (a ..._D can be an on-model front):
    #   ecom_still : the product-only render (shot == 'd'), used by the panel and
    #               as a last-resort closet image when there is no mannequin.
    #   ecom_U     : the CANONICAL packshot, i.e. the shot=d render titled ..._U
    #               (like 9B3VDNN01MMR9M). Only this qualifies for closet bucket 1.
    #               Items whose only still is ..._A (or an on-model ..._D) are NOT
    #               bucket 1: the closet uses their pre-shooting mannequin instead.
    ecom_still = None
    ecom_still_media = None
    for m in ecom:
        if (m.get("shot") or "").lower() == "d":
            ecom_still_media = m
            ecom_still = resize_url(m["url"])
            break
    ecom_U = None
    for m in ecom:
        if (m.get("shot") or "").lower() == "d" and (m.get("title") or "").endswith("U"):
            ecom_U = resize_url(m["url"])
            break
    ecom_non_detail = [m for m in ecom if m is not ecom_still_media]
    ecom_non_detail.sort(key=rank_key)
    ecom_urls = [resize_url(m["url"]) for m in ecom_non_detail]

    # --- detailImage (product panel): the ecommerce still packshot, or the
    # pre-shooting detail only when there is no ecommerce.
    detail = ecom_still
    if detail is None and not ecom and pre_detail_url:
        detail = pre_detail_url

    # --- closet thumbnail: the "detail" of each item, shown at its original
    # framing (no zoom).
    #   1) canonical ecommerce _U packshot (like 9B3VDNN01MMR9M)
    #   2) pre-shooting _Rd detail (mannequin)
    #   3) pre-shooting front (mannequin, never the back)
    #   4) other ecommerce still (shot=d) when no mannequin
    #   5) any remaining ecommerce shot
    if ecom_U:
        closet_url = ecom_U
    elif pre_detail_url:
        closet_url = pre_detail_url
    elif pre_front_url:
        closet_url = pre_front_url
    elif preshoot_urls:
        closet_url = preshoot_urls[0]
    elif ecom_still:
        closet_url = ecom_still
    elif ecom_urls:
        closet_url = ecom_urls[0]
    else:
        closet_url = ""

    # closet ordering flags: bucket 1 = canonical _U packshot,
    # bucket 2 = pre-shooting _Rd detail.
    has_packshot = ecom_U is not None
    has_preshoot_detail = pre_detail_url is not None
    return preshoot_urls, ecom_urls, detail, closet_url, has_packshot, has_preshoot_detail


def to_sentence(v):
    v = (v or "").strip()
    return v[:1].upper() + v[1:].lower() if v else v


def build_record(dam, excel_rec):
    """Assemble a Product-shaped dict from a DAM response + Excel master row."""
    attrs = dam.get("attributes", {}) or {}
    pattrs = (dam.get("product_attributes", {}) or {}).get("attributes", {}) or {}
    medias = dam.get("medias") or []

    # sku: seasonal full code (matches current site format) e.g. 8B0VDN751EDCUZ
    sap_full = attrs.get("sap_full") or ""
    if sap_full:
        sku = sap_full.replace("_", "")
    else:
        mfc = attrs.get("mfc") or ""
        colc = attrs.get("sap_color_code") or ""
        sku = f"{mfc}{colc}"

    # description: DAM model description (English, always present), lowercased so
    # the display layer's capitalizeFirst yields sentence case.
    desc = (pattrs.get("sap_model_description") or "").strip().lower()

    # codice stagione (cronologico) per l'ordinamento interno ai blocchi
    scode = pattrs.get("sap_season_code")

    # color: prefer the Excel master (user's file), fallback to DAM sap_color
    coldesc = ""
    if excel_rec and excel_rec.get("coldesc"):
        coldesc = excel_rec["coldesc"]
    if not coldesc:
        coldesc = attrs.get("sap_color") or ""
    coldesc = to_sentence(coldesc)

    # sizes: Excel master, numeric sort; fallback to DAM sap_sizes keys
    sizes = []
    if excel_rec and excel_rec.get("sizes"):
        sizes = sorted(excel_rec["sizes"], key=lambda x: (len(x), x))
        try:
            sizes = sorted(excel_rec["sizes"], key=lambda x: int(x))
        except ValueError:
            pass
    elif attrs.get("sap_sizes"):
        try:
            sizes = sorted(attrs["sap_sizes"].keys(), key=lambda x: int(x))
        except ValueError:
            sizes = sorted(attrs["sap_sizes"].keys())

    preshoot, ecomm, detail, closet_url, has_packshot, has_preshoot_detail = parse_media(medias)

    # closet override: usa lo scatto ghost indicato (senza modella).
    override_suffix = CLOSET_OVERRIDE.get(sku)
    if override_suffix:
        for m in medias:
            if (m.get("title") or "").endswith(override_suffix):
                closet_url = resize_url(m["url"])
                break

    # local media override: per gli item che il DAM non copre, usa i file locali.
    local = LOCAL_MEDIA.get(sku)
    if local:
        front = copy_local_image(local.get("front"))
        det = copy_local_image(local.get("detail"))
        if front or det:
            preshoot = []
            ecomm = [p for p in [front] if p]
            detail = det
            closet_url = front or det       # closet: scatto intero
            has_packshot = False
            has_preshoot_detail = False

    return {
        "sku": sku,
        "description": desc,
        "colorDesc": coldesc,
        "sizes": sizes,
        "preshootImages": preshoot,
        "ecommImages": ecomm,
        "detailImage": detail,
        "closetImage": closet_url,
        # flag per l'ordinamento del closet (bucket assegnato in main()):
        "_hasPackshot": has_packshot,            # -> bucket 1 (packshot _U)
        "_hasPreshootDetail": has_preshoot_detail,  # -> bucket 2 (pre-shooting _Rd)
        # codice stagione DAM (cronologico: 69=FW26/27 ... 59=FW21/22). Usato per
        # ordinare dentro ogni blocco dal piu' recente al piu' vecchio.
        "_seasonCode": int(scode) if str(scode or "").isdigit() else 0,
        "_hasImages": bool(preshoot or ecomm or detail),
    }


# --------------------------------------------------------------------------- #
# products.ts generation
# --------------------------------------------------------------------------- #
def esc(v):
    return (v or "").replace("\\", "\\\\").replace('"', '\\"')


def arr(items):
    return ", ".join(f'"{esc(i)}"' for i in items)


TS_HEADER = """export interface Product {
  sku: string;
  description: string;
  colorDesc: string;
  sizes: string[];
  preshootImages: string[];
  ecommImages: string[];
  detailImage: string | null;
  // Immagine mostrata nella griglia del Gowns Closet: il "dettaglio" del capo
  // (packshot ecommerce se esiste, altrimenti lo scatto pre-shooting _Rd),
  // mostrata all'inquadratura originale. L'ordine dell'array e' gia' quello del
  // Closet, quindi Book e Closet condividono la stessa sequenza.
  closetImage: string;
}

export const products: Product[] = [
"""

TS_FOOTER = """
];

// Get all image paths for a product: preshooting first, then ecommerce, then detail
export function getAllImagePaths(product: Product): string[] {
  const paths: string[] = [...product.preshootImages, ...product.ecommImages];
  if (product.detailImage) {
    paths.push(product.detailImage);
  }
  return paths;
}

// Get thumbnail for grid view (Gowns Closet): the detail of each item.
export function getThumbnailPath(product: Product): string {
  if (product.closetImage) {
    return product.closetImage;
  }
  if (product.detailImage) {
    return product.detailImage;
  }
  if (product.preshootImages.length > 0) {
    return product.preshootImages[0];
  }
  if (product.ecommImages.length > 0) {
    return product.ecommImages[0];
  }
  return "";
}
"""


def render_product(p):
    detail = f'"{esc(p["detailImage"])}"' if p["detailImage"] else "null"
    return f"""
  {{
    sku: "{esc(p['sku'])}",
    description: "{esc(p['description'])}",
    colorDesc: "{esc(p['colorDesc'])}",
    sizes: [{arr(p['sizes'])}],
    preshootImages: [{arr(p['preshootImages'])}],
    ecommImages: [{arr(p['ecommImages'])}],
    detailImage: {detail},
    closetImage: "{esc(p['closetImage'])}",
  }},"""


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def main():
    print("=== Build products from DAM ===")
    print(f"Excel : {XLSX}")
    print(f"Output: {OUTPUT_TS}")
    print(f"Thron size: {DIMENSION}")
    print()

    products_master, pairings = read_excel(XLSX)
    gowns = {k: v for k, v in products_master.items() if v["category"] == GOWN_CATEGORY}
    print(f"Distinct SKUs in DB : {len(products_master)}")
    print(f"Gowns (ABITO DA SERA): {len(gowns)}")
    print(f"Pairings gown->cappe : {len(pairings)}")

    # cappe that are paired to an included gown
    paired_cappe = {}
    for g in gowns:
        c = pairings.get(g)
        if c:
            paired_cappe[c] = True
    print(f"Distinct paired cappe: {len(paired_cappe)}")

    # CBC set to fetch = gowns + paired cappe
    fetch_skus = list(gowns.keys()) + list(paired_cappe.keys())
    cbc_of = {}
    for sku in fetch_skus:
        cbc_of[sku] = build_cbc(products_master.get(sku, sku), products_master)
    unique_cbcs = sorted(set(cbc_of.values()))
    print(f"Unique CBCs to fetch : {len(unique_cbcs)}")
    print()

    print("Fetching DAM ...")
    dam_by_cbc = fetch_all(unique_cbcs)

    # cache raw responses for debugging / re-runs
    with open(CACHE_JSON, "w", encoding="utf-8") as f:
        json.dump(dam_by_cbc, f)

    # build records
    records = {}      # sku_cont -> product dict
    errors = []
    no_media = []
    for sku in fetch_skus:
        cbc = cbc_of[sku]
        dam = dam_by_cbc.get(cbc, {})
        if not dam or dam.get("__error__"):
            errors.append((sku, cbc, dam.get("__error__") if dam else "empty"))
            continue
        rec = build_record(dam, products_master.get(sku))
        if not rec["_hasImages"]:
            no_media.append((sku, cbc))
            continue
        records[sku] = rec

    # assemble Option A order: gowns dal piu' recente al piu' vecchio (codice
    # stagione decrescente; a parita' di stagione, SKU decrescente), ognuno
    # seguito dalla sua cappa. Il sort stabile per bucket piu' avanti conserva
    # questo ordine dentro ogni blocco.
    gown_records = [(sku, records[sku]) for sku in gowns if sku in records]
    gown_records.sort(key=lambda kv: (kv[1]["_seasonCode"], kv[1]["sku"]), reverse=True)

    ordered = []
    seen_output_sku = set()
    cappe_inserted = 0
    for sku, rec in gown_records:
        if rec["sku"] in seen_output_sku:
            continue
        ordered.append(rec)
        seen_output_sku.add(rec["sku"])
        cappe_cont = pairings.get(sku)
        if cappe_cont and cappe_cont in records:
            crec = records[cappe_cont]
            if crec["sku"] not in seen_output_sku:   # avoid duplicate React keys
                # this gown+cappe are a pairing -> closet bucket 2, kept together
                rec["_paired"] = True
                crec["_paired"] = True
                ordered.append(crec)
                seen_output_sku.add(crec["sku"])
                cappe_inserted += 1

    # closet ordering buckets. The array is then reordered by this so that the
    # Gowns Book and the Gowns Closet share the exact same sequence.
    # Pairing wins over packshot/detail so a gown and its cappe never get split.
    #   1 = has ecommerce _U packshot
    #   2 = has pre-shooting _Rd detail
    #   3 = part of a gown+cappe pairing
    #   4 = everything else
    for rec in ordered:
        if rec.get("_paired"):
            rec["closetBucket"] = 3
        elif rec.get("_hasPackshot"):
            rec["closetBucket"] = 1
        elif rec.get("_hasPreshootDetail"):
            rec["closetBucket"] = 2
        else:
            rec["closetBucket"] = 4

    # reorder the array by bucket (stable: keeps SKU-desc + gown->cappe adjacency
    # within each bucket). This single order drives both Book and Closet.
    ordered.sort(key=lambda r: r["closetBucket"])

    # write products.ts
    body = TS_HEADER + "".join(render_product(p) for p in ordered) + TS_FOOTER
    with open(OUTPUT_TS, "w", encoding="utf-8") as f:
        f.write(body)

    print()
    print("=== Summary ===")
    print(f"Gowns included      : {len(gown_records)}")
    print(f"Cappe inserted      : {cappe_inserted}")
    print(f"Total catalog items : {len(ordered)}")
    b = {1: 0, 2: 0, 3: 0, 4: 0}
    for r in ordered:
        b[r["closetBucket"]] += 1
    print(f"Closet blocks       : 1(packshot)={b[1]}  2(preshoot detail)={b[2]}  3(pairings)={b[3]}  4(rest)={b[4]}")
    print(f"Fetch errors        : {len(errors)}")
    print(f"Zero-media (skipped): {len(no_media)}")
    if errors:
        print("  errors sample:", errors[:8])
    if no_media:
        print("  no-media sample:", no_media[:8])
    print(f"Written: {OUTPUT_TS}")


if __name__ == "__main__":
    main()
