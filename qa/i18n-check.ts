/**
 * Verifica che il testo prodotto per il frontend sia interamente in inglese.
 *
 * Applica toDisplayDescription e toDisplayColor a tutte le creazioni del
 * catalogo e controlla che non resti nessun termine italiano fra quelli noti.
 * Da rieseguire se cambiano i dati o le regole di traduzione.
 */
import { products } from "../src/data/products";
import { toDisplayColor, toDisplayDescription } from "../src/data/translations";

/** Termini italiani che non devono sopravvivere alla traduzione. */
const ITALIAN_TOKENS = [
  // descrizioni
  "abito", "abtio", "lunro", "lungo", "ricamato", "ricamata", "con", "piume",
  "pizzo", "velluto", "illusione", "motivo", "floreale", "pois", "medio",
  // colori
  "nero", "avorio", "betulla", "oro", "fume", "lilla", "edera", "rafia",
  "rugiada", "pesca", "rosso", "blu", "ocre", "lavanda", "salmone",
  "azzurro", "fuxia",
  // colori del catalogo ampliato (il francese aube/noisette resta invariato)
  "burro", "malva", "polvere", "tortora", "vaniglia",
];

let failures = 0;
const fail = (message: string) => {
  failures += 1;
  console.log("  FALLITO: " + message);
};

function residualItalian(text: string): string[] {
  const lower = text.toLowerCase();
  return ITALIAN_TOKENS.filter((token) =>
    new RegExp(`\\b${token}\\b`).test(lower)
  );
}

const descriptions = new Set<string>();
const colors = new Set<string>();

for (const product of products) {
  const description = toDisplayDescription(product.description);
  const color = toDisplayColor(product.colorDesc);
  descriptions.add(description);
  colors.add(color);

  if (!description) fail(`${product.sku}: descrizione vuota`);
  if (description.charAt(0) !== description.charAt(0).toUpperCase()) {
    fail(`${product.sku}: descrizione senza iniziale maiuscola -> ${description}`);
  }
  const descIt = residualItalian(description);
  if (descIt.length) fail(`${product.sku}: italiano nella descrizione ${JSON.stringify(descIt)} -> ${description}`);

  if (!color) fail(`${product.sku}: colore vuoto`);
  const colorIt = residualItalian(color);
  if (colorIt.length) fail(`${product.sku}: italiano nel colore ${JSON.stringify(colorIt)} -> ${color}`);
}

console.log(`prodotti analizzati    : ${products.length}`);
console.log(`descrizioni distinte   : ${descriptions.size}`);
console.log(`colori distinti        : ${colors.size}`);

console.log("\n=== colori tradotti (display) ===");
for (const color of [...colors].sort()) console.log(`  ${color}`);

console.log("");
console.log(failures === 0 ? "ESITO: frontend interamente in inglese" : `ESITO: ${failures} controlli falliti`);
process.exit(failures === 0 ? 0 : 1);
