/**
 * Traduzione dei nomi prodotto per il data layer, in inglese come impone il
 * manuale (cap. 1.4).
 *
 * La logica di traduzione e' condivisa con il frontend e vive in
 * src/data/translations.ts: qui si espone solo la funzione usata da pages.ts,
 * per non duplicare le regole. La normalizzazione (minuscolo, underscore,
 * ASCII) resta a normalizeValue, cosi' le due responsabilita' restano separate
 * e testabili.
 */

import { translateDescriptionToEnglish } from "@/data/translations";

/** Traduce una descrizione prodotto in inglese, senza normalizzarla. */
export function translateGownDescription(description: string): string {
  return translateDescriptionToEnglish(description);
}
