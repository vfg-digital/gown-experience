import { resolveLaunchLibraryUrl } from "@/analytics/config";

/**
 * Libreria Adobe Launch, inclusa in tutte le pagine del sito.
 *
 * Il manuale chiede il tag con async prima della chiusura di head. Il
 * componente Script di Next, con qualsiasi strategia, non lo scrive dentro
 * head: lascia una preload e affida l'inserimento al proprio caricatore, che
 * emette il tag subito dopo la chiusura di head. Qui il tag e' scritto a mano
 * dentro l'elemento head, quindi finisce nel markup iniziale esattamente dove
 * il manuale lo vuole.
 *
 * Va usato solo nel layout radice: e' l'unico punto in cui Next accetta un
 * elemento head e da cui la libreria arriva a ogni pagina.
 */
export default function AdobeLaunch() {
  return (
    // La regola rimanda a next/head, che appartiene al Pages Router e con
    // l'App Router non e' utilizzabile: qui l'elemento head e' la via corretta.
    // eslint-disable-next-line @next/next/no-head-element
    <head>
      <script src={resolveLaunchLibraryUrl()} async />
    </head>
  );
}
