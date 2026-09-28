/**
 * Eventi di interazione previsti dal manuale Adobe Launch.
 *
 * Sono gli unici nomi ammessi: il manuale non prevede altri eventi per la
 * Gown Experience, quindi nessuna interazione aggiuntiva del sito (sfoglio,
 * apertura di uno slider, cambio vista) va inventata come custom_event. Lo
 * sfoglio del Gowns Book porta a una creazione diversa, ed e' quindi tracciato
 * con un page_view di scheda, non con un evento nuovo.
 */
export const CUSTOM_EVENTS = {
  /** Chiave di accesso corretta, l'utente entra nel sito. */
  login: "gowns_login",
  /** Chiave di accesso rifiutata. */
  loginError: "gowns_login_ko",
  /** Creazione aggiunta ai preferiti. */
  favouriteAdd: "gowns_favourite_add",
  /** Creazione rimossa dai preferiti. */
  favouriteRemove: "gowns_favourite_remove",
  /**
   * Condivisione della propria selezione di preferiti.
   *
   * Nome definito ma non ancora agganciato: la schermata dei preferiti non ha
   * un comando di condivisione, e non e' stato aggiunto perche' non fa parte
   * dell'esperienza. Il sito sa comunque aprire un link di selezione condivisa
   * (?selection=SKU,SKU), quindi se il comando verra' introdotto bastera'
   * emettere questo evento al suo tocco.
   */
  favouriteShare: "gowns_favourite_share",
} as const;

export type CustomEventName = (typeof CUSTOM_EVENTS)[keyof typeof CUSTOM_EVENTS];
