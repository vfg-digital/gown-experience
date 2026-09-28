/**
 * Ponte verso _satellite, la funzione esposta dalla libreria Adobe Launch.
 *
 * La libreria si carica con async, quindi al primo page_view puo' non essere
 * ancora disponibile: le chiamate emesse prima vengono accodate nell'ordine di
 * arrivo e rilasciate appena _satellite.track esiste. Senza la coda il primo
 * page_view, che e' quello della schermata di accesso, andrebbe perso.
 */

import { ANALYTICS_DEBUG } from "@/analytics/config";

type TrackPayload = Record<string, unknown>;

interface Satellite {
  track: (eventName: string, payload?: TrackPayload) => void;
}

/** Riga del registro di verifica esposto in console. */
interface AnalyticsRecord {
  eventName: string;
  payload: TrackPayload;
  /** Falso se la chiamata e' rimasta in coda, senza libreria a cui darla. */
  delivered: boolean;
  at: string;
}

declare global {
  interface Window {
    _satellite?: Partial<Satellite>;
    /** Presente solo con NEXT_PUBLIC_ANALYTICS_DEBUG=true. */
    __analytics?: AnalyticsRecord[];
    /**
     * Data layer globale del page view corrente, come da manuale.
     * I data element di Adobe Launch leggono questa variabile: viene esposta
     * al momento di ogni page_view (vedi dispatch).
     */
    digitalData?: TrackPayload;
  }
}

/** Nome dell'evento di visualizzazione pagina, per il manuale. */
const PAGE_VIEW_EVENT = "page_view";

/** Intervallo e numero di tentativi di attesa della libreria. */
const POLL_INTERVAL_MS = 100;
const POLL_MAX_ATTEMPTS = 300; // 30 secondi

interface QueuedCall {
  eventName: string;
  payload: TrackPayload;
}

const queue: QueuedCall[] = [];
let pollTimer: ReturnType<typeof setInterval> | null = null;

function getSatelliteTrack(): Satellite["track"] | null {
  if (typeof window === "undefined") return null;
  const track = window._satellite?.track;
  return typeof track === "function" ? track.bind(window._satellite) : null;
}

/** Quante chiamate tenere a disposizione in console durante una verifica. */
const DEBUG_HISTORY_LIMIT = 500;

/**
 * Registra la chiamata in console e, con il debug attivo, la conserva in
 * window.__analytics.
 *
 * Il registro copre anche le chiamate che restano in coda perche' la libreria
 * non e' ancora arrivata, o non arrivera' mai: durante un collaudo e' proprio
 * quello il caso da osservare, perche' dice se il sito emette le chiamate
 * giuste a prescindere dalla presenza di Adobe Launch.
 */
function record(call: QueuedCall, delivered: boolean): void {
  if (!ANALYTICS_DEBUG) return;

  // eslint-disable-next-line no-console
  console.info(
    `[analytics] ${delivered ? "inviato" : "in coda"}`,
    call.eventName,
    call.payload
  );

  const history = (window.__analytics ??= []);
  history.push({ ...call, delivered, at: new Date().toISOString() });
  if (history.length > DEBUG_HISTORY_LIMIT) history.shift();
}

function dispatch(track: Satellite["track"], call: QueuedCall): void {
  record(call, true);

  // Il manuale scrive `var digitalData = {...}; _satellite.track('page_view',
  // digitalData)`: definisce digitalData come variabile globale e la passa a
  // track. I data element di Launch leggono quella globale, quindi va esposta
  // nell'istante esatto della chiamata, anche per le chiamate uscite dalla
  // coda. Riguarda solo il page_view: i custom_event portano i dati in
  // event.detail e il manuale non li mette in digitalData.
  if (call.eventName === PAGE_VIEW_EVENT && typeof window !== "undefined") {
    window.digitalData = call.payload;
  }

  track(call.eventName, call.payload);
}

function flushQueue(track: Satellite["track"]): void {
  while (queue.length > 0) {
    // shift, non pop: l'ordine degli eventi e' significativo
    dispatch(track, queue.shift() as QueuedCall);
  }
}

function stopPolling(): void {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPolling(): void {
  if (pollTimer !== null) return;

  let attempts = 0;
  pollTimer = setInterval(() => {
    attempts += 1;
    const track = getSatelliteTrack();

    if (track) {
      stopPolling();
      flushQueue(track);
      return;
    }

    if (attempts >= POLL_MAX_ATTEMPTS) {
      stopPolling();
      // La libreria non e' arrivata: si svuota la coda senza inviare nulla,
      // per non far crescere la memoria durante una sessione lunga.
      queue.length = 0;
      if (ANALYTICS_DEBUG) {
        // eslint-disable-next-line no-console
        console.warn("[analytics] libreria Adobe Launch non disponibile");
      }
    }
  }, POLL_INTERVAL_MS);
}

/**
 * Invia una chiamata a _satellite.track, accodandola se la libreria non e'
 * ancora pronta. Unico punto di contatto con Adobe Launch in tutto il codice.
 */
export function satelliteTrack(eventName: string, payload: TrackPayload): void {
  if (typeof window === "undefined") return;

  const call: QueuedCall = { eventName, payload };
  const track = getSatelliteTrack();

  if (track) {
    flushQueue(track);
    dispatch(track, call);
    return;
  }

  queue.push(call);
  record(call, false);
  startPolling();
}
