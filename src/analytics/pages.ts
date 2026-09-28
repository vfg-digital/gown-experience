/**
 * Definizione delle pagine tracciate, secondo il capitolo 4 del manuale.
 *
 * page_name usa il prefisso "V:gowns" e i due punti come separatore di
 * livello: e' l'unica deroga ammessa al divieto sui due punti. I segmenti
 * fissi conservano gli spazi letterali come li scrive il manuale
 * ("gowns book:listing page"); i segmenti dinamici passano da normalizeValue.
 */

import type { Product } from "@/data/products";
import { translateGownDescription } from "@/analytics/glossary";
import {
  normalizeFixedSegment,
  normalizeIdentifier,
  normalizeValue,
  resolvePageLanguage,
} from "@/analytics/normalize";

const PAGE_NAME_ROOT = "V:gowns";

export type PageType =
  | "landing"
  | "welcome"
  | "gowns book"
  | "gowns closet"
  | "gowns detail"
  | "savoire-faire"
  | "favourite";

/**
 * Struttura del data layer inviato con page_view. Le chiavi sono quelle del
 * manuale: non vanno rinominate ne' arricchite con campi non previsti.
 */
export interface PageViewData {
  page_name: string;
  page_type: PageType;
  page_language: string;
  product_name?: string;
  product_id?: string;
}

function buildPageName(...segments: string[]): string {
  return [PAGE_NAME_ROOT, ...segments].join(":");
}

/** Segmenti fissi, presi alla lettera dal manuale. */
const SEGMENT = {
  login: normalizeFixedSegment("login"),
  welcome: normalizeFixedSegment("welcome"),
  gownsBook: normalizeFixedSegment("gowns book"),
  gownsCloset: normalizeFixedSegment("gowns closet"),
  savoirFaire: normalizeFixedSegment("savoire-faire"),
  favourite: normalizeFixedSegment("favourite"),
  listing: normalizeFixedSegment("listing page"),
  shared: normalizeFixedSegment("shared page"),
} as const;

export const PAGE_NAMES = {
  login: buildPageName(SEGMENT.login),
  welcome: buildPageName(SEGMENT.welcome),
  gownsBookListing: buildPageName(SEGMENT.gownsBook, SEGMENT.listing),
  gownsClosetListing: buildPageName(SEGMENT.gownsCloset, SEGMENT.listing),
  savoirFaireListing: buildPageName(SEGMENT.savoirFaire, SEGMENT.listing),
  favouriteListing: buildPageName(SEGMENT.favourite, SEGMENT.listing),
  favouriteShared: buildPageName(SEGMENT.favourite, SEGMENT.shared),
  gownsBookDetail: (gownName: string) => buildPageName(SEGMENT.gownsBook, gownName),
  gownsClosetDetail: (detailName: string) =>
    buildPageName(SEGMENT.gownsCloset, detailName),
  savoirFaireDetail: (pageTitle: string) =>
    buildPageName(SEGMENT.savoirFaire, pageTitle),
} as const;

/**
 * Nome della creazione, gia' tradotto e normalizzato.
 *
 * Il manuale usa lo stesso segnaposto [GOWN NAME] sia dentro page_name sia in
 * product_name, quindi i due campi devono portare lo stesso valore. Il colore
 * non entra: nel glossario e' un segnaposto a se' ([COLOR DESC]) e la scheda
 * prodotto identifica univocamente la creazione con product_id.
 */
export function resolveGownName(product: Product): string {
  return normalizeValue(translateGownDescription(product.description));
}

/**
 * Da dove si e' arrivati alla scheda della creazione. Determina il ramo di
 * page_name: il manuale prevede una scheda dentro il Gowns Book e una dentro
 * il Gowns Closet, con lo stesso page_type "gowns detail".
 */
export type DetailOrigin = "gowns-book" | "gowns-closet";

export function buildGownDetailPageView(
  product: Product,
  origin: DetailOrigin
): PageViewData {
  const gownName = resolveGownName(product);

  return {
    page_name:
      origin === "gowns-book"
        ? PAGE_NAMES.gownsBookDetail(gownName)
        : PAGE_NAMES.gownsClosetDetail(gownName),
    page_type: "gowns detail",
    page_language: resolvePageLanguage(),
    product_name: gownName,
    product_id: normalizeIdentifier(product.sku),
  };
}

export function buildPageView(
  page_name: string,
  page_type: PageType
): PageViewData {
  return {
    page_name,
    page_type,
    page_language: resolvePageLanguage(),
  };
}
