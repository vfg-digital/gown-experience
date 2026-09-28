# Mappatura del tracking

Corrispondenza fra i requisiti del manuale Adobe Launch, le regole fissate nel
file di steering `tracking-gowns`, il punto del codice che le realizza e la
prova che le verifica.

Fonti:

- `Valentino - Gown Experience - Adobe Launch Implementation Manual v1.0.pdf`
- `.kiro/steering/tracking-gowns.md`

Verifiche:

- `qa/verify_tracking.py` guida un browser reale sul sito esportato, con uno
  `_satellite` finto che registra ogni chiamata. E' il metodo di verifica del
  manuale (osservare la chiamata a `_satellite.track`) reso automatico.
- `qa/gown-names.ts` applica traduzione e normalizzazione a tutte le 122
  creazioni del catalogo e controlla ogni valore prodotto.

Esito complessivo dell'ultima esecuzione: **114 controlli su 114 superati** per
`verify_tracking.py`, **tutti superati** per `gown-names.ts`.

Tre segnaposto del manuale non hanno una schermata a cui agganciarsi
(`gowns book:listing page`, `savoire-faire:[PAGE TITLE]`,
`gowns_favourite_share`): le costanti restano definite, nessuna interfaccia e'
stata inventata per riempirle. Il dettaglio e' nelle note in fondo.

## Integrazione della libreria

| Requisito (manuale) | Regola in tracking-gowns | Dove | Innesco | Atteso | Prova | Esito |
|---|---|---|---|---|---|---|
| §2.1.1 libreria di sviluppo e UAT | URL della build development | `src/analytics/config.ts` `LAUNCH_LIBRARY.development` | `NEXT_PUBLIC_ADOBE_LAUNCH_ENV=development` oppure `NODE_ENV!=production` | `launch-90977567bd4f-development.min.js` | scelta per ambiente, non per hostname | build di sviluppo: risolta da `resolveLaunchEnvironment` |
| §2.1.2 libreria di produzione | URL della build di produzione | `src/analytics/config.ts` `LAUNCH_LIBRARY.production` | build di produzione | `launch-e9ba9503dd03.min.js` | 1. `build di produzione nell'export` | superato |
| §2.1 tag `async` prima della chiusura di `head`, su tutte le pagine | libreria nel layout radice | `src/components/AdobeLaunch.tsx`, incluso in `src/app/layout.tsx` | ogni pagina | `<script src="..." async>` dentro `<head>` | 1. `libreria Launch presente nella head`, `tag con async`, `genitore del tag` | superato |
| §2.1 libreria caricata in modo asincrono | chiamate protette da una coda | `src/analytics/satellite.ts` | `_satellite` non ancora disponibile | la chiamata viene accodata e recapitata all'arrivo della libreria | 2. `il page_view in coda viene recapitato`, `page_name conservato` | superato |

## Pagine

