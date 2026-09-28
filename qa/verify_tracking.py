"""
Verifica funzionale e analytics di Gowns De Reve su browser reale.

Non fa parte della catena di build: e' lo strumento con cui si controlla che
ogni requisito del manuale Adobe Launch sia davvero soddisfatto a runtime.
Serve la cartella out/ prodotta da "npm run build".

Metodo: al posto della libreria Adobe Launch si installa uno _satellite finto
che registra ogni chiamata. E' lo stesso punto di osservazione indicato dal
manuale (il breakpoint su _satellite.track), reso automatico: si verifica che
la funzione venga chiamata con il payload giusto, non che il dato arrivi in
Adobe Analytics.

Uso:
    python qa/verify_tracking.py
"""

from __future__ import annotations

import functools
import http.server
import json
import re
import socket
import socketserver
import sys
import threading
import urllib.error
import urllib.request
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Callable, Iterator

from playwright.sync_api import Browser, Page, sync_playwright

PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = PROJECT_ROOT / "out"

ACCESS_KEY = "valentino2026"

# Registra ogni chiamata a _satellite.track. Installato prima di qualsiasi
# script della pagina, quindi nessuna chiamata puo' sfuggire.
SATELLITE_STUB = """
window.__trackCalls = [];
window._satellite = {
  track: function (eventName, payload) {
    window.__trackCalls.push({ event: eventName, payload: payload });
  }
};
"""

# Variante in cui la libreria arriva in ritardo: serve a verificare che la coda
# non perda il primo page_view.
SATELLITE_STUB_LATE = """
window.__trackCalls = [];
setTimeout(function () {
  window._satellite = {
    track: function (eventName, payload) {
      window.__trackCalls.push({ event: eventName, payload: payload });
    }
  };
}, 1500);
"""

# Osserva ogni fotogramma del giro: serve a dimostrare che non esiste un
# istante in cui a schermo compaiono due pagine, cioe' che non si forma mai una
# doppia pagina.
SAMPLER = """
() => {
  window.__samples = [];
  window.__sampling = true;
  const stage = document.querySelector('.flip-stage');
  const stageWidth = stage ? stage.getBoundingClientRect().width : 0;
  const sample = () => {
    if (!window.__sampling) return;
    const pages = [...document.querySelectorAll('.flip-leaf')].map((el) => ({
      o: Number(getComputedStyle(el).opacity),
      w: el.getBoundingClientRect().width,
      stage: stageWidth,
    }));
    if (pages.length) window.__samples.push(pages);
    requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
}
"""

results: list[tuple[str, bool, str]] = []


def check(name: str, condition: bool, detail: str = "") -> bool:
    results.append((name, condition, detail))
    print(f"  [{'ok  ' if condition else 'FAIL'}] {name}" + (f" -> {detail}" if detail else ""))
    return condition


def check_equal(name: str, actual: Any, expected: Any) -> bool:
    ok = actual == expected
    detail = "" if ok else f"atteso {expected!r}, ottenuto {actual!r}"
    return check(name, ok, detail)


# --------------------------------------------------------------------------- #
# server statico
# --------------------------------------------------------------------------- #


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args: Any) -> None:  # noqa: D102
        pass


class QuietServer(socketserver.ThreadingTCPServer):
    """Il browser interrompe le richieste dei video appena gli bastano i primi
    byte: sono connessioni chiuse a meta', non errori da segnalare."""

    daemon_threads = True
    allow_reuse_address = True

    def handle_error(self, request: Any, client_address: Any) -> None:  # noqa: D102
        pass


@contextmanager
def static_server(directory: Path) -> Iterator[str]:
    port = free_port()
    handler = functools.partial(QuietHandler, directory=str(directory))
    with QuietServer(("127.0.0.1", port), handler) as httpd:
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        try:
            yield f"http://127.0.0.1:{port}"
        finally:
            httpd.shutdown()


# --------------------------------------------------------------------------- #
# utilita' di pagina
# --------------------------------------------------------------------------- #


def calls(page: Page) -> list[dict[str, Any]]:
    return page.evaluate("window.__trackCalls || []")


def page_views(page: Page) -> list[dict[str, Any]]:
    return [c["payload"] for c in calls(page) if c["event"] == "page_view"]


def custom_events(page: Page) -> list[str]:
    return [c["payload"]["event"] for c in calls(page) if c["event"] == "custom_event"]


