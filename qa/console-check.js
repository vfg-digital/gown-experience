/*
 * Verifica del tracking dalla console del browser.
 *
 * Da usare quando la libreria Adobe Launch non e' raggiungibile e si vuole
 * comunque controllare che il sito emetta le chiamate giuste. Prende il posto
 * di _satellite e registra tutto, senza bisogno di ricostruire il sito.
 *
 * NON fa parte del sito: non e' importato da nessun modulo, non finisce nel
 * pacchetto pubblicato e non compare in out/. Vive solo nella scheda del
 * browser in cui lo si incolla, e sparisce al ricaricamento della pagina.
 * Il sito e' gia' pronto a ricevere la libreria vera: cerca window._satellite
 * a ogni chiamata e tiene in coda quelle emesse prima del suo arrivo, quindi il
 * giorno in cui Launch sara' pubblicato non c'e' nulla da modificare.
 *
 * Uso:
 *   1. apri il sito e subito dopo la console del browser;
 *   2. incolla tutto questo blocco e premi invio, entro trenta secondi dal
 *      caricamento: le chiamate emesse prima restano in coda e vengono
 *      recapitate allo stub appena compare;
 *   3. percorri il sito;
 *   4. chiama analyticsReport() per il riepilogo.
 *
 * Se la libreria vera risulta attiva, lo stub si rifiuta di installarsi.
 */
(() => {
  // Se la libreria vera e' presente, non si tocca niente: sostituirla
  // impedirebbe la raccolta e si finirebbe per collaudare il finto al posto
  // della catena reale. Da quel momento vale il metodo del manuale.
  if (typeof window._satellite?.track === "function" && !window.analyticsCalls) {
    console.warn(
      "%c[verifica] Adobe Launch e' attivo: lo stub NON viene installato.\n" +
        "Usa il metodo del manuale: pannello Sources, punto di interruzione su " +
        "_satellite.track.\nSe vuoi comunque sostituirlo, esegui prima " +
        "delete window._satellite e reincolla.",
      "color:#a94442;font-weight:bold"
    );
    return;
  }

  const calls = [];

  window._satellite = {
    track(eventName, payload) {
      calls.push({ eventName, payload, at: new Date() });
      const label = payload?.page_name ?? payload?.event ?? "";
      console.log(
        `%c${eventName}%c ${label}`,
        "color:#8a6d3b;font-weight:bold",
        "color:inherit",
        payload
      );
    },
  };

  window.analyticsCalls = calls;

  /** Riepilogo in tabella di tutto quello che e' stato emesso. */
  window.analyticsReport = () => {
    if (calls.length === 0) {
      console.warn("nessuna chiamata registrata");
      return;
    }

    console.table(
      calls.map((call, index) => ({
        "#": index + 1,
        tipo: call.eventName,
        page_name: call.payload?.page_name ?? "",
        page_type: call.payload?.page_type ?? "",
        evento: call.payload?.event ?? "",
        product_name: call.payload?.product_name ?? "",
        product_id: call.payload?.product_id ?? "",
        lingua: call.payload?.page_language ?? "",
      }))
    );

    // Doppioni: due chiamate identiche di seguito sono quasi sempre un errore.
    const duplicates = calls.filter((call, index) => {
      const previous = calls[index - 1];
      return (
        previous &&
        previous.eventName === call.eventName &&
        JSON.stringify(previous.payload) === JSON.stringify(call.payload)
      );
    });

    if (duplicates.length > 0) {
      console.warn("chiamate ripetute di seguito:", duplicates);
    } else {
      console.log("%cnessun doppione consecutivo", "color:#3c763d");
    }

    // Valori che il manuale non ammette.
    const invalid = [];
    for (const call of calls) {
      for (const [key, value] of Object.entries(call.payload ?? {})) {
        if (value === undefined || value === null || value === "") {
          invalid.push({ tipo: call.eventName, campo: key, valore: String(value) });
        } else if (typeof value === "string" && /[A-Z]/.test(value) && key !== "page_name" && key !== "product_id") {
          invalid.push({ tipo: call.eventName, campo: key, valore: value });
        }
      }
    }

    if (invalid.length > 0) {
      console.warn("valori da controllare:", invalid);
    } else {
      console.log("%cnessun valore vuoto o incoerente", "color:#3c763d");
    }

    return calls;
  };

  /** Stato dell'inclusione della libreria, indipendente dallo stub. */
  window.analyticsLibrary = () => {
    const tag = document.querySelector('head script[src*="assets.adobedtm.com"]');
    console.table([
      {
        "tag nella head": Boolean(tag),
        async: tag ? tag.async : null,
        libreria: tag ? tag.src.split("/").pop() : null,
      },
    ]);
    return tag?.src ?? null;
  };

  console.log(
    "%c[verifica] _satellite sostituito. Percorri il sito, poi analyticsReport()",
    "color:#31708f;font-weight:bold"
  );
})();
