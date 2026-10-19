import Link from "next/link";
import { redirect } from "next/navigation";
import { getGrupoAtualOuNull } from "@/lib/grupo-atual";
import { mesesDoSeletor } from "@/lib/lancamentos";
import { carregarResumo, resolverMes } from "@/lib/resumo";
import { formatarReais } from "@/lib/format/moeda";
import { abreviacaoDoMes, nomeDoMes, nomeDoMesSozinho, paraChaveDeMes } from "@/lib/timezone";
import { SeletorMes } from "../lancamentos/seletor-mes";
import { GraficoSeisMeses } from "./grafico-seis-meses";
import { QuemRegistrou } from "./quem-registrou";
import { SaidasPorCategoria } from "./saidas-por-categoria";

// Aba Resumo (capability resumo), no visual da aba Resumo do protótipo. O mês
// vem de `?mes=2026-09`, o mesmo parâmetro da aba Lançamentos; toda leitura é
// do grupo de getGrupoAtual(). Sem grupo, não há dados para mostrar: a pessoa
// vai para a aba Grupo (capability grupos, Requirement "Pessoa sem grupo").
export default async function ResumoPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const grupo = await getGrupoAtualOuNull();
  if (!grupo) redirect("/grupo");

  const mes = resolverMes(searchParams.mes);
  const [resumo, meses] = await Promise.all([carregarResumo(grupo.grupoId, mes), mesesDoSeletor(grupo.grupoId)]);
  const { totais, comparacao } = resumo;
  const saldoNegativo = totais.saldo.startsWith("-");
  const nomeDoGrupo = grupo.grupos.find((g) => g.id === grupo.grupoId)?.nome ?? "Resumo";

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl [overflow-wrap:anywhere]">{nomeDoGrupo}</h1>
        <SeletorMes
          meses={meses.map((m) => ({ chave: paraChaveDeMes(m), nome: nomeDoMes(m) }))}
          selecionado={paraChaveDeMes(mes)}
        />
      </div>

      <section
        aria-label="Resumo do mês"
        className="quadro grid grid-cols-2 items-end gap-x-10 gap-y-5 min-[861px]:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]"
      >
        <div className="col-span-2 min-[861px]:col-span-1">
          <p className="rotulo">Saldo de {nomeDoMesSozinho(mes)}</p>
          <p
            data-testid="saldo"
            className={`num mt-1 text-[clamp(2rem,6vw,2.9rem)] font-medium leading-[1.1] [overflow-wrap:anywhere] ${
              saldoNegativo ? "text-saida" : "text-entrada"
            }`}
          >
            {formatarReais(totais.saldo)}
          </p>
          {comparacao && (
            <p className="text-[0.85rem] text-suave">
              Saídas {comparacao.percentual}% {comparacao.direcao} que em {nomeDoMesSozinho(comparacao.mesAnterior)}.
            </p>
          )}
          {resumo.mesVazio && (
            <p className="text-[0.85rem] text-suave">
              Nenhum lançamento em {nomeDoMesSozinho(mes)} de {mes.ano}.
            </p>
          )}
          {resumo.grupoVazio && (
            <p className="text-[0.85rem] text-suave">
              Nenhum lançamento no grupo ainda.{" "}
              <Link href="/lancamentos" className="font-semibold text-destaque underline">
                Registre o primeiro lançamento
              </Link>
              .
            </p>
          )}
        </div>
        <div className="min-w-0">
          <p className="rotulo">Entradas</p>
          <p data-testid="entradas" className="num mt-1 text-[clamp(1.05rem,4.2vw,1.45rem)] font-medium text-entrada [overflow-wrap:anywhere]">
            + {formatarReais(totais.entradas)}
          </p>
        </div>
        <div className="min-w-0">
          <p className="rotulo">Saídas</p>
          <p data-testid="saidas" className="num mt-1 text-[clamp(1.05rem,4.2vw,1.45rem)] font-medium text-saida [overflow-wrap:anywhere]">
            − {formatarReais(totais.saidas)}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-4">
        <section className="quadro" aria-labelledby="titulo-grafico">
          <h2 id="titulo-grafico" className="mb-1">
            Últimos 6 meses
          </h2>
          <p className="mb-3.5 text-[0.88rem] text-suave">O mês selecionado fica em destaque.</p>
          <GraficoSeisMeses
            pontos={resumo.serie.map((p) => ({
              chave: paraChaveDeMes(p.mes),
              rotulo: abreviacaoDoMes(p.mes),
              nome: nomeDoMes(p.mes),
              entradas: p.entradas,
              saidas: p.saidas,
            }))}
            selecionado={paraChaveDeMes(mes)}
          />
        </section>
        <SaidasPorCategoria categorias={resumo.categorias} nomeDoMes={nomeDoMes(mes)} />
        <QuemRegistrou pessoas={resumo.pessoas} nomeDoMes={nomeDoMesSozinho(mes)} />
      </div>
    </section>
  );
}
