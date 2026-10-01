"use client";

import React, { useState, useEffect, useRef } from "react";
import { useWishlist } from "@/context/WishlistContext";

interface HeaderProps {
  onGoToMenu: () => void;
  onGoToWishlist: () => void;
  onGoHome: () => void;
  /**
   * Se presente, a sinistra si mostra la freccia "back" (che chiama onBack)
   * al posto del menu hamburger. Usata in Savoir-Faire, Gowns Closet e PDP.
   */
  onBack?: () => void;
  scrollContainer?: React.RefObject<HTMLDivElement | null>;
}

// Colore/peso delle icone a tratto dell'header (freccia back e hamburger).
const ICON_STROKE = "#000000";
const ICON_STROKE_WIDTH = "1.4";

export default function Header({
  onGoToMenu,
  onGoToWishlist,
  onGoHome,
  onBack,
  scrollContainer,
}: HeaderProps) {
  const { wishlist } = useWishlist();
  const hasItems = wishlist.length > 0;
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Scroll-aware: hide on scroll down, show on scroll up (window scroll)
  useEffect(() => {
    // Riallinea il riferimento alla posizione corrente al mount, altrimenti
    // un valore stantio puo far partire l'header nascosto.
    lastScrollY.current = window.scrollY;
    setVisible(true);

    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastScrollY.current && currentY > 60) {
        setVisible(false);
      } else if (currentY < lastScrollY.current) {
        setVisible(true);
      }
      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 h-14 bg-white/90 backdrop-blur-sm transition-transform duration-300 ${
        visible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      {/* LEFT: freccia "back" (Savoir-Faire, Gowns Closet, PDP) oppure il menu
          hamburger dove non e' previsto il back (es. wishlist). */}
      {onBack ? (
        <button
          onClick={onBack}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Back"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={ICON_STROKE}
            strokeWidth={ICON_STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="11 18 5 12 11 6" />
          </svg>
        </button>
      ) : (
        <button
          onClick={onGoToMenu}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Menu"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={ICON_STROKE}
            strokeWidth={ICON_STROKE_WIDTH}
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}

      {/* Logo - CENTER (porta al menu principale). Logo Valentino Garavani su
          due righe (rapporto 3.44:1): h-9 su mobile mantiene la larghezza del
          vecchio logo, md:h-10 resta dentro l'header da 56px. "block" evita lo
          spazio della linea di base sotto l'immagine, cosi' resta centrato. */}
      <button onClick={onGoHome} className="absolute left-1/2 -translate-x-1/2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-valentino-garavani.png"
          alt="Valentino Garavani"
          width={1032}
          height={300}
          className="block h-9 md:h-10 w-auto"
        />
      </button>

      {/* RIGHT: stella wishlist, icona originale della Maison (stessi file SVG
          usati nella PDP). Piena quando ci sono preferiti, altrimenti contorno. */}
      <button
        onClick={onGoToWishlist}
        className="min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Wishlist"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={hasItems ? "/star-filled.svg" : "/star-outline.svg"}
          alt="Wishlist"
          className="w-[18px] h-[18px]"
        />
      </button>
    </header>
  );
}
