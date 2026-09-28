/**
 * API pubblica del tracking. I componenti chiamano solo queste due funzioni,
 * cosi' la logica di presentazione non conosce ne' Adobe Launch ne' la forma
 * del data layer.
 */

import type { CustomEventName } from "@/analytics/events";
import type { PageViewData } from "@/analytics/pages";
import { satelliteTrack } from "@/analytics/satellite";

/**
 * Rimuove i campi non valorizzati prima dell'invio.
 *
 * Il manuale vieta valori incoerenti: meglio omettere un campo opzionale che
 * inviare undefined, null o stringa vuota. I campi obbligatori (page_name,
 * page_type, page_language) sono garantiti dai costruttori in pages.ts.
 */
function compact(data: PageViewData): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
}

export function trackPageView(data: PageViewData): void {
  satelliteTrack("page_view", compact(data));
}

export function trackCustomEvent(event: CustomEventName): void {
  satelliteTrack("custom_event", { event });
}
