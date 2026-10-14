import { Abas } from "./abas";

// Casca das telas internas (capability estrutura-app, Requirements
// "Navegação por seções" e "Barra superior"). Mesma estrutura do protótipo:
// barra superior, abas e conteúdo, numa coluna de até 1080 px com margem
// lateral de 16 px (Requirement "Layout responsivo").
//
// Change estrutura-base: o topo só tem o nome do app. O seletor de grupo, a
// pessoa e o botão "Sair" chegam em usuarios-e-grupos.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-app px-4 pb-14 pt-3.5">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 pb-3.5">
        <div className="font-display text-[1.3rem] font-bold text-destaque">Caixa Comum</div>
      </header>
      <Abas />
      <main>{children}</main>
    </div>
  );
}
