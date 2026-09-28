/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Ogni rotta diventa una cartella con il suo index.html
  // (out/cookie-policy/index.html invece di out/cookie-policy.html).
  //
  // E' la forma che va bene su tutti gli hosting statici: Vercel serve
  // /cookie-policy/ e non servirebbe /cookie-policy.html, un bucket S3 risolve
  // la cartella con il documento indice e non risolverebbe un indirizzo senza
  // estensione. Con i file piatti nessuna singola forma andava bene su
  // entrambi.
  trailingSlash: true,
};

module.exports = nextConfig;
