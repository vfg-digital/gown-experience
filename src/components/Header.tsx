"use client";

import React, { useState, useEffect, useRef } from "react";
import { useWishlist } from "@/context/WishlistContext";

interface HeaderProps {
  onGoToMenu: () => void;
  onGoToWishlist: () => void;
  onGoHome: () => void;
  scrollContainer?: React.RefObject<HTMLDivElement | null>;
}

export default function Header({
  onGoToMenu,
  onGoToWishlist,
  onGoHome,
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
      {/* Hamburger menu - LEFT */}
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
          stroke="#000000"
          strokeWidth="1.4"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Logo - CENTER */}
      <button onClick={onGoHome} className="absolute left-1/2 -translate-x-1/2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-valentino.svg"
          alt="Valentino"
          className="h-5 md:h-7 w-auto"
        />
      </button>

      {/* Wishlist star - RIGHT */}
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
