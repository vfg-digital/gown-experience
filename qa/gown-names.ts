/**
 * Verifica temporanea del glossario e della normalizzazione su tutto il
 * catalogo. Non fa parte dell'applicazione: si compila ed esegue a mano.
 */
import { products } from "../src/data/products";
// Import relativo diretto alla fonte di traduzione: glossary.ts usa l'alias
// "@/" che tsc in CommonJS non riscrive nel JS emesso. La funzione e' la stessa
// che glossary espone all'analytics.
import { translateDescriptionToEnglish } from "../src/data/translations";
import { normalizeValue, normalizeIdentifier } from "../src/analytics/normalize";

/** Caratteri vietati dal capitolo 1.1 del manuale. */
const FORBIDDEN = ["'", '"', "\n", "\r", "\t", ":", ",", "&", "<", ">"];

/** Termini italiani che non devono sopravvivere alla traduzione. */
const ITALIAN_TOKENS = new Set([
  "abito",
  "abtio",
  "lunro",
  "lungo",
  "ricamato",
  "ricamata",
  "piume",
  "con",
  "pizzo",
  "velluto",
  "illusione",
  "motivo",
  "floreale",
  "pois",
  "medio",
]);

let failures = 0;
const fail = (message: string) => {
  failures += 1;
  console.log("  FALLITO: " + message);
};

const names = new Map<string, string[]>();

for (const product of products) {
  const gownName = normalizeValue(translateDescriptionToEnglish(product.description));
  const productId = normalizeIdentifier(product.sku);

  if (!gownName) fail(`${product.sku}: nome vuoto`);
  if (gownName !== gownName.toLowerCase()) fail(`${product.sku}: non minuscolo -> ${gownName}`);
  // eslint-disable-next-line no-control-regex
  if (/[^\x20-\x7e]/.test(gownName)) fail(`${product.sku}: carattere non ASCII -> ${gownName}`);
  if (/\s/.test(gownName)) fail(`${product.sku}: spazio residuo -> ${gownName}`);

  for (const character of FORBIDDEN) {
    if (gownName.includes(character)) {
      fail(`${product.sku}: carattere vietato ${JSON.stringify(character)} -> ${gownName}`);
    }
  }

  for (const token of gownName.split("_")) {
    if (ITALIAN_TOKENS.has(token)) {
      fail(`${product.sku}: termine italiano residuo "${token}" -> ${gownName}`);
    }
  }

  if (!productId) fail(`${product.sku}: product_id vuoto`);
  if (productId !== product.sku) {
    fail(`${product.sku}: product_id alterato -> ${productId}`);
  }

  const bucket = names.get(gownName) ?? [];
  bucket.push(product.description);
  names.set(gownName, bucket);
}

console.log(`prodotti analizzati        : ${products.length}`);
console.log(`descrizioni distinte       : ${new Set(products.map((p) => p.description)).size}`);
console.log(`nomi normalizzati distinti : ${names.size}`);
console.log("");
console.log("=== nomi generati (nome -> descrizioni di origine) ===");

for (const name of [...names.keys()].sort()) {
  const sources = [...new Set(names.get(name) ?? [])];
  console.log(`  ${name}`);
  for (const source of sources) console.log(`      < ${source}`);
}

console.log("");
console.log(failures === 0 ? "ESITO: tutti i controlli superati" : `ESITO: ${failures} controlli falliti`);
process.exit(failures === 0 ? 0 : 1);
