import type { Metadata, Viewport } from "next";
import "./globals.css";
import AdobeLaunch from "@/components/AdobeLaunch";
import { WishlistProvider } from "@/context/WishlistContext";

// Dominio ufficiale di produzione. Open Graph e canonical richiedono URL
// assoluti: metadataBase deve puntare qui, cosi' og:image, og:url e canonical
// vengono risolti su questo host.
const siteUrl = "https://reverie.valentino.com";

const title = "Valentino Rêverie";
const description = "A world of exceptional beauty, extraordinary creations and masterful craft.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  // Canonical sulla radice del dominio ufficiale (risolto su metadataBase).
  alternates: {
    canonical: "/",
  },
  // Esperienza privata ad accesso riservato: non deve essere indicizzata dai
  // motori di ricerca.
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title,
    description,
    siteName: title,
    // Risolto su metadataBase -> https://reverie.valentino.com/
    url: "/",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/Img_Valentino_Gowns_Whatsapp.jpg",
        width: 1200,
        height: 630,
        alt: title,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/Img_Valentino_Gowns_Whatsapp.jpg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* La libreria Adobe Launch va inclusa in tutte le pagine del sito,
          quindi sta nel layout radice e non nelle singole schermate. */}
      <AdobeLaunch />
      <body className="antialiased bg-white text-black">
        <WishlistProvider>{children}</WishlistProvider>
      </body>
    </html>
  );
}
