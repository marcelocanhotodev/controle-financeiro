"use client";

import { useEffect } from "react";

// Registra public/sw.js só no build de produção — em `next dev`, um service
// worker guardando arquivos atrapalharia o hot reload.
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sem service worker o app funciona normalmente, só não tem a tela offline.
    });
  }, []);

  return null;
}
