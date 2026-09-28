# Gowns De Rêve

Catalogo navigabile della collezione Valentino Gowns, con tracking Adobe Launch
e sfoglio del Gowns Book a pagina singola.

Ricostruzione fedele di `valentino-objet-de-reve-main`: stesso design, stesso
copy, stessi asset, stesse animazioni e stessa navigazione. Il progetto e'
autonomo, non condivide file ne' configurazioni con l'originale.

## Avvio

Prerequisiti: Node.js 18 o successivo.

```bash
npm install
npm run dev
```

Il sito parte su [http://localhost:3000](http://localhost:3000).

Chiave di accesso della schermata iniziale: `valentino2026`.

## Build

```bash
npm run build
```

Produce la cartella `out/`, pronta per un hosting statico
(`output: 'export'` in `next.config.js`).

```bash
npm run lint
```

## Deploy su hosting statico

`out/` non contiene codice server: si pubblica cosi' com'e' su un bucket S3, su
CloudFront o su Vercel.

Un punto merita attenzione, perche' e' la differenza fra le piattaforme.
L'export produce file piatti, `index.html` e `cookie-policy.html`. Vercel
tollera l'assenza dell'estensione e risolve `/cookie-policy` da se'; un bucket
S3 no, e nemmeno CloudFront con accesso OAC: un indirizzo senza estensione
risponde 404. Per questo il collegamento all'informativa punta al file,
`/cookie-policy.html`, che e' l'unica forma valida su tutte e tre. La prova 11
di `qa/verify_tracking.py` lo verifica, quindi la regressione non passa
inosservata.

Impostazioni del bucket:

| Voce | Valore |
|---|---|
| Documento indice | `index.html` |
| Documento di errore | `404.html` |
| Cache di `/_next/static/**` | `public, max-age=31536000, immutable` (i nomi contengono un'impronta) |
| Cache dei file `.html` | `no-cache` (altrimenti gli aggiornamenti non arrivano) |
| HTTPS | serve CloudFront: l'endpoint website di S3 e' solo HTTP |

`aws s3 sync out/ s3://<bucket>/ --delete` assegna correttamente i tipi MIME
dalle estensioni. Con altri strumenti va controllato che `.js` e `.css` non
finiscano come `binary/octet-stream`, perche' i browser rifiutano gli script con
tipo dichiarato sbagliato.

I due video pesano 14 MB e 29 MB: CloudFront davanti al bucket evita che ogni
visitatore li scarichi dall'origine. S3 supporta le richieste con intervallo,
quindi lo scorrimento del video funziona in entrambi i casi.

Le variabili `NEXT_PUBLIC_*` vengono incorporate al momento della build, non
lette a runtime: serve una build per ambiente.

### Nota sulla riservatezza

La chiave di accesso e' verificata nel browser e si trova in chiaro nel bundle;
le fotografie sono raggiungibili ai loro indirizzi diretti senza passare dalla
schermata iniziale. La schermata di accesso e' quindi una soglia scenica, non
una protezione. Se la collezione deve restare riservata fino alla
presentazione, la restrizione va messa a livello di distribuzione, per esempio
CloudFront con URL firmati oppure autenticazione su una funzione al bordo.

## Struttura

```
GOWNS-DE-REVE/
├── docs/
│   └── tracking-map.md          # requisito -> codice -> prova, con gli esiti
├── public/
│   ├── images/                  # 530 fotografie prodotto + sfondo del menu
│   ├── fonts/                   # DIN Pro Regular e Medium
│   ├── video/                   # introduzione e video in loop
│   └── savoir-faire/            # immagini e video della sezione editoriale
├── qa/                          # verifiche, non fanno parte della build
│   ├── verify_tracking.py       # prove funzionali e analytics su browser
│   └── gown-names.ts            # controllo dei nomi su tutto il catalogo
├── scripts/                     # utilita' PowerShell per gli asset
└── src/
    ├── analytics/               # tutto il tracking, isolato dalla grafica
    │   ├── config.ts            # librerie Launch e scelta dell'ambiente
    │   ├── normalize.ts         # regole sui valori del capitolo 1 del manuale
    │   ├── glossary.ts          # traduzione dei nomi prodotto in inglese
    │   ├── pages.ts             # page_name e page_type di ogni schermata
    │   ├── events.ts            # nomi degli eventi di interazione
    │   ├── satellite.ts         # ponte verso _satellite, con coda
    │   ├── track.ts             # trackPageView e trackCustomEvent
    │   ├── usePageView.ts       # un page_view per cambio schermata
    │   └── useTrackedWishlist.ts# preferiti con i relativi eventi
    ├── app/
    │   ├── layout.tsx           # metadata, libreria Launch, provider
    │   ├── page.tsx             # macchina a stati dell'esperienza
    │   ├── globals.css          # tipografia, animazioni, sfoglio
    │   └── cookie-policy/       # informativa, non protetta da chiave
    ├── components/
    │   ├── AdobeLaunch.tsx      # tag della libreria dentro head
    │   ├── MenuScreen.tsx       # saluto e tre voci di menu
    │   ├── SavoirFairePage.tsx  # articolo editoriale con slider
    │   ├── GridView.tsx         # Gowns Closet, griglia
    │   ├── GownPanel.tsx        # una creazione: galleria e scheda
    │   ├── GownsBookView.tsx    # Gowns Book, sfoglio a pagina singola
    │   ├── usePageFlip.ts       # stato del giro di pagina e gesti
    │   ├── ImmersiveView.tsx    # scheda dal Gowns Closet, con dissolvenza
    │   ├── GownNavPill.tsx      # comandi avanti e indietro
    │   ├── WishlistView.tsx     # preferiti e condivisione
    │   ├── SharedWishlistView.tsx
    │   ├── Header.tsx
    │   ├── CookieFooter.tsx
    │   └── VideoIntro.tsx
    ├── context/
    │   └── WishlistContext.tsx  # selezione in localStorage, massimo 50
    └── data/
        └── products.ts          # 122 creazioni e percorsi delle immagini
```

## Tracking Adobe Launch

L'implementazione segue il manuale
`Valentino - Gown Experience - Adobe Launch Implementation Manual v1.0.pdf` e le
regole raccolte in `.kiro/steering/tracking-gowns.md`.

Tutto il tracking vive in `src/analytics/`. I componenti chiamano solo
`trackPageView`, `trackCustomEvent` e `useTrackedWishlist`: nessuna schermata
conosce Adobe Launch ne' la forma del data layer.

### Scelta della libreria

La regola, in una riga: `next build` imposta `NODE_ENV` a `production`, quindi
**ogni build di rilascio include la libreria di produzione**, in locale come su
Vercel, in produzione come in anteprima. Solo `next dev` usa quella di sviluppo.

Per il collaudo della produzione non serve percio' impostare nulla.

La variabile serve unicamente a deviare da questo comportamento, per esempio
per far puntare un deploy di collaudo alla libreria di sviluppo:

```bash
# .env.local
NEXT_PUBLIC_ADOBE_LAUNCH_ENV=development
```

Sono ammessi solo `development` e `production`. Spazi e maiuscole vengono
ignorati; qualsiasi altro valore lascia decidere a `NODE_ENV` e stampa un
avviso nel registro della build, cosi' un errore di battitura non passa
inosservato.

Per vedere in console ogni chiamata inviata:

```bash
NEXT_PUBLIC_ANALYTICS_DEBUG=true
```

Aggiunge solo una riga di registro per chiamata, non cambia cosa viene
spedito. Va rimossa prima del rilascio, altrimenti stampa anche ai visitatori.

### Verifica manuale

Il metodo indicato dal capitolo 5 del manuale: `_satellite.track` non implica
l'invio diretto ad Adobe Analytics, quindi i debugger lato raccolta non sono
attendibili. Si procede cosi':

1. aprire il pannello Sources del browser sulla schermata da controllare;
2. mettere un punto di interruzione sulla funzione `_satellite.track` dentro la
   libreria Adobe Launch;
3. eseguire l'interazione e leggere i dati passati alla funzione.

### Verifica automatica

Le stesse chiamate si possono osservare senza intervento manuale. Serve Python
con Playwright:

```bash
pip install playwright
python -m playwright install chromium

npm run build
python qa/verify_tracking.py
```

Lo strumento serve la cartella `out/`, sostituisce la libreria Launch con uno
`_satellite` che registra ogni chiamata, percorre i flussi e confronta i
payload. Copre pagine, eventi, doppioni, navigazione avanti e indietro,
ricaricamento, selezione condivisa, animazioni ridotte, gesti su mobile e
caricamento degli asset.

Controllo dei nomi prodotto su tutto il catalogo:

```bash
node node_modules/typescript/bin/tsc -p qa/tsconfig.json
node qa/js/qa/gown-names.js
```

Gli esiti dell'ultima esecuzione sono riportati in `docs/tracking-map.md`.

## Sfoglio del Gowns Book

Una creazione per pagina, incernierata sul bordo interno sinistro. La pagina si
solleva verso chi guarda fino a mettersi di taglio, poi al suo posto sale da
dietro la pagina seguente: a ogni istante e' visibile una pagina sola, senza
doppia pagina e senza sovrapposizioni.

Si sfoglia con i pulsanti in basso, con le frecce della tastiera e trascinando
la pagina con il dito o con il mouse. Il trascinamento verticale resta a
disposizione dello scorrimento della galleria. Chi ha chiesto al sistema di
ridurre le animazioni cambia pagina senza rotazione.

Rotazione e ombra derivano da un unico valore di avanzamento da 0 a 1
(`usePageFlip`), condiviso fra trascinamento e animazione dei pulsanti: non
possono desincronizzarsi.

La scheda raggiunta dal Gowns Closet conserva la dissolvenza del progetto
originale: lo sfoglio appartiene al Gowns Book.

## Note

- Export statico: `output: 'export'`, immagini non ottimizzate.
- La selezione dei preferiti sta in `localStorage`, chiave
  `gowns-de-reve-wishlist`, massimo 50 creazioni.
- Un link `?selection=SKU,SKU` apre la schermata della selezione condivisa. Il
  sito legge quei link ma non ha un comando per generarli, come nel progetto
  originale.
- La Cookie Policy non e' protetta da chiave di accesso: un'informativa deve
  restare consultabile.
- Il testo della Cookie Policy e' riportato alla lettera dal documento
  approvato e non va riscritto.