| Requisito (manuale) | Regola in tracking-gowns | Dove | Innesco | Payload atteso | Prova | Esito |
|---|---|---|---|---|---|---|
| §4.1 Login Page | `V:gowns:login` / `landing` | `src/app/page.tsx`, stato `locked` | apertura del sito | `{page_name:'V:gowns:login', page_type:'landing', page_language:'en'}` | 1. `un solo page_view all'ingresso`, `page_name`, `page_type`, `page_language` | superato |
| §4.2 Welcome Page | `V:gowns:welcome` / `welcome` | `src/app/page.tsx`, stato `menu` | fine o salto del video di introduzione, e ogni ritorno al menu | `{page_name:'V:gowns:welcome', page_type:'welcome', page_language:'en'}` | 4. `page_view del menu`, `page_type del menu`; 6. `ritorno al menu tracciato` | superato |
| §4.3 Gowns Book, Listing Page | `V:gowns:gowns book:listing page` / `gowns book` | costante `PAGE_NAMES.gownsBookListing`, non agganciata | nessuno | nessuno | nessuna: la schermata non esiste nel progetto | **non applicabile**, vedi note |
| §4.3 Gowns Book, Detail Page | `V:gowns:gowns book:[GOWN NAME]` / `gowns detail` + `product_name`, `product_id` | `src/components/GownsBookView.tsx` -> `buildGownDetailPageView(..., 'gowns-book')` | ingresso dal menu e ogni pagina sfogliata | `{page_name:'V:gowns:gowns book:<gown>', page_type:'gowns detail', page_language:'en', product_name:'<gown>', product_id:'<SKU>'}` | 4. `scheda nel ramo del Gowns Book`, `page_type della scheda`, `product_name coerente con page_name`, `product_id valorizzato`, `product_name normalizzato` | superato |
| §4.4 Gowns Closet, Listing Page | `V:gowns:gowns closet:listing page` / `gowns closet` | `src/components/GridView.tsx` | voce GOWNS CLOSET del menu | `{page_name:'V:gowns:gowns closet:listing page', page_type:'gowns closet', page_language:'en'}` | 6. `un solo page_view della griglia`, `page_name della griglia`, `page_type della griglia` | superato |
| §4.4 Gowns Closet, Detail Page | `V:gowns:gowns closet:[DETAIL NAME]` / `gowns detail` + `product_name`, `product_id` | `src/components/ImmersiveView.tsx` -> `buildGownDetailPageView(..., 'gowns-closet')` | tocco su una card della griglia o su una scheda dei preferiti | `{page_name:'V:gowns:gowns closet:<gown>', page_type:'gowns detail', page_language:'en', product_name:'<gown>', product_id:'<SKU>'}` | 6. `scheda nel ramo del Gowns Closet`, `page_type della scheda`, `scheda con dati prodotto` | superato |
| §4.5 Savoire-Faire, Listing Page | `V:gowns:savoire-faire:listing page` / `savoire-faire` | `src/components/SavoirFairePage.tsx` | voce SAVOIR-FAIRE del menu | `{page_name:'V:gowns:savoire-faire:listing page', page_type:'savoire-faire', page_language:'en'}` | 6. `page_name di Savoir-Faire`, `page_type di Savoir-Faire` | superato |
| §4.5 Savoire-Faire, Detail Page | `V:gowns:savoire-faire:[PAGE TITLE]` / `savoire-faire` | costante `PAGE_NAMES.savoirFaireDetail`, non agganciata | nessuno | nessuno | nessuna: la sezione e' un unico articolo | **non applicabile**, vedi note |
| §4.6 Favourite List, Listing Page | `V:gowns:favourite:listing page` / `favourite` | `src/components/WishlistView.tsx` | stella nell'intestazione | `{page_name:'V:gowns:favourite:listing page', page_type:'favourite', page_language:'en'}` | 5. `un solo page_view dei preferiti`, `page_name dei preferiti`, `page_type dei preferiti` | superato |
| §4.6 Shared Favourite Page raggiungibile | lettura di `?selection=SKU,SKU` | `src/app/page.tsx` | apertura di un link di selezione | vedi riga successiva | 7. tutte le prove sulla selezione condivisa | superato |
| §4.6 Shared Favourite Page | `V:gowns:favourite:shared page` / `favourite` | `src/components/SharedWishlistView.tsx` | apertura di un link `?selection=SKU,SKU` | `{page_name:'V:gowns:favourite:shared page', page_type:'favourite', page_language:'en'}` | 7. `un solo page_view`, `page_name della selezione condivisa`, `page_type`, `nessun page_view di accesso attribuito per errore` | superato |

## Eventi di interazione

| Requisito (manuale) | Regola in tracking-gowns | Dove | Innesco | Payload atteso | Prova | Esito |
|---|---|---|---|---|---|---|
| §4.1 accesso riuscito | `gowns_login` | `AccessOverlay` in `src/app/page.tsx` | chiave di accesso corretta, una volta sola per accesso | `{event:'gowns_login'}` | 3. `chiave corretta, un solo evento` (con doppio invio ravvicinato) | superato |
| §4.1 accesso rifiutato | `gowns_login_ko` | `AccessOverlay` in `src/app/page.tsx` | chiave di accesso errata | `{event:'gowns_login_ko'}` | 3. `chiave errata`, `nome mancante non genera eventi` | superato |
| §4.3 aggiunta ai preferiti | `gowns_favourite_add` | `src/analytics/useTrackedWishlist.ts`, usato da `GownPanel` | tocco su "Treasure this creation" | `{event:'gowns_favourite_add'}` | 5. `aggiunta ai preferiti` | superato |
| §4.3 rimozione dai preferiti | `gowns_favourite_remove` | `src/analytics/useTrackedWishlist.ts`, usato da `GownPanel` e da `WishlistView` | tocco su "Treasured" nella scheda, oppure sulla X nell'elenco dei preferiti | `{event:'gowns_favourite_remove'}` | 5. `rimozione dai preferiti`, `rimozione dalla scheda dei preferiti` | superato |
| §4.6 condivisione della selezione | `gowns_favourite_share` | costante `CUSTOM_EVENTS.favouriteShare`, non agganciata | nessuno | nessuno | 5. `nessun comando di condivisione aggiunto` | **non applicabile**, vedi note |

## Regole sui valori

