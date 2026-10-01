"use client";

import React from "react";
import CookieFooter from "@/components/CookieFooter";

interface MenuScreenProps {
  /**
   * Nome inserito all'accesso, usato solo per il saluto. Puo essere vuoto:
   * chi arriva da un link di selezione condivisa non passa dall'accesso, e in
   * quel caso si mostra la frase originale senza nome.
   */
  guestName?: string;
  onSelectSavoirFaire: () => void;
  onSelectGownsBook: () => void;
  onSelectGownsCloset: () => void;
}

export default function MenuScreen({
  guestName,
  onSelectSavoirFaire,
  onSelectGownsCloset,
}: MenuScreenProps) {
  const menuItems = [
    { label: "SAVOIR-FAIRE", action: onSelectSavoirFaire },
    { label: "GOWNS CLOSET", action: onSelectGownsCloset },
  ];

  return (
    <div className="relative min-h-[101vh] w-full">
      {/* Background image - covers entire area */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/Test_BG_Menu.jpg"
        alt=""
        className="fixed inset-0 w-full h-full object-cover"
      />

      {/* Dark overlay for readability */}
      <div className="fixed inset-0 bg-[#fff3e5]/50" />

      {/* Logo */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center h-14">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-valentino-garavani.png"
          alt="Valentino Garavani"
          width={1032}
          height={300}
          className="h-9 md:h-10 w-auto"
        />
      </header>

      {/* Content - centered vertically */}
      <div className="relative z-10 min-h-screen flex flex-col justify-center px-6 md:px-12">
        {/* Welcome text */}
        <p className="font-serif text-[20px] text-black/80 italic leading-snug mb-14 max-w-lg animate-fade-in-up">
          {guestName
            ? `Welcome ${guestName} to a world of exceptional beauty, extraordinary creations and masterful craft.`
            : "Welcome to a world of exceptional beauty, extraordinary creations and masterful craft."}
        </p>

        {/* Menu items - text left, arrow right */}
        <nav className="w-full max-w-sm">
          <ul className="space-y-6">
            {menuItems.map((item, index) => (
              <li key={item.label}>
                <button
                  onClick={item.action}
                  className={`flex items-center justify-between w-full group animate-fade-in-up`}
                  style={{ animationDelay: `${300 + index * 200}ms` }}
                >
                  <span className="font-sans font-medium text-base md:text-lg uppercase tracking-[0.2em] text-black/80 group-hover:text-black transition-colors">
                    {item.label}
                  </span>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="black"
                    strokeWidth="2.2"
                    className="opacity-100"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Ancorato in fondo alla prima schermata, non a 101vh, altrimenti
            resterebbe appena sotto il bordo visibile.
            Il rientro va ripetuto qui: un elemento ancorato non eredita il
            px-6 del contenitore, e senza questo il link finisce a filo del
            bordo sinistro mentre le voci del menu restano rientrate. */}
        <CookieFooter variant="overlay" className="px-6 md:px-12" />
      </div>
    </div>
  );
}