def reset_calls(page: Page) -> None:
    page.evaluate("window.__trackCalls = []")


def wait_for_calls(page: Page, count: int, timeout: int = 8000) -> None:
    page.wait_for_function(
        "expected => (window.__trackCalls || []).length >= expected",
        arg=count,
        timeout=timeout,
    )


@contextmanager
def session(
    browser: Browser,
    base_url: str,
    path: str = "/",
    stub: str = SATELLITE_STUB,
    viewport: dict[str, int] | None = None,
    reduced_motion: str | None = None,
) -> Iterator[tuple[Page, list[str], list[str]]]:
    """Contesto isolato: niente localStorage condiviso tra le prove."""
    context = browser.new_context(
        viewport=viewport or {"width": 1280, "height": 900},
        # Va dichiarato: il browser senza interfaccia risponde "reduce" per
        # default, e con quella preferenza lo sfoglio salta l'animazione. Senza
        # questo le prove sul movimento della pagina passerebbero a vuoto.
        reduced_motion=reduced_motion or "no-preference",
    )
    console_errors: list[str] = []
    failed_requests: list[str] = []

    def record_console(message: Any) -> None:
        # La libreria Adobe Launch non e' raggiungibile in prova: al suo posto
        # c'e' lo _satellite finto, quindi il 404 sul suo indirizzo e i messaggi
        # che ne derivano non riguardano l'applicazione.
        if message.type == "error" and "adobedtm" not in message.text:
            if message.text.startswith("Failed to load resource") and message.location:
                if "adobedtm" in (message.location.get("url") or ""):
                    return
            console_errors.append(message.text)

    page = context.new_page()
    page.add_init_script(stub)
    page.on("console", record_console)
    page.on("pageerror", lambda e: console_errors.append(f"pageerror: {e}"))
    page.on(
        "response",
        lambda r: failed_requests.append(f"{r.status} {r.url}")
        if r.status >= 400 and "adobedtm" not in r.url
        else None,
    )

    page.goto(base_url + path, wait_until="domcontentloaded")
    try:
        yield page, console_errors, failed_requests
    finally:
        context.close()


def unlock(page: Page, name: str = "Anna", key: str = ACCESS_KEY) -> None:
    page.fill('input[aria-label="Your name"]', name)
    page.fill('input[aria-label="Access key"]', key)
    page.click('button[aria-label="Enter"]')


INTRO_OVERLAY = "div.fixed.inset-0.z-50"


def skip_intro(page: Page) -> None:
    """
    Salta il video di introduzione con un clic, come fa un visitatore.

    Il menu e' montato sotto l'introduzione fin dall'inizio, quindi la sua
    presenza non dice nulla: il segnale attendibile e' la scomparsa dello strato
    dell'introduzione. Il clic vale solo dopo il passaggio allo stato video, per
    questo si ritenta.
    """
    size = page.viewport_size or {"width": 1280, "height": 900}
    center_x, center_y = size["width"] // 2, size["height"] // 2

    for _ in range(30):
        if page.locator(INTRO_OVERLAY).count() == 0:
            break
        page.mouse.click(center_x, center_y)
        page.wait_for_timeout(500)

    page.wait_for_selector(INTRO_OVERLAY, state="detached", timeout=20000)
    # Le voci del menu entrano con una dissolvenza scaglionata: si aspetta che
    # abbiano finito di muoversi, altrimenti il clic cade su un bersaglio mobile.
    page.wait_for_timeout(1500)


def open_menu_entry(page: Page, label: str) -> None:
    page.locator(f'nav button:has-text("{label}")').click()
    page.wait_for_timeout(700)


# --------------------------------------------------------------------------- #
# prove
# --------------------------------------------------------------------------- #


