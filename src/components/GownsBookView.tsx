"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Product, getAllImagePaths } from "@/data/products";
import GownNavPill from "@/components/GownNavPill";
import GownPanel from "@/components/GownPanel";
import { usePageFlip, type FlipState } from "@/components/usePageFlip";

interface GownsBookViewProps {
  products: Product[];
  initialProductIndex?: number;
  /** Notifica su quale creazione la pagina si e' fermata. */
  onProductChange?: (index: number) => void;
}

/** Distanza dal fondo entro cui la pillola dei comandi si ritira. */
const PILL_HIDE_MARGIN_PX = 100;

/**
 * Immagini gia' richieste al browser, per non ricreare piu' volte lo stesso
 * elemento di precarico.
 */
const preloadedImages = new Set<string>();

/**
 * Chiede al browser di scaricare un'immagine in anticipo, cosi' quando la
 * pagina successiva compare in dissolvenza la fotografia e' gia' pronta e non
 * appare in ritardo.
 */
function preloadImage(src: string | undefined) {
  if (!src || typeof window === "undefined" || preloadedImages.has(src)) return;
  preloadedImages.add(src);
  const image = new window.Image();
  image.src = src;
}

/** Stato di dissolvenza di una pagina: solo la sua opacita', da 0 a 1. */
interface PageFade {
  index: number;
  /** Da 0 (invisibile) a 1 (piena). */
  opacity: number;
}

/**
 * Pagina che si allontana: nella prima meta' del passaggio svanisce sul
 * bianco, cioe' la sua opacita' scende da 1 a 0. Il bianco che affiora e' il
 * fondo dello stage, non un altro strato: quando l'opacita' e' zero non resta
 * che il bianco pieno.
 */
function leavingPage(flip: FlipState | null, index: number): PageFade {
  if (!flip) return { index, opacity: 1 };
  // Al limite del libro non c'e' nulla verso cui passare: la pagina resta piena.
  if (flip.to === flip.from) return { index: flip.from, opacity: 1 };
  // 0 -> 1 nella prima meta', poi ferma: la foto si dissolve sul bianco.
  const faded = Math.min(1, flip.progress * 2);
  return { index: flip.from, opacity: 1 - faded };
}

/**
 * Pagina che arriva: resta invisibile per tutta la prima meta', mentre a
 * schermo c'e' il bianco, e nella seconda emerge dal bianco portando la propria
 * opacita' da 0 a 1. La curva dipende solo dall'avanzamento e non dal verso,
 * quindi il passaggio e' identico andando avanti e tornando indietro.
 */
function arrivingPage(flip: FlipState | null, index: number): PageFade {
  if (!flip) return { index, opacity: 0 };
  // 0 nella prima meta', poi 0 -> 1: la foto nuova affiora dal bianco.
  const emerged = Math.max(0, (flip.progress - 0.5) * 2);
  return { index: flip.to, opacity: emerged };
}

/**
 * Il Gowns Book: una creazione per pagina, che si cambia con una dissolvenza
 * attraverso il bianco.
 *
 * La foto corrente svanisce sul bianco, per un istante lo schermo e' bianco
 * pieno, poi il bianco svanisce nella foto successiva: nessuna rotazione,
 * nessuno scorrimento, nessuno spostamento, solo opacita'. Il passaggio e'
 * volutamente rapido. Si cambia pagina con i pulsanti, con le frecce della
 * tastiera e trascinando con il dito o con il mouse; l'effetto e' lo stesso in
 * tutti i casi e nei due versi. Chi ha chiesto al sistema di ridurre le
 * animazioni cambia pagina senza dissolvenza.
 */
