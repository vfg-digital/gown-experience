"use client";

import React, { useEffect, useRef } from "react";
import { Product, getThumbnailPath } from "@/data/products";
import { toDisplayColor, toDisplayDescription } from "@/data/translations";
import CookieFooter from "@/components/CookieFooter";

interface GridViewProps {
  products: Product[];
  onSelectProduct: (productIndex: number) => void;
  highlightSku?: string;
}

export default function GridView({ products, onSelectProduct, highlightSku }: GridViewProps) {
  // L'array e' gia' ordinato come il Closet (packshot ecommerce, dettagli
  // pre-shooting, abbinamenti gown+cappa, resto): Book e Closet condividono la
  // stessa sequenza, quindi qui si usa direttamente l'ordine dell'array.
  const sortedProducts = products;

  // Scroll to highlighted product when returning from immersive
  const highlightRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (highlightSku && highlightRef.current) {
      highlightRef.current.scrollIntoView({ block: "center", behavior: "instant" });
    }
  }, [highlightSku]);

  return (
    <div className="min-h-screen bg-white pt-16 pb-4">
      {/* Editorial title */}
      <div className="px-6 py-10 text-center">
        <h1 className="font-serif text-xl md:text-2xl text-black font-normal leading-relaxed mb-3">
          From our Atelier, to you.
        </h1>
        <p className="font-serif text-base md:text-lg text-black italic leading-relaxed">
          Explore each creation and save your favorites along the way.
        </p>
      </div>

      {/* Grid */}
      <div className="px-[2px] md:px-[2px]">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px]">
          {sortedProducts.map((product) => {
            const originalIndex = products.indexOf(product);

            return (
              <button
                key={product.sku}
                ref={product.sku === highlightSku ? highlightRef : undefined}
                onClick={() => onSelectProduct(originalIndex)}
                className="relative aspect-[2/3] overflow-hidden group cursor-pointer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getThumbnailPath(product)}
                  alt={`${toDisplayDescription(product.description)} ${toDisplayColor(product.colorDesc)}`}
                  // Immagine mostrata all'inquadratura originale (nessuno zoom);
                  // resta solo il leggero hover del progetto originale.
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  loading="lazy"
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* px-6 per allinearsi al blocco di testo editoriale in cima */}
      <CookieFooter className="px-6" />
    </div>
  );
}

