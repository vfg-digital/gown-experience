"use client";

import { useEffect, useRef } from "react";
import type { PageViewData } from "@/analytics/pages";
import { trackPageView } from "@/analytics/track";

/**
 * Invia un page_view a ogni cambio di pagina, una volta sola.
 *
 * Il sito e' una singola pagina con navigazione interna: senza un cambio di
 * URL non c'e' nulla che segnali ad Adobe Launch il passaggio da una schermata
 * all'altra, quindi il page_view va emesso a mano. Il confronto e' sul
 * contenuto del data layer, non sull'identita' dell'oggetto: cosi' un
 * rerender non produce un doppione, mentre tornare su una schermata gia'
 * visitata produce correttamente un nuovo page_view.
 *
 * Passare null sospende l'invio: serve nei momenti in cui la schermata non e'
 * ancora decisa (per esempio finche' non si sa se la sessione arriva da un
 * link di selezione condivisa) e per gli stati che non sono pagine del
 * manuale, come il video di introduzione.
 */
export function usePageView(page: PageViewData | null): void {
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!page) return;

    const signature = JSON.stringify(page);
    if (lastSent.current === signature) return;

    lastSent.current = signature;
    trackPageView(page);
  }, [page]);
}
