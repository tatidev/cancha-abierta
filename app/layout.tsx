import type { Metadata, Viewport } from "next";
import "./globals.css";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://cancha-abierta-opal.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Cancha Abierta • Torneo de Pádel Americano",
    template: "%s | Cancha Abierta",
  },
  description:
    "Seguimiento en vivo, tabla de posiciones, resultados y asignación de canchas en tiempo real.",
  applicationName: "Cancha Abierta",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "Cancha Abierta • Torneo de Pádel en Vivo",
    description:
      "Sigue en vivo los partidos, resultados y la tabla de posiciones del torneo americano.",
    url: appUrl,
    siteName: "Cancha Abierta",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 675,
        alt: "Cancha Abierta - Torneo de Pádel en Vivo",
      },
    ],
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cancha Abierta • Torneo de Pádel en Vivo",
    description:
      "Sigue en vivo los partidos, resultados y la tabla de posiciones del torneo americano.",
    images: ["/og-image.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