| Requisito (manuale) | Regola in tracking-gowns | Dove | Verifica | Prova | Esito |
|---|---|---|---|---|---|
| §1.1 solo ASCII, vietati apici, virgolette, `\n \r \t`, due punti, virgola, caratteri HTML | `normalizeValue` | `src/analytics/normalize.ts` | ogni valore descrittivo | `gown-names.ts`: nessun carattere vietato, nessun carattere fuori ASCII su 122 creazioni | superato |
| §1.2 minuscolo, spazi sostituiti da underscore | `normalizeValue` | `src/analytics/normalize.ts` | ogni valore descrittivo | `gown-names.ts`: nessuna maiuscola, nessuno spazio residuo; 4. `product_name normalizzato` | superato |
| §1.2 identificativi tecnici | `normalizeIdentifier` conserva le maiuscole | `src/analytics/normalize.ts` | `product_id` | `gown-names.ts`: `product_id` identico al codice di catalogo | superato |
| §1.4 valori in inglese | glossario di 13 regole | `src/analytics/glossary.ts` | descrizioni prodotto | `gown-names.ts`: nessun termine italiano residuo fra 15 cercati | superato |
| §4 `page_language` su tutte le pagine | `resolvePageLanguage` | `src/analytics/normalize.ts` | attributo `lang` del documento | 1. `page_language`; presente in tutti i payload verificati | superato |
| §4 nessun valore incoerente | `compact` rimuove i campi vuoti | `src/analytics/track.ts` | payload | 1. `nessun campo prodotto sulla pagina di accesso` | superato |
| §4 due punti solo come separatore di livello in `page_name` | `normalizeFixedSegment` + `buildPageName` | `src/analytics/pages.ts` | `page_name` | tutti i controlli su `page_name` nelle tabelle sopra | superato |

## Comportamenti trasversali

| Requisito | Dove | Prova | Esito |
|---|---|---|---|
| Un evento per interazione, nessun doppione | `usePageView` confronta il contenuto del payload; `useTrackedWishlist` emette nel punto in cui la selezione cambia; guardia `granted` sull'accesso | 4. `un solo page_view per pagina girata`, `quattro pagine girate, quattro page_view`, `nessun page_view ripetuto`; 3. `chiave corretta, un solo evento` | superato |
| Nessun evento a meta' transizione | `onSettle` di `usePageFlip` notifica solo a pagina ferma | 4. `nessun page_view a meta' giro` | superato |
| Ritorno indietro e avanti del browser | `history.pushState` con `appState`, `viewMode` e `detailOrigin`; `popstate` li ripristina | 6. `indietro: un solo page_view`, `indietro riporta alla griglia` | superato |
| Ricaricamento della pagina | nessuno stato di tracking persistito | 8. `dopo il ricaricamento un solo page_view`, `si riparte dall'accesso` | superato |
| Ritorno su una schermata gia' vista | il confronto e' sul payload consecutivo, non sulla cronologia | 6. `ritorno al menu tracciato` | superato |
| Link di selezione condivisa senza visita all'accesso | `sessionResolved` sospende il primo invio | 7. `nessun page_view di accesso attribuito per errore` | superato |
| Nessun errore in console | | controllo in tutte le prove tranne la 2 e la 8 | superato |
| Nessuna risorsa mancante | | controllo in tutte le prove tranne la 2 e la 8 | superato |
| Desktop e mobile | | prove 1-9, 11 e 12 a 1280x900, prova 10 a 390x844 con gesto di mouse e di dito | superato |
| Informativa raggiungibile su hosting statico puro | collegamento al file esportato, `/cookie-policy.html` | 11. tutte le prove sulla Cookie Policy | superato |

## Sfoglio del Gowns Book

Il manuale non prevede alcun evento per lo sfoglio, quindi non ne e' stato
inventato: girare la pagina porta a un'altra creazione, e viene registrato con
il `page_view` di scheda previsto dal §4.3.

