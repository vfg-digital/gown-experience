"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** 1 = si va avanti, -1 = si torna indietro. */
export type FlipDirection = 1 | -1;

export interface FlipState {
  direction: FlipDirection;
  /** Pagina da cui si parte. */
  from: number;
  /** Pagina su cui si arriva. */
  to: number;
  /** Avanzamento del giro, da 0 (pagina ferma) a 1 (giro completo). */
  progress: number;
  /** Vero mentre l'utente tiene il dito o il puntatore sulla pagina. */
  dragging: boolean;
}

interface UsePageFlipOptions {
  /** Numero di pagine del libro. */
  total: number;
  /** Pagina da cui partire. */
  initialIndex?: number;
  /**
   * Chiamata quando il giro si e' concluso e la pagina e' ferma. E' il punto
   * in cui il tracking registra la nuova scheda: durante il movimento la
   * pagina non e' ancora quella su cui l'utente e' atterrato.
   */
  onSettle?: (index: number) => void;
  /**
   * Chiamata nel momento in cui la pagina inizia a muoversi, prima che il
   * nuovo strato compaia. Serve a fotografare lo stato della pagina che sta
   * per essere girata, per esempio la sua posizione di scorrimento.
   */
  onFlipStart?: (from: number) => void;
}

/**
 * Durata dell'intera transizione: metà per svanire sul bianco, metà per
 * emergere dal bianco. Volutamente breve, il passaggio dev'essere rapido.
 */
const FLIP_DURATION_MS = 460;
/** Oltre questa quota di giro il rilascio completa il passaggio. */
const COMPLETE_THRESHOLD = 0.32;
/** Spostamento minimo, in pixel, per distinguere lo sfoglio dallo scorrimento. */
const DRAG_ACTIVATION_PX = 24;
/** Quanto si puo' tirare la pagina quando non c'e' nulla oltre. */
const RUBBER_BAND_MAX = 0.1;

/** Accelera nella prima meta' e frena nella seconda, come la carta. */
function easeInOutSine(t: number): number {
  return 0.5 - Math.cos(t * Math.PI) / 2;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);

    const handleChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  return reduced;
}

/**
 * Stato dello sfoglio di un libro a pagina singola.
 *
 * Tiene un solo valore di avanzamento da 0 a 1, da cui derivano rotazione e
 * ombre: cosi' il trascinamento e l'animazione dei pulsanti percorrono la
 * stessa strada e non possono desincronizzarsi. Il giro non si interrompe a
 * meta': finche' e' in corso, nuove richieste vengono ignorate, per non
 * lasciare la pagina in una posizione intermedia.
 */
