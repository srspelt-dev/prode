"use client";

import { useEffect } from "react";

// Registra el service worker para habilitar la instalación como PWA.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* sin SW la app igual funciona, solo no se instala */
      });
    }
  }, []);
  return null;
}
