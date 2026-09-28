"""
Controlla se le librerie Adobe Launch del manuale sono pubblicate.

Da rieseguire ogni volta che BitBang dice di aver pubblicato: risponde con un
si' o un no verificabile, senza dover aprire il browser.

Include un test di controllo su una libreria Launch realmente pubblicata,
trovata caricando valentino.com con un browser: se il controllo risponde 200 e
le nostre no, la differenza non e' la rete ne' lo strumento, e l'oggetto
davvero non esiste a quell'indirizzo.

Uso:
    python qa/check-launch-library.py
"""

from __future__ import annotations

import socket
import ssl
import sys
import urllib.error
import urllib.request

from playwright.sync_api import sync_playwright

# Indirizzi del manuale, capitolo 2.1. Vanno tenuti allineati a
# src/analytics/config.ts.
LIBRARIES = {
    "development": (
        "https://assets.adobedtm.com/75d94c6e0d96/590762ece535/"
        "launch-90977567bd4f-development.min.js"
    ),
    "production": (
        "https://assets.adobedtm.com/75d94c6e0d96/590762ece535/"
        "launch-e9ba9503dd03.min.js"
    ),
}

# Sito da cui prelevare una libreria Launch pubblicata, per il controllo.
CONTROL_SITE = "https://www.valentino.com/"

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
)


def fetch(url: str) -> tuple[int, str, str]:
    """Restituisce stato, server e lunghezza dichiarata."""
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            headers = response.headers
            return int(response.status), headers.get("Server", "?"), headers.get("Content-Length", "?")
    except urllib.error.HTTPError as error:
        return int(error.code), error.headers.get("Server", "?"), error.headers.get("Content-Length", "?")


def describe_origin() -> None:
    """Mostra chi risponde, per escludere un proxy interposto."""
    host = "assets.adobedtm.com"
    try:
        infos = socket.getaddrinfo(host, 443, proto=socket.IPPROTO_TCP)
        for ip in sorted({info[4][0] for info in infos}):
            print(f"  {host} -> {ip}")
    except OSError as error:
        print(f"  DNS non risolto: {error}")

    try:
        context = ssl.create_default_context()
        with socket.create_connection((host, 443), timeout=20) as raw:
            with context.wrap_socket(raw, server_hostname=host) as tls:
                cert = tls.getpeercert() or {}
        subject = {k: v for part in cert.get("subject", ()) for k, v in part}
        issuer = {k: v for part in cert.get("issuer", ()) for k, v in part}
        print(f"  certificato: {subject.get('commonName')} emesso da {issuer.get('organizationName')}")
    except Exception as error:  # noqa: BLE001
        print(f"  TLS non verificabile: {error}")


def find_published_library() -> str | None:
    """Cattura una libreria Launch pubblicata caricando un sito che la usa."""
    seen: list[str] = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        context = browser.new_context(user_agent=UA)
        page = context.new_page()
        page.on(
            "response",
            lambda r: seen.append(r.url)
            if r.status == 200
            and "assets.adobedtm.com" in r.url
            and "/launch-" in r.url
            else None,
        )
        try:
            page.goto(CONTROL_SITE, wait_until="domcontentloaded", timeout=45000)
            page.wait_for_timeout(4000)
        except Exception:  # noqa: BLE001
            pass
        browser.close()
    return seen[0] if seen else None


def main() -> int:
    print("=== chi risponde su assets.adobedtm.com ===")
    describe_origin()

    print("\n=== librerie del manuale ===")
    results = {}
    for name, url in LIBRARIES.items():
        status, server, length = fetch(url)
        results[name] = status
        print(f"  {name:<12} HTTP {status}  server={server}  byte={length}")
        print(f"               {url}")

    print("\n=== controllo su una libreria pubblicata ===")
    control = find_published_library()
    if control is None:
        print("  nessuna libreria di controllo trovata: esito non concludente")
        return 2

    control_status, control_server, control_length = fetch(control)
    print(f"  HTTP {control_status}  server={control_server}  byte={control_length}")
    print(f"  {control}")

    print("\n=== conclusione ===")
    if control_status != 200:
        print("  anche il controllo fallisce: possibile blocco di rete, esito incerto.")
        return 2

    if all(status == 200 for status in results.values()):
        print("  entrambe le librerie del manuale sono pubblicate.")
        return 0

    missing = [name for name, status in results.items() if status != 200]
    print(f"  lo stesso metodo scarica una libreria Launch pubblicata, quindi il")
    print(f"  fallimento su {', '.join(missing)} non dipende dalla rete:")
    print(f"  l'oggetto non esiste a quell'indirizzo.")

    # L'account e' lo stesso: cambia solo il tratto della property.
    account = control.split("/")[3]
    if account == LIBRARIES["production"].split("/")[3]:
        print(f"\n  Nota: l'account Adobe e' lo stesso della libreria pubblicata")
        print(f"  ({account}). Cambia il tratto successivo, cioe' la property:")
        print(f"    pubblicata dal controllo : {control.split('/')[4]}")
        print(f"    attesa dal manuale       : {LIBRARIES['production'].split('/')[4]}")
        print(f"  La property del manuale non ha una library pubblicata.")

    return 1


if __name__ == "__main__":
    sys.exit(main())
