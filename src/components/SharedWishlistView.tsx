"use client";

import React from "react";
import { products, getAllImagePaths } from "@/data/products";
import { toDisplayColor, toDisplayDescription } from "@/data/translations";
import CookieFooter from "@/components/CookieFooter";

interface SharedWishlistViewProps {
  skus: string[];
}

export default function SharedWishlistView({ skus }: SharedWishlistViewProps) {
  const wishlistProducts = skus
    .map((sku) => products.find((p) => p.sku === sku))
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-white pt-20 pb-10 px-4 md:px-8">
      {/* Logo */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center h-14 bg-white/90 backdrop-blur-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-valentino.svg" alt="Valentino" className="h-5 md:h-7 w-auto" />
      </div>

      <div className="max-w-3xl mx-auto">
        {/* Title */}
        <h1 className="font-serif text-2xl md:text-3xl text-center mb-10 leading-tight">
          Shared selection of creations
        </h1>

        {/* Items */}
        <div className="space-y-2">
          {wishlistProducts.map((product) => {
            if (!product) return null;
            const firstImage = getAllImagePaths(product)[0];
            return (
              <div
                key={product.sku}
                className="flex gap-3 bg-white p-2 shadow-sm rounded-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={firstImage}
                  alt={`${toDisplayDescription(product.description)} ${toDisplayColor(product.colorDesc)}`}
                  className="w-20 h-28 md:w-24 md:h-32 object-cover flex-none"
                />

                <div className="flex flex-col justify-center flex-1 min-w-0">
                  <h3 className="font-serif text-sm md:text-base leading-tight">
                    {toDisplayDescription(product.description)}
                  </h3>
                  <p className="font-sans text-[11px] text-black/50 mt-0.5">
                    Color {toDisplayColor(product.colorDesc)}
                  </p>
                  <p className="font-sans text-[10px] text-black/35 mt-1 font-mono">
                    {product.sku}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dentro il contenitore centrato, cosi si allinea al bordo sinistro
            delle schede anche su schermi larghi. */}
        <CookieFooter />
      </div>
    </div>
  );
}

