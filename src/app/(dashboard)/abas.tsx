"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Abas das três seções (capability estrutura-app, Requirement "Navegação por
// seções"). Cada aba é uma rota própria; a ativa recebe aria-current="page",
// como no protótipo. A lista rola na horizontal se não couber, sem empurrar a
// página (Requirement "Layout responsivo").
const ABAS = [
  { href: "/resumo", rotulo: "Resumo" },
  { href: "/lancamentos", rotulo: "Lançamentos" },
  { href: "/grupo", rotulo: "Grupo" },
] as const;

export function Abas() {
  const pathname = usePathname();

  return (
    <nav aria-label="Seções" className="mb-5 flex gap-1 overflow-x-auto border-b border-linha">
      {ABAS.map((aba) => {
        const ativa = pathname === aba.href || pathname.startsWith(`${aba.href}/`);
        return (
          <Link
            key={aba.href}
            href={aba.href}
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
