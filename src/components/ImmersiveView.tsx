"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { Product } from "@/data/products";
import GownNavPill from "@/components/GownNavPill";
import GownPanel from "@/components/GownPanel";

interface ImmersiveViewProps {
  products: Product[];
  initialProductIndex?: number;
  scrollRef?: React.MutableRefObject<HTMLDivElement | null>;
  /** Notifica quale creazione e' a schermo, per il tracking della scheda. */
  onProductChange?: (index: number) => void;
}

/**
 * Scheda della creazione raggiunta dal Gowns Closet.
 *
 * Cambia creazione con una dissolvenza breve, come nel progetto originale. Lo
 * sfoglio della pagina appartiene al Gowns Book, che ha un componente suo.
 */
export default function ImmersiveView({
  products,
  initialProductIndex = 0,
  scrollRef,
  onProductChange,
}: ImmersiveViewProps) {
  const internalRef = useRef<HTMLDivElement | null>(null);
  const containerRef = scrollRef || internalRef;
  const [currentProductIndex, setCurrentProductIndex] = useState(initialProductIndex);
  const [fading, setFading] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [showPill, setShowPill] = useState(true);

  const currentProduct = products[currentProductIndex];

  // Segnala la creazione a schermo a chi si occupa del tracking.
  useEffect(() => {
    onProductChange?.(currentProductIndex);
  }, [currentProductIndex, onProductChange]);

  // Navigate to product with simple fade
  const goToProduct = useCallback(
    (index: number) => {
      if (index < 0 || index >= products.length) return;

      setFading(true);
      setShowHint(false);
      setTimeout(() => {
        setCurrentProductIndex(index);
        if (containerRef.current) {
          containerRef.current.scrollTo({ top: 0, behavior: "instant" });
        }
        // Wait for images to render before showing
        setTimeout(() => setFading(false), 400);
      }, 200);
    },
    [products.length, containerRef]
  );

  const goNext = useCallback(() => goToProduct(currentProductIndex + 1), [currentProductIndex, goToProduct]);
  const goPrev = useCallback(() => goToProduct(currentProductIndex - 1), [currentProductIndex, goToProduct]);

  // Keyboard navigation (desktop)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

  // Hide pill when scrolled to bottom (info section)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const nearBottom = scrollTop + clientHeight >= scrollHeight - 100;
      setShowPill(!nearBottom);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [containerRef, currentProductIndex]);

  // Swipe detection (mobile) - horizontal only
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const diffX = Math.abs(e.touches[0].clientX - touchStartX.current);
    const diffY = Math.abs(e.touches[0].clientY - touchStartY.current);
    if (diffX > 30 && diffX > diffY * 1.5) {
      isSwiping.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isSwiping.current) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 60) {
      if (diff > 0) goNext();
      else goPrev();
    }
    isSwiping.current = false;
  };

  if (!currentProduct) return null;

  return (
    <div
      className="relative w-full h-[100dvh] bg-white"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <GownPanel
        key={`gallery-${currentProduct.sku}-${currentProductIndex}`}
        product={currentProduct}
        scrollRef={containerRef}
        className={`transition-opacity duration-200 ${fading ? "opacity-0" : "opacity-100"}`}
      />

      {showPill && (
        <GownNavPill
          onPrev={goPrev}
          onNext={goNext}
          currentIndex={currentProductIndex}
          total={products.length}
          showHint={showHint}
        />
      )}
    </div>
  );
}
