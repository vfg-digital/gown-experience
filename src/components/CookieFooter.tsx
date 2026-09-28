"use client";

import React from "react";

interface CookieFooterProps {
  /**
   * "flow" (predefinito): sta in fondo al contenuto e scorre con la pagina.
   * Per le schermate che si scorrono: griglia, wishlist, Savoir-Faire, scheda abito.
   *
   * "overlay": ancorato in basso sopra a un'immagine a pieno schermo.
   * Per il menu e la schermata di accesso, che non scorrono.
   */
  variant?: "flow" | "overlay";
  /**
   * Spaziatura orizzontale, per allineare il link al margine del contenuto
   * della schermata che lo ospita. Ogni vista ha un rientro diverso (px-6,
   * px-10, px-4...), quindi non si puo fissare qui: chi usa il componente
   * passa quello giusto. Se il contenitore ha gia il suo rientro si omette.
   */
  className?: string;
}

/**
 * Link discreto alla Cookie Policy, in fondo al contenuto di ogni schermata.
 * Unico punto in cui compare il testo del link: cambiando qui si aggiorna
 * dappertutto.
 *
 * Si apre in una nuova scheda di proposito: il sito e protetto da password e
 * non ricorda di averla ricevuta, quindi allontanare l'utente dalla pagina lo
 * costringerebbe a reinserirla e a rivedere l'introduzione al rientro.
 */
export default function CookieFooter({ variant = "flow", className = "" }: CookieFooterProps) {
  const wrapper =
    variant === "overlay"
      ? "absolute bottom-0 left-0 right-0 z-30 flex justify-start pb-5 pointer-events-none"
      : "w-full flex justify-start pt-8 pb-6";

  return (
    <div className={`${wrapper} ${className}`}>
      <a
        // Con la barra finale, in coppia con trailingSlash nella
        // configurazione: la rotta e' una cartella con il suo index.html.
        // E' l'unica forma che regge su tutti gli hosting statici. Con i file
        // piatti Vercel voleva l'indirizzo senza estensione e un bucket S3
        // quello con l'estensione, quindi una delle due piattaforme restava
        // senza informativa, che per obbligo deve essere consultabile.
        href="/cookie-policy/"
        target="_blank"
        rel="noopener noreferrer"
        // Nella schermata di accesso il contenitore che sta sotto intercetta il
        // click per saltare il video: senza questo, aprire la policy salterebbe
        // anche l'introduzione.
        onClick={(event) => event.stopPropagation()}
        className={`pointer-events-auto font-sans text-[9px] text-black/40 hover:text-black/70 transition-colors underline decoration-black/15 hover:decoration-black/40 underline-offset-4 ${
          variant === "overlay" ? "drop-shadow-[0_0_6px_rgba(255,255,255,0.9)]" : ""
        }`}
      >
        Cookie Policy
      </a>
    </div>
  );
}
