"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import CookieFooter from "@/components/CookieFooter";

/**
 * Video che scarica il file solo quando sta per entrare nel viewport.
 * Evita di pesare sul caricamento iniziale della pagina: senza questo,
 * il browser scarica tutti i video subito, anche quelli dentro slider
 * che l'utente potrebbe non raggiungere mai.
 */
function LazyVideo({
  src,
  className,
  aspectRatio = "4 / 5",
}: {
  src: string;
  className?: string;
  aspectRatio?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Fallback per browser senza IntersectionObserver: carica subito
    if (typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      // Anticipa il caricamento poco prima che il video sia visibile
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full bg-black/5"
      // Riserva lo spazio prima che il video sia caricato, per evitare
      // che il layout salti quando arriva.
      style={!loaded ? { aspectRatio } : undefined}
    >
      {shouldLoad && (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className={className}
          onLoadedMetadata={() => setLoaded(true)}
        >
          <source src={src} type="video/mp4" />
        </video>
      )}
    </div>
  );
}

// Slider with peek (shows next/prev edges) and continuous progress bar
function Slider({ items }: { items: { type: "image" | "video"; src: string }[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) {
      setProgress(0);
      return;
    }
    setProgress(el.scrollLeft / maxScroll);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <div className="relative w-full">
      {/* Scrollable container with peek */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-[3px] px-4"
      >
        {items.map((item, i) => (
          <div key={i} className="w-[92%] flex-none snap-center">
            {item.type === "video" ? (
              <LazyVideo src={item.src} className="w-full h-auto block" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.src}
                alt=""
                className="w-full h-auto block"
                loading="lazy"
              />
            )}
          </div>
        ))}
      </div>

      {/* Continuous progress bar */}
      <div className="flex justify-center mt-5 px-10">
        <div className="w-full max-w-[200px] h-[2px] bg-black/15 relative overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-black transition-transform duration-100 ease-out"
            style={{
              width: `${(1 / items.length) * 100}%`,
              transform: `translateX(${progress * (items.length - 1) * 100}%)`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function SavoirFairePage() {
  const slider1Items = [
    { type: "image" as const, src: "/savoir-faire/slider1/SavoirFaire_Maison_Valentino_01.jpg" },
    { type: "image" as const, src: "/savoir-faire/slider1/SavoirFaire_Maison_Valentino_02.jpg" },
    { type: "image" as const, src: "/savoir-faire/slider1/SavoirFaire_Maison_Valentino_03.jpg" },
  ];

  return (
    <div className="min-h-screen bg-white pt-20">
      {/* Section 1: Title + Subtitle */}
      <div className="px-10 pt-12 pb-4">
        <h1 className="font-serif text-[24px] leading-none text-black mb-1">The Savoir-Faire of Valentino</h1>
        <p className="font-serif text-[20px] italic text-black">Where imagination takes form</p>
      </div>

      {/* Section 2: Text paragraph */}
      <div className="px-10 pb-8">
        <p className="font-sans text-[14px] text-black leading-[18px] font-normal">
          At the heart of Valentino lies a savoir-faire shaped by time, precision and an unwavering pursuit of beauty. Within the Maison de Couture in Rome, exceptional techniques are passed from hand to hand, evolving through generations while remaining deeply connected to their origins.
        </p>
      </div>

      {/* Section 3: Main image */}
      <div className="w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/savoir-faire/01_MainImage_SavoirFaire.jpg"
          alt="Savoir-Faire"
          className="w-full h-auto block"
          loading="lazy"
        />
      </div>

      {/* Section 4: Text paragraph */}
      <div className="px-10 py-8">
        <p className="font-sans text-[14px] text-black leading-[18px] font-normal">
          Every gesture carries this legacy forward. From the smallest detail to the most intricate construction, each creation takes form through precision, intuition and the human hand - bringing imagination to life in a way that is unmistakably Valentino.
        </p>
      </div>

      {/* Section 5: Slider 1 */}
      <div className="pb-10">
        <Slider items={slider1Items} />
      </div>

      {/* Section 6: Title + Subtitle (The Hands Behind Valentino) */}
      <div className="px-10 pt-8 pb-4">
        <h2 className="font-serif text-[24px] leading-none text-black mb-1">The Hands Behind Valentino</h2>
        <p className="font-serif text-[20px] italic text-black">Where time becomes extraordinary</p>
      </div>

      {/* Section 7: Text paragraph */}
      <div className="px-10 pb-8">
        <p className="font-sans text-[14px] text-black leading-[18px] font-normal">
          Behind every creation are the remarkable people who bring it to life. Their knowledge, precision and sensitivity are expressed through countless hours of meticulous work, where every detail is considered and every gesture has purpose. From the most intricate embroidery to the construction of a silhouette, time becomes an essential part of every creation. It is this extraordinary dedication - passed from hand to hand and generation to generation - that gives each Valentino creation its singular character.
        </p>
      </div>

      {/* Section 8: Video, spostato sotto il 3o paragrafo (The Hands Behind Valentino) */}
      <div className="w-full pb-14">
        <LazyVideo
          src="/savoir-faire/03_Video_SavoirFaire.mp4"
          className="w-full h-auto block"
        />
      </div>

      {/* px-10 per allinearsi ai blocchi di testo della pagina */}
      <CookieFooter className="px-10" />
    </div>
  );
}
