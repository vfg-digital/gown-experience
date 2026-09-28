"use client";

import React from "react";
import { useTrackedWishlist } from "@/analytics/useTrackedWishlist";
import { products, getAllImagePaths } from "@/data/products";
import { toDisplayColor, toDisplayDescription } from "@/data/translations";
import CookieFooter from "@/components/CookieFooter";

interface WishlistViewProps {
  onGoHome: () => void;
  onSelectProduct?: (productIndex: number) => void;
}

export default function WishlistView({ onGoHome, onSelectProduct }: WishlistViewProps) {
  const { wishlist, removeFavourite } = useTrackedWishlist();

  const wishlistProducts = wishlist
    .map((sku) => products.find((p) => p.sku === sku))
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-white pt-20 pb-10 px-4 md:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Title */}
        <h1 className="font-serif text-2xl md:text-3xl text-center mb-10 leading-tight">
          Your Exclusive Selection
        </h1>

        {/* Empty state */}
        {wishlistProducts.length === 0 && (
          <div className="text-center py-20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/star-outline.svg"
              alt=""
              className="w-10 h-10 mx-auto mb-6 opacity-25"
            />
            <p className="font-serif text-lg text-black/40 mb-8">
              No creations selected yet
            </p>
          </div>
        )}

        {/* Wishlist items */}
        {wishlistProducts.length > 0 && (
          <div className="space-y-2">
            {wishlistProducts.map((product) => {
              if (!product) return null;
              // First image of the carousel (preshooting-0 if available, else ecommerce-0)
              const firstImage = getAllImagePaths(product)[0];
              return (
                <div
                  key={product.sku}
                  className="flex gap-3 bg-white p-2 relative shadow-sm rounded-sm cursor-pointer"
                  onClick={() => {
                    const idx = products.findIndex((p) => p.sku === product.sku);
                    if (idx >= 0 && onSelectProduct) onSelectProduct(idx);
                  }}
                >
                  {/* Thumbnail - first carousel image */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={firstImage}
                    alt={`${toDisplayDescription(product.description)} ${toDisplayColor(product.colorDesc)}`}
                    className="w-20 h-28 md:w-24 md:h-32 object-cover flex-none"
                  />

                  {/* Info */}
                  <div className="flex flex-col justify-center flex-1 min-w-0 pr-6">
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

                  {/* Remove X button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFavourite(product.sku); }}
                    className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-black/30 hover:text-black transition-colors"
                    aria-label="Rimuovi"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Dentro il contenitore centrato, cosi si allinea al bordo sinistro
            delle schede anche su schermi larghi. */}
        <CookieFooter />
      </div>
    </div>
  );
}

