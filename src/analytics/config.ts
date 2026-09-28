/**
 * Configurazione della libreria Adobe Launch.
 *
 * Gli URL sono quelli del manuale di implementazione (cap. 2.1) e non vanno
 * modificati: identificano le due build della property Launch.
 */

export const LAUNCH_LIBRARY = {
  /** Ambienti di sviluppo e UAT. */
  development:
    "https://assets.adobedtm.com/75d94c6e0d96/590762ece535/launch-90977567bd4f-development.min.js",
  /** Ambiente di produzione. */
  production:
    "https://assets.adobedtm.com/75d94c6e0d96/590762ece535/launch-e9ba9503dd03.min.js",
} as const;

export type LaunchEnvironment = keyof typeof LAUNCH_LIBRARY;

/**
 * Sceglie la build in base all'ambiente, non all'hostname: con un export
 * statico l'hostname non e' noto in fase di build e un controllo a runtime
 * dovrebbe elencare i domini uno per uno.
 *
 * NEXT_PUBLIC_ADOBE_LAUNCH_ENV consente di forzare la build di produzione su
 * una preview, o quella di sviluppo su un deploy di collaudo.
 */
export function resolveLaunchEnvironment(): LaunchEnvironment {
  // Ripulito prima del confronto: il valore arriva da un campo di
  // configurazione, e uno spazio in coda o un maiuscolo di troppo lo
  // renderebbero irriconoscibile, facendo scegliere l'altra libreria senza
  // dirlo. Su una scelta come questa il silenzio e' il problema peggiore.
  const explicit = process.env.NEXT_PUBLIC_ADOBE_LAUNCH_ENV?.trim().toLowerCase();

  if (explicit === "production" || explicit === "development") {
    return explicit;
  }

  if (explicit) {
    // eslint-disable-next-line no-console
    console.warn(
      `[analytics] NEXT_PUBLIC_ADOBE_LAUNCH_ENV="${explicit}" non riconosciuto: ` +
        'ammessi solo "development" e "production". Si procede in base a NODE_ENV.'
    );
  }

  // Senza indicazione esplicita conta come e' stata prodotta la build:
  // next build imposta NODE_ENV a production, quindi ogni build di rilascio
  // include la libreria di produzione. Solo next dev usa quella di sviluppo.
  return process.env.NODE_ENV === "production" ? "production" : "development";
}

export function resolveLaunchLibraryUrl(): string {
  return LAUNCH_LIBRARY[resolveLaunchEnvironment()];
}

/**
 * Traccia in console ogni chiamata inviata a _satellite.track.
 * Spento per default: si attiva con NEXT_PUBLIC_ANALYTICS_DEBUG=true e serve
 * solo in sviluppo. Non sostituisce il metodo di verifica del manuale
 * (breakpoint su _satellite.track nel pannello Sources), lo affianca.
 */
export const ANALYTICS_DEBUG = process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === "true";
