/**
 * Normalizzazione dei valori del data layer secondo il capitolo 1 del manuale
 * Adobe Launch.
 *
 * Regole applicate:
 * - solo caratteri ASCII, quindi le lettere accentate vengono ridotte alla
 *   forma base (e' -> e) e cio' che resta fuori da ASCII viene scartato;
 * - vietati apice singolo, doppio apice, line feed, carriage return, tab,
 *   due punti, virgola, caratteri speciali HTML;
 * - stringhe in minuscolo con gli spazi sostituiti da underscore.
 *
 * I due punti restano ammessi solo come separatore di livello dentro
 * page_name, che per questo non passa da qui: si costruisce unendo segmenti
 * gia' normalizzati (vedi pages.ts).
 */

/** Caratteri che separano parole e che diventano un singolo underscore. */
const SEPARATORS = /[\s:,;/+&|._'"`~*=[\]{}()<>?!\\-]+/g;

/**
 * Riduce le lettere accentate alla loro forma base e scarta tutto il resto di
 * cio' che non e' ASCII stampabile.
 */
function toAscii(value: string): string {
  return value
    .normalize("NFD")
    // segni diacritici combinanti lasciati dalla decomposizione NFD
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, " ");
}

/**
 * Normalizza un valore testuale destinato al data layer.
 *
 * Restituisce stringa vuota se dopo la normalizzazione non resta nulla: chi
 * chiama deve decidere cosa fare, perche' il manuale vieta di inviare valori
 * incoerenti e un campo vuoto e' preferibile a un "undefined" testuale.
 */
export function normalizeValue(raw: string | null | undefined): string {
  if (!raw) return "";
  return toAscii(raw)
    .toLowerCase()
    .replace(SEPARATORS, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Normalizza un segmento fisso di page_name conservando gli spazi.
 *
 * Il manuale scrive i segmenti fissi con lo spazio letterale
 * ("gowns book:listing page"), in deroga alla regola generale sugli spazi.
 * Qui si ripulisce solo cio' che e' vietato, senza toccare la spaziatura.
 */
export function normalizeFixedSegment(raw: string): string {
  return toAscii(raw)
    .toLowerCase()
    .replace(/[:,'"`\t\r\n]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Ripulisce un identificativo tecnico conservandone le maiuscole.
 *
 * Vale per i codici prodotto: il manuale porta [SKU] come "WB0T31NVBS13" e
 * [ERROR DETAIL] come "INVALID_ARRAY_MAX_ITEMS", quindi gli identificativi
 * mantengono la forma originale mentre la regola sul minuscolo (cap. 1.2)
 * resta valida per i valori descrittivi. Un codice prodotto abbassato di caso
 * non si potrebbe piu' incrociare con il catalogo.
 */
export function normalizeIdentifier(raw: string | null | undefined): string {
  if (!raw) return "";
  return toAscii(raw)
    .replace(SEPARATORS, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Lingua della pagina. Il sito e' interamente in inglese e l'attributo lang
 * del documento e' l'unica fonte di verita' disponibile lato client.
 */
export function resolvePageLanguage(): string {
  if (typeof document === "undefined") return "en";
  const lang = document.documentElement.lang;
  const normalized = normalizeValue(lang);
  return normalized || "en";
}
