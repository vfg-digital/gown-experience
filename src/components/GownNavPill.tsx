"use client";

import React from "react";

interface GownNavPillProps {
  onPrev: () => void;
  onNext: () => void;
  /** Indice della creazione mostrata, a partire da zero. */
  currentIndex: number;
  total: number;
  /** Al primo ingresso si mostra l'invito, poi il contatore. */
  showHint: boolean;
  /** Segnalano al pannello di anticipare il sollevamento dell'angolo. */
  onForwardHoverChange?: (hovering: boolean) => void;
  onBackHoverChange?: (hovering: boolean) => void;
}

/**
 * Comandi di navigazione tra le creazioni: pillola galleggiante in basso al
 * centro con freccia indietro, invito o contatore, freccia avanti.
 */
export default function GownNavPill({
  onPrev,
  onNext,
  currentIndex,
  total,
  showHint,
  onForwardHoverChange,
  onBackHoverChange,
}: GownNavPillProps) {
  const atStart = currentIndex === 0;
  const atEnd = currentIndex === total - 1;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
      <div className="flex items-center gap-4 bg-white/80 backdrop-blur-sm rounded-full px-5 py-2.5 shadow-sm">
        {/* Left arrow */}
        <button
          onClick={onPrev}
          disabled={atStart}
          onMouseEnter={() => onBackHoverChange?.(true)}
          onMouseLeave={() => onBackHoverChange?.(false)}
          onBlur={() => onBackHoverChange?.(false)}
          className={`w-8 h-8 flex items-center justify-center transition-opacity ${
            atStart ? "opacity-20" : "opacity-60 hover:opacity-100"
          }`}
          aria-label="Prodotto precedente"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="1.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* "Turn the pages" or counter */}
        {showHint ? (
          <p className="font-sans text-[9px] uppercase tracking-[0.15em] text-black/50 text-center">
            Turn the pages
          </p>
        ) : (
          <p className="font-sans text-[10px] text-black/50 text-center tabular-nums">
            {currentIndex + 1}/{total}
          </p>
        )}

        {/* Right arrow */}
        <button
          onClick={onNext}
          disabled={atEnd}
          onMouseEnter={() => onForwardHoverChange?.(true)}
          onMouseLeave={() => onForwardHoverChange?.(false)}
          onBlur={() => onForwardHoverChange?.(false)}
          className={`w-8 h-8 flex items-center justify-center transition-opacity ${
            atEnd ? "opacity-20" : "opacity-60 hover:opacity-100"
          }`}
          aria-label="Prodotto successivo"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="1.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