def test_login_page(browser: Browser, base_url: str) -> None:
    print("\n1. Schermata di accesso")
    with session(browser, base_url) as (page, console_errors, failed):
        wait_for_calls(page, 1)
        page.wait_for_timeout(400)

        views = page_views(page)
        check_equal("un solo page_view all'ingresso", len(views), 1)
        check_equal("page_name", views[0].get("page_name"), "V:gowns:login")
        check_equal("page_type", views[0].get("page_type"), "landing")
        check_equal("page_language", views[0].get("page_language"), "en")
        check(
            "nessun campo prodotto sulla pagina di accesso",
            "product_name" not in views[0] and "product_id" not in views[0],
            str(views[0]),
        )
        check_equal("nessun evento di interazione", custom_events(page), [])

        script = page.evaluate(
            """() => {
                 const s = document.querySelector('head script[src*="assets.adobedtm.com"]');
                 return s ? { src: s.src, async: s.async, inHead: s.parentElement.tagName } : null;
               }"""
        )
        check("libreria Launch presente nella head", script is not None, str(script))
        if script:
            check_equal("tag con async", script["async"], True)
            check_equal("genitore del tag", script["inHead"], "HEAD")
            check(
                "build di produzione nell'export",
                "launch-e9ba9503dd03.min.js" in script["src"],
                script["src"],
            )

        check_equal("nessun errore in console", console_errors, [])
        check_equal("nessuna risorsa mancante", failed, [])


def test_login_queue(browser: Browser, base_url: str) -> None:
    print("\n2. Libreria che arriva in ritardo")
    with session(browser, base_url, stub=SATELLITE_STUB_LATE) as (page, _, _f):
        wait_for_calls(page, 1, timeout=10000)
        views = page_views(page)
        check_equal("il page_view in coda viene recapitato", len(views), 1)
        check_equal("page_name conservato", views[0].get("page_name"), "V:gowns:login")


def test_login_events(browser: Browser, base_url: str) -> None:
    print("\n3. Eventi di accesso")
    with session(browser, base_url) as (page, _, _f):
        wait_for_calls(page, 1)
        reset_calls(page)

        # Nome mancante: e' un controllo che precede l'invio della chiave.
        page.fill('input[aria-label="Access key"]', ACCESS_KEY)
        page.click('button[aria-label="Enter"]')
        page.wait_for_timeout(400)
        check_equal("nome mancante non genera eventi", calls(page), [])

        # Chiave errata.
        page.fill('input[aria-label="Your name"]', "Anna")
        page.fill('input[aria-label="Access key"]', "chiave-sbagliata")
        page.click('button[aria-label="Enter"]')
        page.wait_for_timeout(400)
        check_equal("chiave errata", custom_events(page), ["gowns_login_ko"])

        reset_calls(page)

        # Chiave corretta, con doppio invio ravvicinato.
        page.fill('input[aria-label="Access key"]', ACCESS_KEY)
        page.click('button[aria-label="Enter"]')
        page.click('button[aria-label="Enter"]')
        page.wait_for_timeout(400)
        check_equal("chiave corretta, un solo evento", custom_events(page), ["gowns_login"])


