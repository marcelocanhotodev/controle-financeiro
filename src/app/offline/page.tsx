import type { Metadata } from "next";

// Tela de "sem conexão" (capability estrutura-app, Requirement "Instalação
// como app", Scenario "Sem conexão"). O service worker (public/sw.js) guarda
// esta página e os arquivos dela na instalação e a mostra no lugar de
// qualquer página quando o aparelho está sem internet.
export const metadata: Metadata = { title: "Sem conexão · Caixa Comum" };

export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-app px-4 pb-14 pt-3.5">
      <header className="pb-3.5">
        <div className="font-display text-[1.3rem] font-bold text-destaque">Caixa Comum</div>
      </header>
      <main className="flex flex-col gap-4">
        <h1 className="text-2xl">Sem conexão</h1>
        <div className="quadro">
          <p>É preciso conexão com a internet para ver e registrar lançamentos.</p>
          <p className="mt-2 text-suave">Confira o Wi-Fi ou os dados móveis e tente de novo.</p>
        </div>
      </main>
    </div>
  );
}
