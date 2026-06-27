import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import Toaster from "@/components/Toaster";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "Prode Mundial 2026",
  description: "Pronosticá los partidos del Mundial con tus amigos",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Prode",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a7d2c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Evita el "flash" de tema: setea la clase dark antes de pintar.
const themeScript = `
(function(){try{
  var t = localStorage.getItem('theme');
  // Por defecto oscuro (estilo Apple Sports); solo claro si el usuario lo eligió.
  if (t !== 'light') document.documentElement.classList.add('dark');
}catch(e){}})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${inter.variable} ${outfit.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ServiceWorkerRegister />
        <Toaster />
        <NavBar />
        {/* pb extra en mobile para no quedar tapado por la barra inferior */}
        <main className="mx-auto max-w-3xl px-4 py-6 pb-24 sm:pb-6">
          {children}
        </main>
      </body>
    </html>
  );
}