def test_welcome_and_book(browser: Browser, base_url: str) -> None:
    print("\n4. Welcome, Gowns Book e sfoglio")
    with session(browser, base_url) as (page, console_errors, failed):
        wait_for_calls(page, 1)
        unlock(page)
        skip_intro(page)

        views = page_views(page)
        check_equal("page_view del menu", views[-1].get("page_name"), "V:gowns:welcome")
        check_equal("page_type del menu", views[-1].get("page_type"), "welcome")
        check_equal("page_view emessi finora", len(views), 2)

        reset_calls(page)
        open_menu_entry(page, "GOWNS BOOK")
        wait_for_calls(page, 1)

        first = page_views(page)[0]
        check(
            "scheda nel ramo del Gowns Book",
            first.get("page_name", "").startswith("V:gowns:gowns book:"),
            first.get("page_name", ""),
        )
        check_equal("page_type della scheda", first.get("page_type"), "gowns detail")
        check(
            "product_name coerente con page_name",
            first.get("page_name") == f"V:gowns:gowns book:{first.get('product_name')}",
            f"{first.get('page_name')} / {first.get('product_name')}",
        )
        check(
            "product_id valorizzato",
            bool(first.get("product_id")) and first["product_id"].isalnum(),
            str(first.get("product_id")),
        )
        check(
            "product_name normalizzato",
            first.get("product_name", "") == first.get("product_name", "").lower()
            and " " not in first.get("product_name", ""),
            str(first.get("product_name")),
        )

        # Sfoglio avanti con il pulsante, osservando ogni fotogramma del giro.
        reset_calls(page)
        page.evaluate(SAMPLER)
        page.click('button[aria-label="Prodotto successivo"]')
        page.wait_for_timeout(300)

        leaf = page.evaluate(
            """() => {
                 const el = document.querySelector('.flip-leaf');
                 if (!el) return null;
                 const style = getComputedStyle(el);
                 const shade = el.querySelector('.flip-shade');
                 const stage = document.querySelector('.flip-stage');
                 return {
                   transform: style.transform,
                   origin: style.transformOrigin,
                   width: Math.round(el.getBoundingClientRect().width),
                   stageWidth: Math.round(stage.getBoundingClientRect().width),
                   shadeOpacity: shade ? Number(getComputedStyle(shade).opacity) : null,
                   stagePerspective: getComputedStyle(stage).perspective,
                   stageOverflow: getComputedStyle(stage).overflow,
                 };
               }"""
        )
        check("pagina in rotazione presente a meta' giro", leaf is not None, str(leaf))
        if leaf:
            check(
                "trasformazione tridimensionale in corso",
                leaf["transform"].startswith("matrix3d"),
                leaf["transform"],
            )
            check(
                "cerniera sul bordo interno sinistro",
                leaf["origin"].startswith("0px"),
                leaf["origin"],
            )
            check(
                "la pagina si scorcia ruotando",
                leaf["width"] < leaf["stageWidth"],
                f"{leaf['width']} su {leaf['stageWidth']}",
            )
            check(
                "ombra proporzionale al giro",
                leaf["shadeOpacity"] is not None and 0 < leaf["shadeOpacity"] <= 1,
                str(leaf["shadeOpacity"]),
            )
            check(
                "prospettiva impostata sul palco",
                leaf["stagePerspective"] not in (None, "none"),
                str(leaf["stagePerspective"]),
            )
            check_equal("nulla sborda dal palco", leaf["stageOverflow"], "hidden")

        check_equal("nessun page_view a meta' giro", page_views(page), [])
        wait_for_calls(page, 1, timeout=5000)
        page.wait_for_timeout(500)

        samples = page.evaluate("window.__sampling = false; window.__samples")
        check(
            "il giro si svolge su molti fotogrammi",
            len(samples) > 12,
            f"{len(samples)} fotogrammi",
        )
        crowded = [s for s in samples if len([p for p in s if p["o"] > 0.01 and p["w"] > 4]) > 1]
        check_equal(
            "in nessun fotogramma si vedono due pagine insieme",
            len(crowded),
            0,
        )
        check(
            "la rotazione passa per posizioni intermedie",
            any(0 < p["w"] < p["stage"] for s in samples for p in s),
            "",
        )
        check_equal(
            "a giro concluso nessuna pagina resta sospesa",
            page.locator(".flip-leaf").count(),
            0,
        )

        second_views = page_views(page)
        check_equal("un solo page_view per pagina girata", len(second_views), 1)
        check(
            "la pagina girata porta a un'altra creazione",
            second_views[0].get("product_id") != first.get("product_id"),
            f"{first.get('product_id')} -> {second_views[0].get('product_id')}",
        )
        second = second_views[0]

        # Sfoglio indietro.
        reset_calls(page)
        page.click('button[aria-label="Prodotto precedente"]')
        wait_for_calls(page, 1, timeout=5000)
        page.wait_for_timeout(500)
        back_views = page_views(page)
        check_equal("un solo page_view tornando indietro", len(back_views), 1)
        check_equal(
            "si torna sulla creazione di partenza",
            back_views[0].get("product_id"),
            first.get("product_id"),
        )

        # Tastiera.
        reset_calls(page)
        page.keyboard.press("ArrowRight")
        wait_for_calls(page, 1, timeout=5000)
        page.wait_for_timeout(500)
        key_views = page_views(page)
        check_equal("freccia destra: un solo page_view", len(key_views), 1)
        check_equal(
            "freccia destra porta alla creazione successiva",
            key_views[0].get("product_id"),
            second.get("product_id"),
        )

        # Sfoglio ripetuto: nessuna perdita e nessun doppione.
        reset_calls(page)
        for _ in range(4):
            page.click('button[aria-label="Prodotto successivo"]')
            page.wait_for_timeout(950)
        page.wait_for_timeout(400)
        streak = page_views(page)
        check_equal("quattro pagine girate, quattro page_view", len(streak), 4)
        check_equal(
            "nessun page_view ripetuto",
            len({v["product_id"] for v in streak}),
            4,
        )

        check_equal("nessun errore in console", console_errors, [])
        check_equal("nessuna risorsa mancante", failed, [])


