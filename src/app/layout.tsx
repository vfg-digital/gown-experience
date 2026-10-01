import type { Metadata, Viewport } from "next";
import "./globals.css";
import AdobeLaunch from "@/components/AdobeLaunch";
import { WishlistProvider } from "@/context/WishlistContext";

// Open Graph richiede URL assoluti: metadataBase deve puntare al dominio reale
// del deploy (progetto Vercel "gown-project"), altrimenti l'og:image viene
// risolto su un host che non serve l'immagine e la preview resta senza foto.
const siteUrl = "https://gown-project.vercel.app";

const title = "Valentino Rêverie";
const description = "A world of exceptional beauty, extraordinary creations and masterful craft.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title,
    description,
    siteName: title,
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
