"use client";

import React, { useCallback } from "react";
import { Product, getAllImagePaths } from "@/data/products";
import { toDisplayColor, toDisplayDescription } from "@/data/translations";
import { useTrackedWishlist } from "@/analytics/useTrackedWishlist";
import CookieFooter from "@/components/CookieFooter";

/**
 * Riferimento al contenitore scorrevole della galleria.
 *
 * Sono ammesse entrambe le forme: l'oggetto, per chi deve leggere o impostare
 * lo scorrimento in un secondo momento, e la funzione, che lo sfoglio usa per
 * riportare la pagina in movimento nella posizione in cui l'utente la stava
 * guardando nell'istante in cui compare.
 */
export type GownPanelScrollRef =
  | React.MutableRefObject<HTMLDivElement | null>
  | ((element: HTMLDivElement | null) => void);

interface GownPanelProps {
  product: Product;
  scrollRef?: GownPanelScrollRef;
  /**
   * Carica subito le prime immagini. Vero per il pannello che l'utente sta
   * guardando, falso per quello che serve solo durante una transizione.
   */
  eager?: boolean;
  className?: string;
  onScroll?: React.UIEventHandler<HTMLDivElement>;
}

/**
 * Una creazione: galleria verticale delle sue immagini e, in fondo, la scheda
 * con titolo, taglie, selezione tra i preferiti e riferimento al Client
 * Advisor.
 *
 * Vive separato dalla navigazione perche' lo usano due schermate diverse: la
 * scheda raggiunta dal Gowns Closet, che cambia creazione con una dissolvenza,
 * e il Gowns Book, che la cambia sfogliando la pagina.
 */
export default function GownPanel({
  product,
  scrollRef,
  eager = true,
  className = "",
  onScroll,
}: GownPanelProps) {
  const { toggleFavourite, isInWishlist } = useTrackedWishlist();
  const inWishlist = isInWishlist(product.sku);
  const allImages = getAllImagePaths(product);
  const title = toDisplayDescription(product.description);
  const color = toDisplayColor(product.colorDesc);

  const attachScrollElement = useCallback(
    (element: HTMLDivElement | null) => {
      if (!scrollRef) return;
      if (typeof scrollRef === "function") {
        scrollRef(element);
        return;
      }
      scrollRef.current = element;
    },
    [scrollRef]
  );

  return (
    <div
      ref={attachScrollElement}
      onScroll={onScroll}
      className={`w-full h-full overflow-y-auto scrollbar-none ${className}`}
    >
      {/* Product images - vertical flow */}
      {allImages.map((imagePath, index) => {
        const isDetail = imagePath === product.detailImage;
        const isFirst = index === 0;

        return (
          <div
            key={`${product.sku}-${imagePath}`}
            className={`w-full relative ${isFirst ? "pt-[56px]" : ""} ${
              isDetail
                ? "md:flex md:justify-center"
                : "h-[100dvh] md:h-auto md:flex md:justify-center md:py-4"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePath}
              alt={`${title} ${color} - ${index + 1}`}
              // Senza questo, premere su un'immagine e muovere avvia il
              // trascinamento nativo del browser, che annulla il gesto del
              // puntatore e con esso lo sfoglio della pagina.
              draggable={false}
              className={`block ${
                isDetail
                  ? "w-full h-auto md:w-auto md:max-w-[500px]"
                  : "h-full w-full object-cover md:h-auto md:w-auto md:max-w-[500px]"
              }`}
              loading={eager && index <= 1 ? "eager" : "lazy"}
            />
          </div>
        );
      })}

      {/* Product info section at the bottom */}
      <div className="w-full py-14 px-6 md:px-12 bg-butter">
        <div className="max-w-lg mx-auto md:text-center">
          {/* Product title */}
          <h2 className="font-serif text-2xl md:text-4xl leading-tight mb-4">
            {title}, color {color}
          </h2>

          {/* Product code */}
          <p className="font-sans text-[11px] text-black/60 mb-8">
            {product.sku}
          </p>

          {/* Wishlist toggle */}
          <button
            onClick={() => toggleFavourite(product.sku)}
            className="flex items-center gap-2 mb-10 min-h-[44px] md:justify-center"
            aria-label={inWishlist ? "Rimuovi dalla selezione" : "Aggiungi alla selezione"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={inWishlist ? "/star-filled.svg" : "/star-outline.svg"}
              alt=""
              className="w-[12px] h-[12px] -mt-[3px]"
            />
            <span className="font-sans text-[11px] uppercase tracking-[0.15em] text-black/60">
              {inWishlist ? "Treasured" : "Treasure this creation"}
            </span>
          </button>

          {/* Contact text */}
          <p className="font-sans text-[11px] text-black/50 leading-relaxed text-left">
            Contact your Client Advisor for further details and to arrange your private appointment in boutique.
          </p>

          <CookieFooter />
        </div>
      </div>
    </div>
  );
}