def test_favourites(browser: Browser, base_url: str) -> None:
    print("\n5. Preferiti")
    with session(browser, base_url) as (page, console_errors, failed):
        wait_for_calls(page, 1)
        unlock(page)
        skip_intro(page)
        open_menu_entry(page, "GOWNS BOOK")
        wait_for_calls(page, 1)

        toggle = page.locator('button[aria-label="Aggiungi alla selezione"]')
        toggle.scroll_into_view_if_needed()
        reset_calls(page)
        toggle.click()
        page.wait_for_timeout(300)
        check_equal("aggiunta ai preferiti", custom_events(page), ["gowns_favourite_add"])

        reset_calls(page)
        page.locator('button[aria-label="Rimuovi dalla selezione"]').click()
        page.wait_for_timeout(300)
        check_equal("rimozione dai preferiti", custom_events(page), ["gowns_favourite_remove"])

        # Si riaggiunge per poter provare la schermata dei preferiti.
        page.locator('button[aria-label="Aggiungi alla selezione"]').click()
        page.wait_for_timeout(300)

        reset_calls(page)
        page.click('header button[aria-label="Wishlist"]')
        wait_for_calls(page, 1)
        page.wait_for_timeout(300)
        wishlist_views = page_views(page)
        check_equal("un solo page_view dei preferiti", len(wishlist_views), 1)
        check_equal(
            "page_name dei preferiti",
            wishlist_views[0].get("page_name"),
            "V:gowns:favourite:listing page",
        )
        check_equal("page_type dei preferiti", wishlist_views[0].get("page_type"), "favourite")

        # La schermata non ha un comando di condivisione, come nel progetto
        # originale: si verifica che non ne sia comparso uno.
        check_equal(
            "nessun comando di condivisione aggiunto",
            page.locator('button[aria-label="Share your selection"]').count(),
            0,
        )

        reset_calls(page)
        page.click('button[aria-label="Rimuovi"]')
        page.wait_for_timeout(300)
        check_equal(
            "rimozione dalla scheda dei preferiti",
            custom_events(page),
            ["gowns_favourite_remove"],
        )

        check_equal("nessun errore in console", console_errors, [])
        check_equal("nessuna risorsa mancante", failed, [])


def test_closet_and_savoir_faire(browser: Browser, base_url: str) -> None:
    print("\n6. Gowns Closet e Savoir-Faire")
    with session(browser, base_url) as (page, console_errors, failed):
        wait_for_calls(page, 1)
        unlock(page)
        skip_intro(page)

        reset_calls(page)
        open_menu_entry(page, "GOWNS CLOSET")
        wait_for_calls(page, 1)
        closet = page_views(page)
        check_equal("un solo page_view della griglia", len(closet), 1)
        check_equal(
            "page_name della griglia",
            closet[0].get("page_name"),
            "V:gowns:gowns closet:listing page",
        )
        check_equal("page_type della griglia", closet[0].get("page_type"), "gowns closet")

        reset_calls(page)
        page.locator("div.grid button").nth(2).click()
        wait_for_calls(page, 1)
        page.wait_for_timeout(400)
        detail = page_views(page)
        check_equal("un solo page_view della scheda", len(detail), 1)
        check(
            "scheda nel ramo del Gowns Closet",
            detail[0].get("page_name", "").startswith("V:gowns:gowns closet:"),
            detail[0].get("page_name", ""),
        )
        check_equal("page_type della scheda", detail[0].get("page_type"), "gowns detail")
        check(
            "scheda con dati prodotto",
            bool(detail[0].get("product_name")) and bool(detail[0].get("product_id")),
            str(detail[0]),
        )

        # Ritorno con il tasto indietro del browser.
        reset_calls(page)
        page.go_back()
        wait_for_calls(page, 1)
        page.wait_for_timeout(400)
        back = page_views(page)
        check_equal("indietro: un solo page_view", len(back), 1)
        check_equal(
            "indietro riporta alla griglia",
            back[0].get("page_name"),
            "V:gowns:gowns closet:listing page",
        )

        reset_calls(page)
        page.click('header button[aria-label="Menu"]')
        page.wait_for_timeout(500)
        open_menu_entry(page, "SAVOIR-FAIRE")
        wait_for_calls(page, 2)
        page.wait_for_timeout(400)
        sf = page_views(page)
        check_equal("menu e poi Savoir-Faire", len(sf), 2)
        check_equal("ritorno al menu tracciato", sf[0].get("page_name"), "V:gowns:welcome")
        check_equal(
            "page_name di Savoir-Faire",
            sf[1].get("page_name"),
            "V:gowns:savoire-faire:listing page",
        )
        check_equal("page_type di Savoir-Faire", sf[1].get("page_type"), "savoire-faire")

        check_equal("nessun errore in console", console_errors, [])
        check_equal("nessuna risorsa mancante", failed, [])


