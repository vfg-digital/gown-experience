"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface WishlistContextType {
  wishlist: string[]; // Array of SKUs
  toggleWishlist: (sku: string) => void;
  isInWishlist: (sku: string) => boolean;
  removeFromWishlist: (sku: string) => void;
  clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

// Chiave propria del progetto: due esperienze servite dallo stesso host non
// devono condividere la selezione dell'utente.
const STORAGE_KEY = "gowns-de-reve-wishlist";

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setWishlist(parsed.slice(0, 50)); // Max 50 items
        }
      }
    } catch {
      // If localStorage fails, start with empty wishlist
    }
    setIsHydrated(true);
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlist));
      } catch {
        // Silent fail for localStorage
      }
    }
  }, [wishlist, isHydrated]);

  const toggleWishlist = useCallback((sku: string) => {
    setWishlist((prev) => {
      if (prev.includes(sku)) {
        return prev.filter((s) => s !== sku);
      }
      if (prev.length >= 50) return prev;
      return [...prev, sku];
    });
  }, []);

  const isInWishlist = useCallback(
    (sku: string) => wishlist.includes(sku),
    [wishlist]
  );

  const removeFromWishlist = useCallback((sku: string) => {
    setWishlist((prev) => prev.filter((s) => s !== sku));
  }, []);

  const clearWishlist = useCallback(() => {
    setWishlist([]);
  }, []);

  return (
    <WishlistContext.Provider
      value={{ wishlist, toggleWishlist, isInWishlist, removeFromWishlist, clearWishlist }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
