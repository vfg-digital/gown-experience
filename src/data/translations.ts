/**
 * Traduzione in inglese dei dati prodotto (descrizioni e colori), che nel
 * catalogo sono in italiano.
 *
 * Serve a due scopi con la stessa fonte di verita':
 * - il frontend, che deve mostrare tutto in inglese (vedi toDisplay*);
 * - il data layer analytics, che per il manuale valorizza ogni campo in
 *   inglese (analytics/glossary.ts riusa translateDescriptionToEnglish).
 *
 * Le descrizioni seguono uno schema chiuso e ripetitivo, quindi la traduzione
 * si ottiene con un elenco finito di sostituzioni, deterministico e
 * verificabile. I nomi propri della Maison (tessuti, stampe, collezioni) e i
 * termini gia' internazionali restano invariati.
 */

/**
 * Regole di traduzione delle descrizioni, dalla piu' specifica alla piu'
 * generica. L'ordine conta: "motivo pois allover" va risolto prima di "motivo
 * floreale" e di qualsiasi regola su "pois".
 */
const DESCRIPTION_RULES: ReadonlyArray<readonly [RegExp, string]> = [
  // "Abito lungo" e le sue due varianti con errore di battitura presenti nel
  // catalogo ("Abito lunro", "Abtio lungo"). Gli errori si correggono qui, nel
  // valore tradotto: il testo del catalogo originale resta quello che e'.
  [/\babito lungo\b/gi, "long gown"],
  [/\babito lunro\b/gi, "long gown"],
  [/\babtio lungo\b/gi, "long gown"],

  [/\bvelluto\s+sable'?/gi, "sable velvet"],
  [/\btulle illusione\b/gi, "illusion tulle"],

  [/\bmotivo pois allover\b/gi, "allover polka dot motif"],
  [/\bmotivo papier floral\b/gi, "papier floral motif"],
  [/\bmotivo floreale\b/gi, "floral motif"],
  [/\bmicro pois\b/gi, "micro polka dot"],
  [/\bpois medio\b/gi, "medium polka dot"],

  [/\bcon piume\b/gi, "with feathers"],
  [/\bricamato\b/gi, "embroidered"],
  [/\bpizzo\b/gi, "lace"],
];

/**
 * Frasi di colore multi-parola, da risolvere prima dei singoli termini:
 * "azzurro polvere" e' "powder blue", non "blue powder".
 */
const COLOR_PHRASES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bazzurro\s+polvere\b/gi, "powder blue"],
];

/**
 * Termini di colore italiani e francesi. Le parole gia' inglesi (rose, silver,
 * gold, green, mauve, champagne...) non compaiono qui: restano intatte. I
 * termini internazionali del settore (strass, sable) e i nomi propri (lilium,
 * paris) non si traducono.
 *
 * Niente confine di parola in coda dove segue un apostrofo (fume', sable'):
 * l'apostrofo non e' un carattere di parola e un \b non potrebbe combaciare.
 */
const COLOR_TERMS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bnero\b/gi, "black"],
  [/\bavorio\b/gi, "ivory"],
  [/\bbetulla\b/gi, "birch"],
  [/\boro\b/gi, "gold"],
  [/\bfume'?/gi, "smoke"],
  [/\blilla\b/gi, "lilac"],
  [/\blilas\b/gi, "lilac"],
  [/\bedera\b/gi, "ivy"],
  [/\brafia\b/gi, "raffia"],
  [/\brugiada\b/gi, "dew"],
  [/\bpesca\b/gi, "peach"],
  [/\brosso\b/gi, "red"],
  [/\bblu\b/gi, "blue"],
  [/\bocre\b/gi, "ochre"],
  [/\blavanda\b/gi, "lavender"],
  [/\bsalmone\b/gi, "salmon"],
  // Colori italiani introdotti dal catalogo ampliato. Il francese (aube,
  // noisette) resta invariato per scelta.
  [/\bburro\b/gi, "butter"],
  [/\bmalva\b/gi, "mauve"],
  [/\bpolvere\b/gi, "powder"],
  [/\btortora\b/gi, "taupe"],
  [/\bvaniglia\b/gi, "vanilla"],
  [/\bpoudre\b/gi, "powder"],
  [/\bazzurro\b/gi, "light blue"],
  [/\bfuxia\b/gi, "fuchsia"],
  [/\bsable'?/gi, "sable"],
];

function applyRules(
  value: string,
  rules: ReadonlyArray<readonly [RegExp, string]>
): string {
  return rules.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

/**
 * Traduce una descrizione prodotto in inglese, senza normalizzarla e senza
 * cambiarne il caso. La normalizzazione per il data layer resta a chi la usa
 * (analytics/normalize.ts), cosi' le responsabilita' restano separate.
 */
export function translateDescriptionToEnglish(description: string): string {
  return applyRules(description, DESCRIPTION_RULES);
}

/**
 * Traduce un colore in inglese preservandone la struttura (separatori `/`,
 * `+`, spazi) e sostituendo solo i termini non inglesi.
 */
export function translateColorToEnglish(color: string): string {
  return applyRules(applyRules(color, COLOR_PHRASES), COLOR_TERMS);
}

/** Mette in maiuscolo solo la prima lettera, lasciando intatto il resto. */
function capitalizeFirst(value: string): string {
  return value.length === 0 ? value : value.charAt(0).toUpperCase() + value.slice(1);
}

/** Descrizione pronta per il display: inglese, con l'iniziale maiuscola. */
export function toDisplayDescription(description: string): string {
  return capitalizeFirst(translateDescriptionToEnglish(description));
}

/** Colore pronto per il display: inglese, con l'iniziale maiuscola. */
export function toDisplayColor(color: string): string {
  return capitalizeFirst(translateColorToEnglish(color));
}