def test_shared_selection(browser: Browser, base_url: str) -> None:
    print("\n7. Selezione condivisa")
    skus = "8BMVDN402UPCVR,8B0VDNG01EDMNQ"
    with session(browser, base_url, path=f"/?selection={skus}") as (page, console_errors, failed):
        wait_for_calls(page, 1)
        page.wait_for_timeout(600)
        views = page_views(page)
        check_equal("un solo page_view", len(views), 1)
        check_equal(
            "page_name della selezione condivisa",
            views[0].get("page_name"),
            "V:gowns:favourite:shared page",
        )
        check_equal("page_type", views[0].get("page_type"), "favourite")
        check(
            "nessun page_view di accesso attribuito per errore",
            all(v.get("page_name") != "V:gowns:login" for v in views),
            str([v.get("page_name") for v in views]),
        )
        check_equal("due creazioni mostrate", page.locator("div.space-y-2 > div").count(), 2)
        check_equal("nessun errore in console", console_errors, [])
        check_equal("nessuna risorsa mancante", failed, [])


def test_reload(browser: Browser, base_url: str) -> None:
    print("\n8. Ricaricamento della pagina")
    with session(browser, base_url) as (page, _, _f):
        wait_for_calls(page, 1)
        page.wait_for_timeout(400)
        check_equal("prima apertura", len(page_views(page)), 1)

        page.reload(wait_until="domcontentloaded")
        wait_for_calls(page, 1)
        page.wait_for_timeout(400)
        views = page_views(page)
        check_equal("dopo il ricaricamento un solo page_view", len(views), 1)
        check_equal("si riparte dall'accesso", views[0].get("page_name"), "V:gowns:login")


def test_reduced_motion(browser: Browser, base_url: str) -> None:
    print("\n9. Animazioni ridotte")
    with session(browser, base_url, reduced_motion="reduce") as (page, console_errors, failed):
        wait_for_calls(page, 1)
        unlock(page)
        skip_intro(page)
        open_menu_entry(page, "GOWNS BOOK")
        wait_for_calls(page, 1)
        first = page_views(page)[-1]

        reset_calls(page)
        page.click('button[aria-label="Prodotto successivo"]')
        page.wait_for_timeout(400)
        views = page_views(page)
        check_equal("cambio pagina immediato, un solo page_view", len(views), 1)
        check(
            "la creazione cambia comunque",
            views[0].get("product_id") != first.get("product_id"),
            f"{first.get('product_id')} -> {views[0].get('product_id')}",
        )
        check_equal(
            "nessuna pagina in rotazione a schermo",
            page.locator(".flip-leaf").count(),
            0,
        )
        check_equal("nessun errore in console", console_errors, [])
        check_equal("nessuna risorsa mancante", failed, [])