export default function GownsBookView({
  products,
  initialProductIndex = 0,
  onProductChange,
}: GownsBookViewProps) {
  const [showHint, setShowHint] = useState(true);
  const [showPill, setShowPill] = useState(true);

  /** Pannello a schermo quando la pagina e' ferma. */
  const activePanelRef = useRef<HTMLDivElement | null>(null);
  /**
   * Scorrimento della pagina nel momento in cui inizia a girare: la pagina che
   * si allontana deve mostrare esattamente cio' che l'utente stava guardando.
   */
  const leafScrollTop = useRef(0);
  /** Un trascinamento appena concluso non deve trasformarsi in un clic. */
  const suppressClickUntil = useRef(0);

  const handleFlipStart = useCallback(() => {
    leafScrollTop.current = activePanelRef.current?.scrollTop ?? 0;
    setShowHint(false);
  }, []);

  // La creazione su cui si e' atterrati viene segnalata dall'effetto che
  // osserva l'indice, non da qui: cosi' esiste un unico punto di notifica e il
  // tracking non puo' ricevere lo stesso passaggio due volte.
  const handleSettle = useCallback(() => {
    leafScrollTop.current = 0;
    setShowPill(true);
  }, []);

  const {
    index,
    flip,
    goNext,
    goPrev,
    jumpTo,
    dragHandlers,
  } = usePageFlip({
    total: products.length,
    initialIndex: initialProductIndex,
    onSettle: handleSettle,
    onFlipStart: handleFlipStart,
  });

  // Allinea la pagina alla creazione scelta altrove, per esempio arrivando da
  // una scheda dei preferiti.
  useEffect(() => {
    jumpTo(initialProductIndex);
  }, [initialProductIndex, jumpTo]);

  // Prima creazione mostrata: va segnalata come le successive, altrimenti
  // l'ingresso nella sezione non verrebbe registrato.
  const notifiedRef = useRef<number | null>(null);
  useEffect(() => {
    if (notifiedRef.current === index) return;
    notifiedRef.current = index;
    onProductChange?.(index);
  }, [index, onProductChange]);

  // Precarico delle pagine adiacenti: appena ci si ferma su una creazione, la
  // prima immagine della precedente e della successiva viene scaricata. Cosi'
  // quando l'utente sfoglia, la pagina che compare in dissolvenza e' gia'
  // pronta e non arriva in ritardo.
  useEffect(() => {
    const neighbours = [products[index - 1], products[index + 1]];
    for (const neighbour of neighbours) {
      if (neighbour) preloadImage(getAllImagePaths(neighbour)[0]);
    }
  }, [index, products]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

  const handlePanelScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const nearBottom = scrollTop + clientHeight >= scrollHeight - PILL_HIDE_MARGIN_PX;
    setShowPill(!nearBottom);
  }, []);

  const handleClickCapture = useCallback((event: React.MouseEvent) => {
    if (performance.now() < suppressClickUntil.current) {
      event.stopPropagation();
      event.preventDefault();
    }
  }, []);

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      // Solo se la pagina si e' davvero mossa: un tocco fermo deve restare un
      // clic valido sul pulsante dei preferiti.
      if (flip?.dragging) {
        suppressClickUntil.current = performance.now() + 350;
      }
      dragHandlers.onPointerUp(event);
    },
    [dragHandlers, flip?.dragging]
  );

  const currentProduct = products[index];
  if (!currentProduct) return null;

  const leaving = leavingPage(flip, index);
  const arriving = arrivingPage(flip, index);

  /**
   * Gli strati sono identificati dal codice della creazione, non dal ruolo:
   * quando il giro si conclude, la pagina arrivata conserva il proprio posto
   * nell'albero e con esso le immagini gia' disegnate, quindi non c'e' nessuno
   * sfarfallio nel passaggio a pagina ferma.
   */
  const layers: Array<{ product: Product; state: PageFade; resting: boolean; zIndex: number }> = [
    // La pagina che si allontana: svanisce sul bianco nella prima meta'.
    { product: products[leaving.index] ?? currentProduct, state: leaving, resting: !flip, zIndex: 1 },
  ];

  // A fine corsa, quando non c'e' nulla oltre l'ultima pagina, partenza e
  // arrivo coincidono: non c'e' nessuna pagina in arrivo e resta a schermo la
  // sola creazione corrente, piena, senza dissolvenza.
  if (flip && flip.to !== flip.from) {
    // La pagina che arriva: emerge dal bianco nella seconda meta', stando sopra.
    layers.push({
      product: products[arriving.index] ?? currentProduct,
      state: arriving,
      resting: false,
      zIndex: 2,
    });
  }

  return (
    <div className="relative w-full h-[100dvh] bg-white">
      <div
        className="flip-stage"
        // Lo scorrimento verticale resta al browser, l'orizzontale allo sfoglio.
        style={{ touchAction: "pan-y" }}
        onPointerDown={dragHandlers.onPointerDown}
        onPointerMove={dragHandlers.onPointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={dragHandlers.onPointerCancel}
        onClickCapture={handleClickCapture}
        // Il trascinamento nativo, di un'immagine o di una selezione di testo,
        // interrompe il flusso di eventi del puntatore: qui lo si disinnesca
        // perche' il gesto resti a disposizione dello sfoglio.
        onDragStart={(event) => event.preventDefault()}
      >
        {layers.map((layer) => (
          <FlipPage
            key={layer.product.sku}
            product={layer.product}
            state={layer.state}
            resting={layer.resting}
            zIndex={layer.zIndex}
            scrollRef={layer.resting ? activePanelRef : undefined}
            onScroll={layer.resting ? handlePanelScroll : undefined}
            leafScrollTop={
              !layer.resting && layer.state.index === leaving.index
                ? leafScrollTop.current
                : undefined
            }
          />
        ))}
      </div>

      {showPill && (
        <GownNavPill
          onPrev={goPrev}
          onNext={goNext}
          currentIndex={index}
          total={products.length}
          showHint={showHint}
        />
      )}
    </div>
  );
}

interface FlipPageProps {
  product: Product;
  state: PageFade;
  /** Vero per la pagina a schermo, ferma e interattiva. */
  resting: boolean;
  /** Ordine di sovrapposizione: la pagina in arrivo sta sopra la precedente. */
  zIndex: number;
  scrollRef?: React.MutableRefObject<HTMLDivElement | null>;
  onScroll?: React.UIEventHandler<HTMLDivElement>;
  /**
   * Posizione di scorrimento da riprodurre sulla pagina che si allontana: deve
   * mostrare esattamente il punto che l'utente stava guardando quando la
   * dissolvenza e' iniziata.
   */
  leafScrollTop?: number;
}

/**
 * Una pagina del libro: quella ferma a schermo o una in dissolvenza.
 *
 * Mentre sfuma non riceve tocchi ne' clic: la pagina in transizione non e' un
 * bersaglio, e cosi' un gesto non puo' far scattare per sbaglio il pulsante dei
 * preferiti che passa sotto il dito. La transizione agisce solo sull'opacita':
 * nessuna trasformazione, nessuno spostamento.
 */
function FlipPage({
  product,
  state,
  resting,
  zIndex,
  scrollRef,
  onScroll,
  leafScrollTop,
}: FlipPageProps) {
  if (resting) {
    return (
      <div className="flip-layer">
        <div className="flip-face">
          <GownPanel product={product} scrollRef={scrollRef} onScroll={onScroll} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="flip-leaf"
      style={{
        opacity: state.opacity,
        zIndex,
      }}
      aria-hidden="true"
    >
      <div className="flip-face">
        <GownPanel
          product={product}
          className="pointer-events-none"
          scrollRef={
            leafScrollTop === undefined
              ? undefined
              : (element) => {
                  if (element) element.scrollTop = leafScrollTop;
                }
          }
        />
      </div>
    </div>
  );
}
