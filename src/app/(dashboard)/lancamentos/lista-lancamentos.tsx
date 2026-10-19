"use client";

// Lista do mês (capability lancamentos, Requirements "Lista de lançamentos do
// mês", "Totais da lista", "Exclusão de lançamento" e "Desfazer exclusão"),
// no visual do `.list` / `.row` do protótipo. Lista e totais chegam prontos
// do servidor, já filtrados; aqui só se exibe e se exclui.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAviso } from "@/components/aviso";
import { excluirLancamento, restaurarLancamento } from "@/lib/actions/lancamento";
import { formatarReais } from "@/lib/format/moeda";
import type { LinhaLancamento } from "@/lib/lancamentos";

export function ListaLancamentos({
  linhas,
  totalEntradas,
  totalSaidas,
  euId,
  ehAdmin,
}: {
  linhas: LinhaLancamento[];
  totalEntradas: string;
  totalSaidas: string;
  euId: number;
  ehAdmin: boolean;
}) {
  const router = useRouter();
  const avisar = useAviso();
  const [excluindo, iniciar] = useTransition();

  function excluir(linha: LinhaLancamento) {
    iniciar(async () => {
      const resultado = await excluirLancamento(linha.id);
      if (!resultado.ok) {
        avisar(resultado.erro ?? "Não foi possível excluir.");
        return;
      }
      avisar(resultado.mensagem ?? "Lançamento excluído.", {
        rotulo: "Desfazer",
        executar: async () => {
          const restaurado = await restaurarLancamento(linha.id);
          if (!restaurado.ok) avisar(restaurado.erro ?? "Não foi possível desfazer.");
          router.refresh();
        },
      });
      router.refresh();
    });
  }

  if (linhas.length === 0) {
    return <p className="py-[18px] text-center text-suave">Nenhum lançamento com esses filtros.</p>;
  }

  return (
    <>
      <ul>
        {linhas.map((linha) => {
          const podeExcluir = ehAdmin || linha.autorId === euId;
          const entrada = linha.tipo === "ENTRADA";
          return (
            <li
              key={linha.id}
              // Opacidade de 70%: exceção de contraste aceita no design (o texto
              // "(ex-membro)" é o sinal acessível); o teste de acessibilidade
              // desliga só a regra de contraste nas linhas com este atributo.
              data-ex-membro={linha.exMembro || undefined}
              className={`grid grid-cols-[3rem_minmax(0,1fr)_auto_2.2rem] items-center gap-x-3 gap-y-1 border-t border-linha py-[11px] first:border-t-0 ${
                linha.exMembro ? "opacity-70" : ""
              }`}
            >
              <span className="num text-[0.85rem] text-suave">{linha.dia}</span>
              <span className="min-w-0 font-medium [overflow-wrap:anywhere]">
                {linha.descricao}
                <small className="block text-[0.8rem] font-normal text-suave">
                  {linha.categoria} · {linha.exMembro ? `${linha.autorNome} (ex-membro)` : linha.autorNome}
                </small>
              </span>
              <span className={`num whitespace-nowrap text-right text-[0.95rem] font-medium ${entrada ? "text-entrada" : "text-saida"}`}>
                {entrada ? "+ " : "− "}
                {formatarReais(linha.valor)}
              </span>
              {podeExcluir ? (
                <button
                  type="button"
                  aria-label={`Excluir ${linha.descricao}`}
                  disabled={excluindo}
                  onClick={() => excluir(linha)}
                  className="h-8 w-8 rounded-lg text-[1.1rem] leading-none text-suave hover:bg-saida-suave hover:text-saida"
                >
                  <span aria-hidden="true">×</span>
                </button>
              ) : (
                <span />
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-1 flex flex-wrap justify-between gap-x-[18px] gap-y-1.5 border-t-2 border-linha pt-3 text-[0.88rem] text-suave">
        <span>
          {linhas.length} {linhas.length === 1 ? "lançamento" : "lançamentos"}
        </span>
        <span className="num">
          Entradas {formatarReais(totalEntradas)} · Saídas {formatarReais(totalSaidas)}
        </span>
      </div>
    </>
  );
}
