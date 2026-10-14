import { notFound } from "next/navigation";
import { Campo } from "@/components/campo";

// Página de exemplo do padrão de campos, usada só pelo teste
// e2e/acessibilidade.spec.ts enquanto nenhum formulário real existe. Só
// responde com PAGINAS_DE_TESTE=1 (ver playwright.config.ts).
export const dynamic = "force-dynamic";

export default function TesteFormularioPage() {
  if (process.env.PAGINAS_DE_TESTE !== "1") notFound();

  return (
    <main className="mx-auto flex max-w-app flex-col gap-3.5 px-4 py-6">
      <h1 className="text-2xl">Formulário de exemplo</h1>
      <Campo rotulo="Descrição" dica="Ex.: Mercado da semana">
        {(props) => <input type="text" name="descricao" {...props} />}
      </Campo>
      <Campo rotulo="Valor" erro="Informe um valor maior que zero, como 125,90.">
        {(props) => <input type="text" name="valor" inputMode="decimal" {...props} />}
      </Campo>
      <Campo rotulo="Categoria">
        {(props) => (
          <select name="categoria" {...props}>
            <option>Mercado</option>
          </select>
        )}
      </Campo>
      <button type="button" aria-label="Excluir Mercado da semana" className="self-start rounded-lg p-2">
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16">
          <path d="M3 4h10M6 4V2h4v2M5 4l1 10h4l1-10" fill="none" stroke="currentColor" />
        </svg>
      </button>
    </main>
  );
}
