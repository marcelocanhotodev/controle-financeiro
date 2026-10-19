"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Troca parâmetros da URL da aba sem recarregar a página: o Server Component
 * relê os filtros e devolve a lista nova. Valor vazio remove o parâmetro. */
export function useTrocarParametros() {
  const router = useRouter();
  const pathname = usePathname();
  const parametros = useSearchParams();

  return (mudancas: Record<string, string>) => {
    const novos = new URLSearchParams(parametros.toString());
    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor) novos.set(chave, valor);
      else novos.delete(chave);
    }
    const query = novos.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };
}