def test_mobile_drag(browser: Browser, base_url: str) -> None:
    print("\n10. Trascinamento su mobile")
    with session(
        browser, base_url, viewport={"width": 390, "height": 844}
    ) as (page, console_errors, failed):
        wait_for_calls(page, 1)
        unlock(page)
        skip_intro(page)
        open_menu_entry(page, "GOWNS BOOK")
        wait_for_calls(page, 1)
        first = page_views(page)[-1]

        reset_calls(page)
        # Trascinamento verticale: deve restare uno scorrimento, non uno sfoglio.
        page.mouse.move(195, 500)
        page.mouse.down()
        for y in range(480, 300, -30):
            page.mouse.move(195, y)
        page.mouse.up()
        page.wait_for_timeout(700)
        check_equal("il gesto verticale non sfoglia", page_views(page), [])

        # Trascinamento orizzontale oltre la soglia: la pagina gira.
        reset_calls(page)
        page.mouse.move(340, 420)
        page.mouse.down()
        for x in range(320, 40, -28):
            page.mouse.move(x, 420)
        page.mouse.up()
        wait_for_calls(page, 1, timeout=5000)
        page.wait_for_timeout(500)
        dragged = page_views(page)
        check_equal("il trascinamento gira una sola pagina", len(dragged), 1)
        check(
            "porta alla creazione successiva",
            dragged[0].get("product_id") != first.get("product_id"),
            f"{first.get('product_id')} -> {dragged[0].get('product_id')}",
        )

        # Trascinamento breve: la pagina torna al suo posto, niente eventi.
        reset_calls(page)
        page.mouse.move(340, 420)
        page.mouse.down()
        page.mouse.move(300, 420)
        page.mouse.move(280, 420)
        page.mouse.up()
        page.wait_for_timeout(900)
        check_equal("trascinamento annullato: nessun evento", page_views(page), [])

        # Gesto con il dito: il puntatore di prova di Playwright e' sempre un
        # mouse, quindi gli eventi di tocco si producono direttamente.
        reset_calls(page)
        page.evaluate(
            """async () => {
                 const stage = document.querySelector('.flip-stage');
                 const send = (type, x) => stage.dispatchEvent(new PointerEvent(type, {
                   bubbles: true, cancelable: true, composed: true,
                   pointerId: 7, pointerType: 'touch', isPrimary: true,
                   clientX: x, clientY: 420, button: 0, buttons: type === 'pointerup' ? 0 : 1,
                 }));
                 const wait = (ms) => new Promise(r => setTimeout(r, ms));
                 send('pointerdown', 340);
                 for (let x = 320; x >= 60; x -= 26) { send('pointermove', x); await wait(16); }
                 send('pointerup', 60);
               }"""
        )
        wait_for_calls(page, 1, timeout=5000)
        page.wait_for_timeout(500)
        touch_views = page_views(page)
        check_equal("gesto con il dito: una sola pagina girata", len(touch_views), 1)
        check(
            "il contenuto resta leggibile dopo il gesto",
            page.evaluate(
                """() => {
                     const panel = document.querySelector('.flip-stage .flip-face > div');
                     if (!panel) return false;
                     const style = getComputedStyle(panel);
                     return Number(style.opacity) === 1 && style.visibility === 'visible';
                   }"""
            ),
            "",
        )
        check_equal(
            "nessuna pagina resta a mezz'aria",
            page.locator(".flip-leaf").count(),
            0,
        )

        check_equal("nessun errore in console", console_errors, [])
        check_equal("nessuna risorsa mancante", failed, [])


def probe(base_url: str, path: str) -> int:
    """Chiede un percorso come farebbe un hosting statico puro, senza browser."""
    try:
        with urllib.request.urlopen(base_url + path, timeout=15) as response:
            return int(response.status)
    except urllib.error.HTTPError as error:
        return int(error.code)


