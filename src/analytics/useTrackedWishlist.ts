"use client";

import { useCallback } from "react";
import { CUSTOM_EVENTS } from "@/analytics/events";
import { trackCustomEvent } from "@/analytics/track";
import { useWishlist } from "@/context/WishlistContext";

/**
 * Preferiti con il tracking degli eventi previsti dal manuale.
 *
 * I componenti passano da qui invece di usare direttamente il contesto, cosi'
 * la presentazione non contiene chiamate ad Adobe Launch e l'evento viene
 * emesso una volta sola, nello stesso punto in cui la selezione cambia
 * davvero.
 *
 * Nota sul limite: il contesto rifiuta silenziosamente l'aggiunta oltre 50
 * creazioni. In quel caso l'evento non parte, perche' non c'e' stata alcuna
 * aggiunta da riportare.
 */
export function useTrackedWishlist() {
  const {
    wishlist,
    toggleWishlist,
    isInWishlist,
    removeFromWishlist,
    clearWishlist,
  } = useWishlist();

  const toggleFavourite = useCallback(
    (sku: string) => {
      const wasSelected = isInWishlist(sku);

      if (!wasSelected && wishlist.length >= 50) return;

      toggleWishlist(sku);
      trackCustomEvent(
        wasSelected ? CUSTOM_EVENTS.favouriteRemove : CUSTOM_EVENTS.favouriteAdd
      );
    },
    [isInWishlist, toggleWishlist, wishlist.length]
  );

  const removeFavourite = useCallback(
    (sku: string) => {
      if (!isInWishlist(sku)) return;

      removeFromWishlist(sku);
      trackCustomEvent(CUSTOM_EVENTS.favouriteRemove);
    },
    [isInWishlist, removeFromWishlist]
  );

  return {
    wishlist,
    isInWishlist,
    toggleFavourite,
    removeFavourite,
    clearWishlist,
  };
}
