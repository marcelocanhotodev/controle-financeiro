"use client";

import { AvisoProvider } from "@/components/aviso";

// Provedores de contexto do lado do cliente, montados uma vez no layout
// raiz (mesmo padrão de src/app/providers.tsx do matilha-app).
export function Providers({ children }: { children: React.ReactNode }) {
  return <AvisoProvider>{children}</AvisoProvider>;
}