def test_cookie_policy(browser: Browser, base_url: str) -> None:
    """
    L'informativa deve restare raggiungibile su un hosting statico puro.

    L'export produce file piatti: un indirizzo senza estensione non viene
    risolto da un bucket S3, quindi il collegamento deve puntare al file. Qui si
    verifica sia che il percorso risponda, sia che il comportamento resti quello
    di prima: apertura in una nuova scheda, senza toccare la schermata di
    partenza.
    """
    print("\n11. Cookie Policy su hosting statico")

    exported = (OUT_DIR / "index.html").read_text(encoding="utf-8")
    links = set(re.findall(r'href="(/cookie-policy[^"]*)"', exported))
    check_equal("un solo indirizzo per l'informativa", len(links), 1)

    target = links.pop() if links else ""
    check_equal("collegamento al file esportato", target, "/cookie-policy.html")
    check_equal("il percorso risponde", probe(base_url, target), 200)
    check_equal("la pagina di partenza risponde", probe(base_url, "/"), 200)
    check(
        "nessun indirizzo senza estensione, che un bucket non risolverebbe",
        probe(base_url, "/cookie-policy") == 404 and "/cookie-policy\"" not in exported,
        "",
    )

    with session(browser, base_url) as (page, console_errors, failed):
        wait_for_calls(page, 1)

        # Sulla schermata di accesso i collegamenti sono due: quello del menu,
        # montato sotto fin dall'inizio, e quello dell'introduzione che gli sta
        # sopra. Va usato il secondo, che e' quello che il visitatore tocca.
        link = page.locator(f'{INTRO_OVERLAY} a:has-text("Cookie Policy")')
        check_equal("collegamento raggiungibile dalla prima schermata", link.count(), 1)

        topmost = page.evaluate(
            """() => {
                 const overlay = document.querySelector('div.fixed.inset-0.z-50');
                 const link = overlay && [...overlay.querySelectorAll('a')]
                   .find((a) => a.textContent.trim() === 'Cookie Policy');
                 if (!link) return null;
                 const box = link.getBoundingClientRect();
                 const hit = document.elementFromPoint(
                   box.left + box.width / 2,
                   box.top + box.height / 2
                 );
                 return hit === link;
               }"""
        )
        check("nulla si sovrappone al collegamento", topmost is True, str(topmost))

        check_equal(
            "si apre in una nuova scheda",
            link.get_attribute("target"),
            "_blank",
        )
        check_equal(
            "nuova scheda isolata",
            link.get_attribute("rel"),
            "noopener noreferrer",
        )

        with page.context.expect_page() as opened:
            link.click()
        policy = opened.value
        policy.wait_for_load_state("domcontentloaded")

        check(
            "la nuova scheda mostra l'informativa",
            policy.locator('h1:has-text("Cookie policy")').count() == 1,
            policy.url,
        )
        check(
            "il testo approvato e' quello",
            "Valentino S.p.A." in policy.content()
            and "privacy@valentino.com" in policy.content(),
            "",
        )
        policy.close()

        # La schermata di partenza non deve essere stata disturbata: sulla
        # pagina di accesso il contenitore sottostante intercetta il clic per
        # saltare il video di introduzione.
        page.wait_for_timeout(400)
        check_equal(
            "la schermata di accesso resta dov'era",
            len(page_views(page)),
            1,
        )
        check_equal("nessun errore in console", console_errors, [])
        check_equal("nessuna risorsa mancante", failed, [])


def test_assets(browser: Browser, base_url: str) -> None:
    print("\n12. Asset e tipografia")
    with session(browser, base_url) as (page, console_errors, failed):
        wait_for_calls(page, 1)
        unlock(page)
        skip_intro(page)

        fonts = page.evaluate(
            """async () => {
                 await document.fonts.ready;
                 return document.fonts.check("500 16px 'DIN Pro'");
               }"""
        )
        check("carattere DIN Pro disponibile", bool(fonts), str(fonts))

        background = page.evaluate(
            """() => {
                 const img = document.querySelector('img[src="/images/Test_BG_Menu.jpg"]');
                 return img ? { complete: img.complete, w: img.naturalWidth } : null;
               }"""
        )
        check(
            "immagine di sfondo del menu caricata",
            bool(background and background["complete"] and background["w"] > 0),
            str(background),
        )

        open_menu_entry(page, "GOWNS BOOK")
        page.wait_for_timeout(1200)
        broken = page.evaluate(
            """() => [...document.images]
                 .filter(i => i.complete && i.naturalWidth === 0)
                 .map(i => i.currentSrc || i.src)"""
        )
        check_equal("nessuna immagine rotta nella scheda", broken, [])

        check_equal("nessun errore in console", console_errors, [])
        check_equal("nessuna risorsa mancante", failed, [])


def main() -> int:
    if not (OUT_DIR / "index.html").exists():
        print(f"Manca {OUT_DIR}. Esegui prima: npm run build")
        return 2

    suites: list[Callable[[Browser, str], None]] = [
        test_login_page,
        test_login_queue,
        test_login_events,
        test_welcome_and_book,
        test_favourites,
        test_closet_and_savoir_faire,
        test_shared_selection,
        test_reload,
        test_reduced_motion,
        test_mobile_drag,
        test_cookie_policy,
        test_assets,
    ]

    with static_server(OUT_DIR) as base_url:
        print(f"Sito statico servito su {base_url}")
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            try:
                for suite in suites:
                    suite(browser, base_url)
            finally:
                browser.close()

    passed = sum(1 for _, ok, _ in results if ok)
    failed = [(name, detail) for name, ok, detail in results if not ok]

    print("\n" + "=" * 70)
    print(f"controlli superati: {passed}/{len(results)}")
    if failed:
        print("\ncontrolli falliti:")
        for name, detail in failed:
            print(f"  - {name}" + (f": {detail}" if detail else ""))
    print(json.dumps({"passed": passed, "total": len(results)}))
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
