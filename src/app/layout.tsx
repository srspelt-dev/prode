import type { Metadata, Viewport } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <ServiceWorkerRegister />
        <NavBar />
        {/* pb extra en mobile para no quedar tapado por la barra inferior */}
        <main className="mx-auto max-w-3xl px-4 py-6 pb-24 sm:pb-6">
          {children}
        </main>
      </body>
    </html>
  );
}
