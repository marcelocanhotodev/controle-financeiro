"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

// Abas das três seções (capability estrutura-app, Requirement "Navegação por
// seções"). Cada aba é uma rota própria; a ativa recebe aria-current="page",
// como no protótipo. A lista rola na horizontal se não couber, sem empurrar a
// página (Requirement "Layout responsivo").
//
// Resumo e Lançamentos compartilham o mês (capability resumo, Requirement
// "Mês do Resumo compartilhado com Lançamentos"): os links das duas levam o
// `?mes` atual; os filtros de tipo e pessoa ficam só na aba Lançamentos.
const ABAS = [
  { href: "/resumo", rotulo: "Resumo", levaMes: true },
  { href: "/lancamentos", rotulo: "Lançamentos", levaMes: true },
  { href: "/grupo", rotulo: "Grupo", levaMes: false },
] as const;

export function Abas() {
  const pathname = usePathname();
  const mes = useSearchParams().get("mes");

  return (
    <nav aria-label="Seções" className="mb-5 flex gap-1 overflow-x-auto border-b border-linha">
      {ABAS.map((aba) => {
        const ativa = pathname === aba.href || pathname.startsWith(`${aba.href}/`);
        return (
          <Link
            key={aba.href}
            href={aba.levaMes && mes ? `${aba.href}?mes=${encodeURIComponent(mes)}` : aba.href}
            aria-current={ativa ? "page" : undefined}
            className={`-mb-px whitespace-nowrap border-b-[3px] px-4 py-2.5 font-semibold ${
              ativa ? "border-destaque text-texto" : "border-transparent text-suave hover:text-texto"
            }`}
          >
            {aba.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