| Requisito della richiesta | Dove | Prova | Esito |
|---|---|---|---|
| Una sola pagina alla volta, nessuna doppia pagina | `leavingPage` e `arrivingPage` in `GownsBookView.tsx` | 4. `in nessun fotogramma si vedono due pagine insieme` su 48 fotogrammi | superato |
| Rotazione realistica con prospettiva | `.flip-stage`, `.flip-leaf` in `globals.css` | 4. `trasformazione tridimensionale in corso`, `cerniera sul bordo interno sinistro`, `la pagina si scorcia ruotando`, `prospettiva impostata sul palco` | superato |
| Ombra che segue la piega | `.flip-shade`, opacita' pari al seno dell'angolo | 4. `ombra proporzionale al giro` | superato |
| Avanti e indietro | `goNext`, `goPrev` | 4. `un solo page_view tornando indietro`, `si torna sulla creazione di partenza` | superato |
| Pulsanti, tastiera, trascinamento | `GownNavPill`, `keydown`, `dragHandlers` | 4. `freccia destra: un solo page_view`; 10. `il trascinamento gira una sola pagina`, `gesto con il dito: una sola pagina girata` | superato |
| Nessuna sovrapposizione, nessun salto di impaginazione | fondo opaco su `.flip-face`, `overflow: hidden` sul palco | 4. `nulla sborda dal palco`, `a giro concluso nessuna pagina resta sospesa` | superato |
| Contenuto leggibile durante e dopo | opacita' piena, nessuna sfocatura | 10. `il contenuto resta leggibile dopo il gesto` | superato |
| Lo scorrimento verticale resta possibile | `touch-action: pan-y`, priorita' al gesto verticale | 10. `il gesto verticale non sfoglia` | superato |
| Stato e posizione coerenti | `leafScrollTop`, chiavi di strato per codice creazione | 10. `nessuna pagina resta a mezz'aria`, `trascinamento annullato: nessun evento` | superato |
| Alternativa per `prefers-reduced-motion` | `usePrefersReducedMotion` in `usePageFlip.ts` | 9. `cambio pagina immediato, un solo page_view`, `nessuna pagina in rotazione a schermo` | superato |

## Note e scostamenti

1. **`V:gowns:gowns book:listing page` e `V:gowns:savoire-faire:[PAGE TITLE]`
   non sono agganciati.** Il progetto non ha un indice del Gowns Book ne' un
   elenco di articoli Savoir-Faire: dal menu si entra direttamente nella prima
   creazione del libro e nell'unico articolo. Le costanti restano definite in
   `pages.ts`, pronte all'uso se quelle schermate verranno aggiunte. Non e'
   stata inventata alcuna interfaccia per riempirle.

2. **`gowns_favourite_share` non e' agganciato.** Il manuale lo prevede al tocco
   del comando di condivisione della lista preferiti, ma quel comando non
   esiste nell'esperienza e non e' stato aggiunto: l'interfaccia resta quella
   del progetto originale. Il sito legge comunque i link
   `?selection=SKU,SKU` e apre la schermata della selezione condivisa, quindi
   il flusso e' completo dal lato di chi riceve il link, non da quello di chi
   lo genera. Il nome dell'evento resta definito in `events.ts`: se il comando
   verra' introdotto bastera' emetterlo al suo tocco, senza altre modifiche.

3. **`[GOWN NAME]` non contiene il colore.** Il manuale usa lo stesso
   segnaposto in `page_name` e in `product_name`, quindi i due campi portano lo
   stesso valore, e il colore ha un segnaposto proprio nel glossario
   (`[COLOR DESC]`). Due creazioni dello stesso modello in colori diversi
   condividono percio' `page_name` e `product_name`, e si distinguono per
   `product_id`.

4. **`[DETAIL NAME]` e' valorizzato con il nome della creazione.** Il manuale
   non ne da' un'altra definizione e la schermata e' la stessa scheda.

5. **`product_id` conserva le maiuscole.** La regola sul minuscolo riguarda i
   valori descrittivi; il manuale porta `[SKU]` come `WB0T31NVBS13` e
   `[ERROR DETAIL]` come `INVALID_ARRAY_MAX_ITEMS`, quindi gli identificativi
   restano nella forma del catalogo. Abbassarli di caso ne impedirebbe
   l'incrocio con i dati prodotto.

6. **`gowns_login_ko` non scatta se manca il nome.** Il controllo sul nome
   precede l'invio della chiave: non c'e' stato alcun tentativo di accesso.

7. **Due errori di battitura del catalogo sono corretti nel valore inviato.**
   "Abito lunro" e "Abtio lungo" diventano `long_gown`. Il testo mostrato a
   schermo resta quello approvato per il catalogo.

8. **I segnaposto `[COLOR DESC]`, `[ERROR ...]`, `[ITEM ID]` non sono usati.**
   Nessuna delle pagine del §4 li prevede nel proprio data layer e il progetto
   non ha moduli, pagamenti o gallerie con identificativo di asset.

9. **Verifica in ambiente locale.** Nelle prove la libreria Adobe Launch non e'
   raggiungibile e al suo posto c'e' uno `_satellite` finto. Cio' che si
   verifica e' che la funzione venga chiamata con il payload giusto, che e'
   esattamente il criterio indicato dal capitolo 5 del manuale. L'arrivo dei
   dati in Adobe Analytics dipende dalla configurazione della property e va
   controllato da BitBang.
