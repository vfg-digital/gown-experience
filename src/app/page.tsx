"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Header from "@/components/Header";
import MenuScreen from "@/components/MenuScreen";
import SavoirFairePage from "@/components/SavoirFairePage";
import GownsBookView from "@/components/GownsBookView";
import ImmersiveView from "@/components/ImmersiveView";
import GridView from "@/components/GridView";
import WishlistView from "@/components/WishlistView";
import SharedWishlistView from "@/components/SharedWishlistView";
import CookieFooter from "@/components/CookieFooter";
import { CUSTOM_EVENTS } from "@/analytics/events";
import {
  buildGownDetailPageView,
  buildPageView,
  PAGE_NAMES,
  type DetailOrigin,
  type PageViewData,
} from "@/analytics/pages";
import { trackCustomEvent } from "@/analytics/track";
import { usePageView } from "@/analytics/usePageView";
import { products } from "@/data/products";

type AppState = "locked" | "video" | "menu" | "browsing" | "shared";
type ViewMode = "savoir-faire" | "gowns-book" | "gowns-closet" | "wishlist";

export default function Home() {
  const [appState, setAppState] = useState<AppState>("locked");
  const [viewMode, setViewMode] = useState<ViewMode>("gowns-closet");
  // null = nessuna creazione selezionata (apertura "pulita"). Serve al Gowns
  // Closet per capire se agganciare lo scroll a una card (ritorno da una scheda)
  // o partire dall'alto (primo ingresso). Vedi highlightSku piu' sotto.
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);
  const [sharedSkus, setSharedSkus] = useState<string[]>([]);
  // Nome inserito all'accesso. Vive solo in memoria per la sessione: serve
  // unicamente al saluto nel menu, non viene salvato ne trasmesso.
  const [guestName, setGuestName] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Intro substates
  const [blurPhase, setBlurPhase] = useState<"blur" | "dissolving" | "gone">("blur");
  const [textFadingOut, setTextFadingOut] = useState(false);
  const [videoFading, setVideoFading] = useState(false);

  // ---- tracking ------------------------------------------------------------

  /**
   * Finche' non si sa se la sessione arriva da un link di selezione condivisa,
   * la schermata non e' decisa: il primo page_view aspetta, altrimenti a chi
   * apre un link condiviso verrebbe attribuita anche una visita alla pagina di
   * accesso, che non ha mai visto.
   */
  const [sessionResolved, setSessionResolved] = useState(false);
  /** Da dove si e' entrati nella scheda: cambia il ramo di page_name. */
  const [detailOrigin, setDetailOrigin] = useState<DetailOrigin>("gowns-book");
  /** Creazione effettivamente a schermo nella scheda, anche dopo uno sfoglio. */
  const [detailProductIndex, setDetailProductIndex] = useState(0);

  const pageView = useMemo<PageViewData | null>(() => {
    if (!sessionResolved) return null;

    switch (appState) {
      case "shared":
        return buildPageView(PAGE_NAMES.favouriteShared, "favourite");
      case "locked":
        return buildPageView(PAGE_NAMES.login, "landing");
      // Il video di introduzione non e' una pagina prevista dal manuale.
      case "video":
        return null;
      case "menu":
        return buildPageView(PAGE_NAMES.welcome, "welcome");
      case "browsing":
        break;
    }

    switch (viewMode) {
      case "savoir-faire":
        return buildPageView(PAGE_NAMES.savoirFaireListing, "savoire-faire");
      case "gowns-closet":
        return buildPageView(PAGE_NAMES.gownsClosetListing, "gowns closet");
      case "wishlist":
        return buildPageView(PAGE_NAMES.favouriteListing, "favourite");
      case "gowns-book": {
        const product = products[detailProductIndex];
        return product ? buildGownDetailPageView(product, detailOrigin) : null;
      }
    }
  }, [sessionResolved, appState, viewMode, detailProductIndex, detailOrigin]);

  usePageView(pageView);

  // Check for ?selection= param on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const selection = params.get("selection");
    if (selection) {
      const skus = selection.split(",").filter((s) => products.some((p) => p.sku === s));
      if (skus.length > 0) {
        setSharedSkus(skus);
        setAppState("shared");
      }
    }
    setSessionResolved(true);
  }, []);

  // History API - handle back button
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const state = e.state;
      if (state?.appState === "menu") {
        setAppState("menu");
      } else if (state?.appState === "browsing") {
        setAppState("browsing");
        setViewMode(state.viewMode || "gowns-closet");
        // Il ramo di page_name dipende da dove si e' entrati nella scheda:
        // ripristinarlo insieme alla vista evita che un ritorno indietro
        // riporti la scheda sotto il ramo sbagliato.
        if (state.detailOrigin === "gowns-book" || state.detailOrigin === "gowns-closet") {
          setDetailOrigin(state.detailOrigin);
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Push state to history
  const pushHistory = useCallback(
    (newAppState: string, newViewMode?: string, origin?: DetailOrigin) => {
      window.history.pushState(
        { appState: newAppState, viewMode: newViewMode, detailOrigin: origin },
        "",
        window.location.pathname
      );
    },
    []
  );

  // Password accepted → dissolve blur, then intro video mounts on top of loop
  const handleAccessGranted = useCallback((name: string) => {
    // Solo in memoria, per la durata della sessione: al ricaricamento sparisce
    // insieme all'accesso, quindi non c'e' nulla da salvare nel browser.
    setGuestName(name);
    setTimeout(() => {
      setTextFadingOut(true);

      // Dissolve overlay revealing loop video
      setTimeout(() => {
        setBlurPhase("dissolving");
        setAppState("video");

        // Mark blur as gone after dissolve completes
        setTimeout(() => {
          setBlurPhase("gone");
        }, 1800);
      }, 300);
    }, 200);
  }, []);

  // Video intro ended → fade out video + loop, reveal menu
  const [loopHidden, setLoopHidden] = useState(false);

  const handleVideoEnd = useCallback(() => {
    setVideoFading(true);
    setLoopHidden(true); // Hide loop so menu shows through
    setTimeout(() => {
      setAppState("menu");
      pushHistory("menu");
    }, 1800); // Wait slightly longer than fade (1500ms) to avoid glitch
  }, [pushHistory]);

  // Skip video → fade to menu
  const handleSkip = useCallback(() => {
    if (appState === "video") {
      setVideoFading(true);
      setLoopHidden(true);
      setTimeout(() => {
        setAppState("menu");
        pushHistory("menu");
      }, 800);
    }
  }, [appState, pushHistory]);

  // Azzera lo scroll della finestra a ogni cambio di vista.
  // Senza questo la nuova pagina si monta con la posizione di scroll di quella
  // precedente (il menu e alto 101vh), facendo finire il titolo sotto l'header.
  // La griglia e esclusa: gestisce da se il ritorno sulla card del prodotto
  // da cui si e usciti, e un reset qui lo annullerebbe.
  useEffect(() => {
    if (viewMode === "gowns-closet") return;
    // "instant" perche globals.css imposta scroll-behavior: smooth,
    // che altrimenti renderebbe il salto visibile.
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [appState, viewMode]);

  // Menu selections
  const handleSelectSavoirFaire = useCallback(() => {
    setAppState("browsing");
    setViewMode("savoir-faire");
    pushHistory("browsing", "savoir-faire");
  }, [pushHistory]);

  const handleSelectGownsBook = useCallback(() => {
    setAppState("browsing");
    setViewMode("gowns-book");
    setDetailOrigin("gowns-book");
    pushHistory("browsing", "gowns-book", "gowns-book");
  }, [pushHistory]);

  const handleSelectGownsCloset = useCallback(() => {
    setAppState("browsing");
    setViewMode("gowns-closet");
    pushHistory("browsing", "gowns-closet");
  }, [pushHistory]);

  // Navigation
  const handleGoToMenu = useCallback(() => {
    setAppState("menu");
    pushHistory("menu");
  }, [pushHistory]);

  const handleGoToWishlist = useCallback(() => {
    setViewMode("wishlist");
    pushHistory("browsing", "wishlist");
  }, [pushHistory]);

  const handleGoHome = useCallback(() => {
    setAppState("menu");
    pushHistory("menu");
  }, [pushHistory]);

  const handleSelectProduct = useCallback((index: number) => {
    setSelectedProductIndex(index);
    setDetailProductIndex(index);
    setViewMode("gowns-book");
    // La scheda aperta da una card appartiene al ramo del Gowns Closet.
    setDetailOrigin("gowns-closet");
    pushHistory("browsing", "gowns-book", "gowns-closet");
  }, [pushHistory]);

  // Back dalla PDP: torna al Gowns Closet ancorando lo scroll alla creazione
  // che si stava visualizzando (detailProductIndex), non a quella iniziale.
  const handleBackToCloset = useCallback(() => {
    setSelectedProductIndex(detailProductIndex);
    setViewMode("gowns-closet");
    pushHistory("browsing", "gowns-closet");
  }, [detailProductIndex, pushHistory]);

  return (
    <main className="relative">
      {/* Header - visible when browsing */}
      {appState === "browsing" && (
        <Header
          onGoToMenu={handleGoToMenu}
          onGoToWishlist={handleGoToWishlist}
          onGoHome={handleGoHome}
          // Back a sinistra su Savoir-Faire / Gowns Closet (-> menu) e su PDP
          // (-> Gowns Closet, ancorato al prodotto). Sulla wishlist resta il
          // menu hamburger (onBack assente).
          onBack={
            viewMode === "wishlist"
              ? undefined
              : viewMode === "gowns-book"
              ? handleBackToCloset
              : handleGoToMenu
          }
          scrollContainer={scrollContainerRef}
        />
      )}

      {/* ===== MENU (always mounted when not browsing, sits underneath intro) ===== */}
      {(appState === "locked" || appState === "video" || appState === "menu") && (
        <MenuScreen
          guestName={guestName}
          onSelectSavoirFaire={handleSelectSavoirFaire}
          onSelectGownsBook={handleSelectGownsBook}
          onSelectGownsCloset={handleSelectGownsCloset}
        />
      )}

      {/* ===== INTRO (locked / video) - sits on top of menu ===== */}
      {(appState === "locked" || appState === "video") && (
        <div className="fixed inset-0 z-50" onClick={appState === "video" ? handleSkip : undefined}>
          {/* Layer 0: fondo opaco. Il video loop pesa diversi MB: finche non e
              scaricato l'elemento <video> e trasparente e il menu sottostante
              traspariva attraverso l'overlay semitrasparente.
              Sfuma insieme al loop per non bloccare la rivelazione del menu. */}
          <div
            className={`absolute inset-0 bg-[#fff3e5] transition-opacity duration-[1500ms] ${
              loopHidden ? "opacity-0" : "opacity-100"
            }`}
          />

          {/* Layer 1: Video loop */}
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1500ms] ${
              loopHidden ? "opacity-0" : "opacity-100"
            }`}
          >
            <source src="/video/loop.mp4" type="video/mp4" />
          </video>

          {/* Prefetch di intro.mp4 mentre l'utente e sulla schermata password.
              Senza questo il download parte solo dopo l'invio della password,
              causando l'attesa prima del secondo video. */}
          {appState === "locked" && (
            <video
              muted
              playsInline
              preload="auto"
              aria-hidden="true"
              tabIndex={-1}
              className="absolute w-px h-px opacity-0 pointer-events-none"
            >
              <source src="/video/intro.mp4" type="video/mp4" />
            </video>
          )}

          {/* Layer 2: Video intro - no fade-in, only fade-out at end */}
          {appState === "video" && blurPhase === "gone" && (
            <video
              autoPlay
              muted
              playsInline
              preload="auto"
              className={`absolute inset-0 w-full h-full object-cover ${
                videoFading ? "transition-opacity duration-[1500ms] opacity-0" : "opacity-100"
              }`}
              onEnded={handleVideoEnd}
            >
              <source src="/video/intro.mp4" type="video/mp4" />
            </video>
          )}

          {/* Layer 3: Overlay (password screen) - light butter overlay */}
          {blurPhase !== "gone" && (
            <div
              className={`absolute inset-0 z-20 flex items-end justify-start transition-opacity ${
                blurPhase === "blur"
                  ? "bg-[#fff3e5]/50 opacity-100 duration-[800ms]"
                  : "bg-[#fff3e5]/50 opacity-0 duration-[1800ms]"
              }`}
            >
              <div className={`w-full max-w-lg px-6 md:px-12 pb-32 md:pb-40 text-left transition-opacity duration-500 ${
                textFadingOut ? "opacity-0" : "opacity-100"
              }`}>
                {appState === "locked" && (
                  <AccessOverlay onAccessGranted={handleAccessGranted} />
                )}
              </div>
            </div>
          )}

          {/* Logo */}
          <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-center h-14">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-valentino.svg" alt="Valentino" className="h-5 md:h-7 w-auto" />
          </header>

          {/* Solo sulla schermata di accesso, non sopra al video di
              introduzione: l'informativa deve essere raggiungibile dalla prima
              schermata che il visitatore incontra. */}
          {appState === "locked" && (
            /* px-6 md:px-12 per allinearsi al modulo della password */
            <CookieFooter variant="overlay" className="px-6 md:px-12" />
          )}
        </div>
      )}

      {/* ===== BROWSING ===== */}
      {appState === "browsing" && (
        <>
          {viewMode === "savoir-faire" && <SavoirFairePage />}

          {/* La scheda della creazione ha due andature: dentro il Gowns Book si
              sfoglia la pagina, mentre arrivandoci dal Gowns Closet resta la
              dissolvenza del progetto originale. */}
          {viewMode === "gowns-book" && detailOrigin === "gowns-book" && (
            <GownsBookView
              products={products}
              initialProductIndex={selectedProductIndex ?? 0}
              onProductChange={setDetailProductIndex}
            />
          )}

          {viewMode === "gowns-book" && detailOrigin === "gowns-closet" && (
            <ImmersiveView
              products={products}
              initialProductIndex={selectedProductIndex ?? 0}
              scrollRef={scrollContainerRef}
              onProductChange={setDetailProductIndex}
            />
          )}

          {viewMode === "gowns-closet" && (
            <GridView
              products={products}
              onSelectProduct={handleSelectProduct}
              highlightSku={
                selectedProductIndex != null
                  ? products[selectedProductIndex]?.sku
                  : undefined
              }
            />
          )}

          {viewMode === "wishlist" && (
            <WishlistView onGoHome={handleGoHome} onSelectProduct={handleSelectProduct} />
          )}
        </>
      )}

      {/* Shared wishlist */}
      {appState === "shared" && (
        <SharedWishlistView skus={sharedSkus} />
      )}
    </main>
  );
}

/**
 * Mette l'iniziale maiuscola a ogni parola senza toccare il resto, cosi
 * "anna" diventa "Anna" ma "McCartney" non diventa "Mccartney".
 * Serve solo per il saluto: un "Welcome, anna" tradirebbe la cura del resto.
 */
function formatName(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

// Access overlay component
function AccessOverlay({ onAccessGranted }: { onAccessGranted: (name: string) => void }) {
  const [nameInput, setNameInput] = useState("");
  const [accessInput, setAccessInput] = useState("");
  // Un solo stato per l'errore: i due casi non si presentano mai insieme,
  // si controlla prima il nome e poi la chiave.
  const [error, setError] = useState<"none" | "name" | "key">("none");
  const [glowing, setGlowing] = useState(false);
  /**
   * Una volta accettata la chiave il modulo non deve poter inviare di nuovo:
   * l'attesa prima della dissolvenza lascerebbe il tempo di premere Invio una
   * seconda volta e gowns_login partirebbe due volte per un solo accesso.
   */
  const granted = useRef(false);

  const handleAccessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (granted.current) return;

    if (!nameInput.trim()) {
      // Il nome mancante e' un controllo che precede l'invio della chiave:
      // non c'e' stato alcun tentativo di accesso da riportare.
      setError("name");
      return;
    }

    if (accessInput.trim().toLowerCase() === "reverie058") {
      granted.current = true;
      setError("none");
      setGlowing(true);
      trackCustomEvent(CUSTOM_EVENTS.login);
      setTimeout(() => {
        // Il nome viaggia solo in memoria, per la durata della sessione:
        // non viene salvato nel browser ne inviato da nessuna parte, quindi
        // non aggiunge nulla a quanto dichiarato nella Cookie Policy.
        onAccessGranted(formatName(nameInput));
      }, 600);
    } else {
      setError("key");
      trackCustomEvent(CUSTOM_EVENTS.loginError);
    }
  };

  return (
    <div className="text-left">
      <h1 className="font-serif text-6xl md:text-7xl lg:text-8xl text-black font-normal leading-[0.9] mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/valentino-reverie.svg" alt="Valentino Rêverie" className="h-20 md:h-24 lg:h-28 w-auto" />
      </h1>

      <p className="font-serif font-normal italic text-[20px] leading-[25px] tracking-[-0.03em] text-black/70 mb-8 animate-fade-in-up animate-delay-800">
        Step into a private world of Maison Valentino treasures, reserved for a select few.
        <br />
        Your exclusive access key awaits.
      </p>

      <form onSubmit={handleAccessSubmit} className="animate-fade-in-up animate-delay-1200">
        {/* Nome. L'icona a lettera e' decorativa, non invia il modulo: il
            campo si conferma con Invio o col pulsante della riga sotto. */}
        <div
          className={`flex items-center gap-3 mb-5 transition-all duration-500 ${
            glowing ? "glow-line" : ""
          }`}
        >
          <input
            type="text"
            value={nameInput}
            onChange={(e) => {
              setNameInput(e.target.value);
              if (error === "name") setError("none");
            }}
            // access-ink: stesso grigio dei pallini della chiave, cosi le due
            // righe hanno lo stesso peso visivo. Ad accesso accettato passa a
            // bianco luminoso insieme alla riga della chiave.
            className={`w-full font-serif italic text-lg bg-transparent border-0 border-b border-black/25 py-2 px-1 outline-none focus:border-black/50 transition-all placeholder:text-black/30 access-ink ${
              glowing ? "access-ink-glow" : ""
            }`}
            // 16px impedisce a Safari su iPhone di ingrandire la pagina al
            // primo tocco sul campo.
            style={{ fontSize: "16px" }}
            autoFocus
            autoComplete="off"
            aria-label="Your name"
            placeholder="Your Name"
          />
        </div>

        {/* Access key */}
        <div className={`flex items-center gap-3 transition-all duration-500 ${
          glowing ? "glow-line" : ""
        }`}>
          <input
            type="text"
            value={accessInput}
            onChange={(e) => {
              setAccessInput(e.target.value);
              if (error === "key") setError("none");
            }}
            // La spaziatura larga si attiva solo quando c'e' del testo: cosi i
            // pallini restano distanziati come prima, ma la scritta segnaposto
            // in corsivo resta leggibile e non spaziata.
            className={`w-full font-serif italic text-lg bg-transparent border-0 border-b border-black/25 py-2 px-1 outline-none focus:border-black/50 transition-all placeholder:text-black/30 password-dots ${
              accessInput ? "tracking-[0.3em]" : ""
            } ${glowing ? "password-dots-glow" : ""}`}
            style={{ fontSize: "16px", WebkitTextSecurity: "disc" } as React.CSSProperties}
            autoComplete="off"
            aria-label="Access key"
            placeholder="Your Access Key"
          />
        </div>

        {/* CTA di invio. Sostituisce la vecchia icona-chiave: la logica di
            submit e il tracking (gowns_login / gowns_login_ko) restano in
            handleAccessSubmit, quindi le analitiche non cambiano. L'invio con
            il tasto Invio continua a funzionare (form onSubmit). */}
        <button
          type="submit"
          className={`w-full mt-8 min-h-[44px] py-3 flex items-center justify-center font-sans text-[12px] tracking-[0.15em] text-white/90 transition-colors ${
            glowing ? "bg-[#252525]/75" : "bg-[#252525]/60 hover:bg-[#252525]/75"
          }`}
          aria-label="Enter"
        >
          Enter
        </button>

        {error !== "none" && (
          <p
            role="status"
            className="font-sans text-[11px] text-black/50 tracking-wide leading-relaxed mt-4"
          >
            {error === "name"
              ? "Please enter your name to continue."
              : "Please contact your Client Advisor to receive your exclusive access key."}
          </p>
        )}
      </form>
    </div>
  );
}
