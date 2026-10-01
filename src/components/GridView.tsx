"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Product, getThumbnailPath } from "@/data/products";
import { toDisplayColor, toDisplayDescription } from "@/data/translations";
import CookieFooter from "@/components/CookieFooter";

interface GridViewProps {
  products: Product[];
  onSelectProduct: (productIndex: number) => void;
  highlightSku?: string;
  // Filtro taglie applicato, tenuto in page.tsx cosi' sopravvive al ritorno da
  // una scheda (GridView si smonta quando si apre una creazione).
  appliedSizes: string[];
  onApplySizes: (sizes: string[]) => void;
}

export default function GridView({
  products,
  onSelectProduct,
  highlightSku,
  appliedSizes,
  onApplySizes,
}: GridViewProps) {
  // --- Filtro taglie -------------------------------------------------------
  // Le taglie dei chip derivano dal catalogo (product.sizes gia' allineato al
  // foglio DB dell'Excel SOH), ordinate crescenti: compaiono solo le taglie
  // realmente esistenti. Nessun tracking associato al filtro: non e' un evento
  // previsto dalla spec Adobe Launch, e il page_view del Closet non cambia.
  const allSizes = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.sizes.forEach((s) => set.add(s)));
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [products]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  // Selezione temporanea nel drawer: Apply copia il draft nelle taglie applicate
  // (in page.tsx), Clear azzera solo il draft (come nel riferimento: per
  // rimuovere davvero il filtro si fa Clear e poi Apply).
  const [draftSizes, setDraftSizes] = useState<string[]>([]);

  const hasFilter = appliedSizes.length > 0;

  const visibleProducts = useMemo(() => {
    if (appliedSizes.length === 0) return products;
    return products.filter((p) => p.sizes.some((s) => appliedSizes.includes(s)));
  }, [products, appliedSizes]);

  const openDrawer = () => {
    setDraftSizes(appliedSizes);
    setDrawerOpen(true);
  };
  const closeDrawer = () => setDrawerOpen(false);
  const toggleDraftSize = (size: string) =>
    setDraftSizes((prev) => (prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]));
  const clearDraft = () => setDraftSizes([]);
  const applyDraft = () => {
    onApplySizes(draftSizes);
    setDrawerOpen(false);
  };

  // Blocca lo scroll di fondo e consente la chiusura con Esc mentre il drawer
  // e' aperto (come nel riferimento).
  useEffect(() => {
    if (!drawerOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen]);

  // Scroll to highlighted product when returning from immersive
  const highlightRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (highlightSku && highlightRef.current) {
      highlightRef.current.scrollIntoView({ block: "center", behavior: "instant" });
    }
  }, [highlightSku]);

  return (
    <div className="min-h-screen bg-white pt-16 pb-4">
      {/* Blocco editoriale: padding sinistro 40px (pl-10), interlinea titolo ->
          sottotitolo 4px (mb-1). "Filter by" sotto, a destra, con padding 20px
          (pr-5) come l'icona wishlist nell'header (px-5), sopra la griglia. */}
      <div className="pt-10 pb-6">
        <div className="pl-10 text-left">
          {/* leading-none sul titolo + mb-1, sottotitolo senza leading esplicito:
              stesse proprieta' del blocco titolo/sottotitolo del Savoir-Faire,
              cosi' la distanza tra i due e' identica. */}
          <h1 className="font-serif text-[24px] text-black font-normal leading-none mb-1">
            From our Atelier, to you.
          </h1>
          <p className="font-serif text-[20px] text-black italic">
            Explore each creation and save your favorites along the way.
          </p>
        </div>

        {/* "Filter by": Times New Roman corsivo, grigio; diventa nero e mostra
            il pallino quando c'e' un filtro applicato (dopo Apply).
            pr-[33px]: il bordo destro di "by" cade dove finisce la stella
            dell'header. La stella (18px) e' centrata in un bottone da 44px con
            gutter 20px (px-5), quindi il suo bordo destro e' a 20 + (44-18)/2 = 33px. */}
        <div className="mt-6 flex justify-end pr-[33px]">
          <button
            type="button"
            onClick={openDrawer}
            aria-haspopup="dialog"
            aria-expanded={drawerOpen}
            className={`relative font-serif italic text-[16px] tracking-[0.2px] transition-colors ${
              hasFilter ? "text-black" : "text-[#8a8a8a] hover:text-black"
            }`}
          >
            Filter by
            {hasFilter && (
              <span className="absolute top-[2px] -right-[9px] w-[5px] h-[5px] rounded-full bg-black" />
            )}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="px-[2px] md:px-[2px]">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px]">
          {visibleProducts.map((product) => {
            // Indice nell'array completo: la selezione, la navigazione nella
            // scheda e lo scroll di ritorno ragionano sull'intero catalogo,
            // quindi anche con il filtro attivo si passa l'indice originale.
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

        {/* Difensivo: con i chip derivati dal catalogo un filtro valido ha
            sempre almeno un risultato, ma manteniamo il messaggio come rete. */}
        {visibleProducts.length === 0 && (
          <p className="py-20 text-center font-sans text-[11px] uppercase tracking-[0.15em] text-black/40">
            No creations match the selected sizes.
          </p>
        )}
      </div>

      {/* px-6 per allinearsi al blocco di testo editoriale in cima */}
      <CookieFooter className="px-6" />

      {/* ===== Filter drawer (stesso layout del riferimento) ===== */}
      {/* Overlay */}
      <div
        onClick={closeDrawer}
        aria-hidden="true"
        className={`fixed inset-0 z-[60] bg-[#111]/40 transition-opacity duration-300 ${
          drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer laterale da destra */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Refine your selection"
        aria-hidden={!drawerOpen}
        className={`fixed top-0 right-0 bottom-0 z-[70] w-[380px] max-w-[88vw] bg-white flex flex-col transition-transform duration-300 ease-in-out ${
          drawerOpen ? "translate-x-0 shadow-[-12px_0_40px_rgba(0,0,0,0.12)]" : "translate-x-full"
        }`}
      >
        {/* Head */}
        <div className="flex items-center justify-between px-7 py-6 border-b border-[#ececec]">
          <span className="font-serif italic text-[22px] tracking-[0.3px] text-black">
            Refine your selection
          </span>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close"
            className="text-[#111] text-[26px] font-light leading-none opacity-75 hover:opacity-100 transition-opacity"
          >
            &times;
          </button>
        </div>

        {/* Body: solo Sizes */}
        <div className="flex-1 overflow-y-auto px-7 pt-2 pb-7">
          <section className="py-6">
            <h3 className="m-0 mb-4 font-sans text-[11px] font-medium tracking-[2px] uppercase text-black">
              Sizes
            </h3>
            <div className="flex flex-wrap gap-[10px]">
              {allSizes.map((size) => {
                const selected = draftSizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleDraftSize(size)}
                    aria-pressed={selected}
                    className={`min-w-[46px] px-3 py-[9px] border font-sans text-[12px] tracking-[1px] transition-colors ${
                      selected
                        ? "border-black bg-black text-white"
                        : "border-[#e9e9e9] bg-white text-[#555] hover:border-[#bbb] hover:text-black"
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Foot: Clear / Apply */}
        <div className="flex gap-3 px-7 py-5 border-t border-[#ececec]">
          <button
            type="button"
            onClick={clearDraft}
            className="flex-1 py-[14px] font-sans text-[11px] tracking-[2px] uppercase bg-white border border-[#e9e9e9] text-black hover:border-black transition-colors"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={applyDraft}
            className="flex-1 py-[14px] font-sans text-[11px] tracking-[2px] uppercase bg-black border border-black text-white hover:opacity-[0.85] transition-opacity"
          >
            Apply
          </button>
        </div>
      </aside>
    </div>
  );
}