export function usePageFlip({
  total,
  initialIndex = 0,
  onSettle,
  onFlipStart,
}: UsePageFlipOptions) {
  const [index, setIndex] = useState(() => clamp(initialIndex, 0, Math.max(0, total - 1)));
  const [flip, setFlip] = useState<FlipState | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const frameRef = useRef<number | null>(null);
  // Lo stato serve anche ai gestori di eventi, che non devono ricrearsi a ogni
  // fotogramma: il riferimento evita di rigenerare i listener 60 volte al
  // secondo.
  const flipRef = useRef<FlipState | null>(null);
  const indexRef = useRef(index);
  const onSettleRef = useRef(onSettle);
  const onFlipStartRef = useRef(onFlipStart);

  useEffect(() => {
    onSettleRef.current = onSettle;
    onFlipStartRef.current = onFlipStart;
  }, [onSettle, onFlipStart]);

  const updateFlip = useCallback((next: FlipState | null) => {
    flipRef.current = next;
    setFlip(next);
  }, []);

  const cancelFrame = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const settle = useCallback(
    (target: number) => {
      cancelFrame();
      indexRef.current = target;
      setIndex(target);
      updateFlip(null);
      onSettleRef.current?.(target);
    },
    [cancelFrame, updateFlip]
  );

  /**
   * Porta l'avanzamento da dove si trova al valore richiesto.
   * La durata e' proporzionale alla strada che resta, cosi' il rilascio a giro
   * quasi completo non aggiunge un'attesa fuori luogo.
   */
  const animateTo = useCallback(
    (state: FlipState, target: 0 | 1) => {
      cancelFrame();

      const startProgress = state.progress;
      const distance = Math.abs(target - startProgress);

      if (distance < 0.001) {
        if (target === 1) settle(state.to);
        else updateFlip(null);
        return;
      }

      const duration = FLIP_DURATION_MS * distance;
      const startedAt = performance.now();

      const step = (now: number) => {
        const linear = clamp((now - startedAt) / duration, 0, 1);
        const eased = easeInOutSine(linear);
        const progress = startProgress + (target - startProgress) * eased;

        updateFlip({ ...state, progress, dragging: false });

        if (linear < 1) {
          frameRef.current = requestAnimationFrame(step);
          return;
        }

        frameRef.current = null;
        if (target === 1) settle(state.to);
        else updateFlip(null);
      };

      frameRef.current = requestAnimationFrame(step);
    },
    [cancelFrame, settle, updateFlip]
  );

  const canGo = useCallback(
    (direction: FlipDirection) => {
      const target = indexRef.current + direction;
      return target >= 0 && target < total;
    },
    [total]
  );

  /** Sfoglia con i pulsanti o la tastiera. */
  const turnPage = useCallback(
    (direction: FlipDirection) => {
      if (flipRef.current !== null) return;
      if (!canGo(direction)) return;

      const from = indexRef.current;
      const to = from + direction;

      if (prefersReducedMotion) {
        settle(to);
        return;
      }

      onFlipStartRef.current?.(from);

      const state: FlipState = { direction, from, to, progress: 0, dragging: false };
      updateFlip(state);
      animateTo(state, 1);
    },
    [animateTo, canGo, prefersReducedMotion, settle, updateFlip]
  );

  const goNext = useCallback(() => turnPage(1), [turnPage]);
  const goPrev = useCallback(() => turnPage(-1), [turnPage]);

  /** Salta a una pagina senza animazione: serve all'ingresso nella sezione. */
  const jumpTo = useCallback(
    (target: number) => {
      const bounded = clamp(target, 0, Math.max(0, total - 1));
      if (bounded === indexRef.current && flipRef.current === null) return;
      settle(bounded);
    },
    [settle, total]
  );

  // ---- trascinamento -------------------------------------------------------

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    width: number;
    active: boolean;
    abandoned: boolean;
  } | null>(null);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (prefersReducedMotion) return;
      if (flipRef.current !== null) return;
      // Solo il pulsante principale del mouse; penna e dito passano sempre.
      if (event.pointerType === "mouse" && event.button !== 0) return;

      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        width: event.currentTarget.clientWidth || 1,
        active: false,
        abandoned: false,
      };
    },
    [prefersReducedMotion]
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.abandoned || drag.pointerId !== event.pointerId) return;

      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;

      if (!drag.active) {
        // Movimento prevalentemente verticale: e' uno scorrimento della
        // galleria, lo sfoglio si tira indietro per questo gesto.
        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > DRAG_ACTIVATION_PX) {
          drag.abandoned = true;
          return;
        }
        if (Math.abs(deltaX) < DRAG_ACTIVATION_PX) return;
        if (Math.abs(deltaX) < Math.abs(deltaY) * 1.5) return;

        drag.active = true;
        onFlipStartRef.current?.(indexRef.current);
      }

      // Trascinare verso sinistra porta avanti, come sfogliando la carta.
      const direction: FlipDirection = deltaX < 0 ? 1 : -1;
      const reachable = canGo(direction);
      const raw = Math.abs(deltaX) / (drag.width * 0.7);
      const progress = reachable
        ? clamp(raw, 0, 1)
        : clamp(raw, 0, 1) * RUBBER_BAND_MAX;

      const from = indexRef.current;
      updateFlip({
        direction,
        from,
        to: reachable ? from + direction : from,
        progress,
        dragging: true,
      });
    },
    [canGo, updateFlip]
  );

  const finishDrag = useCallback(
    (event: React.PointerEvent<HTMLElement>, aborted: boolean) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragRef.current = null;

      const state = flipRef.current;
      if (!state || !state.dragging) return;

      const reachable = state.to !== state.from;
      if (!aborted && reachable && state.progress >= COMPLETE_THRESHOLD) {
        animateTo(state, 1);
      } else {
        animateTo(state, 0);
      }
    },
    [animateTo]
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLElement>) => finishDrag(event, false),
    [finishDrag]
  );

  const onPointerCancel = useCallback(
    (event: React.PointerEvent<HTMLElement>) => finishDrag(event, true),
    [finishDrag]
  );

  useEffect(() => cancelFrame, [cancelFrame]);

  return {
    index,
    flip,
    goNext,
    goPrev,
    jumpTo,
    canGoNext: index < total - 1,
    canGoPrev: index > 0,
    prefersReducedMotion,
    dragHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
  };
}
