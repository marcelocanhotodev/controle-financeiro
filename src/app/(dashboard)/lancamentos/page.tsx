import { redirect } from "next/navigation";
import { getGrupoAtualOuNull } from "@/lib/grupo-atual";
import { listarLancamentos, mesesDoSeletor, pessoasDoFiltro, resolverFiltros } from "@/lib/lancamentos";
import { hoje, nomeDoMes, paraChaveDeData, paraChaveDeMes } from "@/lib/timezone";
import { FiltrosLista } from "./filtros-lista";
import { FormularioLancamento } from "./formulario-lancamento";
import { ListaLancamentos } from "./lista-lancamentos";
import { SeletorMes } from "./seletor-mes";

// Aba Lançamentos (capability lancamentos). Mês e filtros vêm da URL
// (`?mes=2026-10&tipo=SAIDA&autor=3`) e são conferidos no servidor; toda
// leitura é do grupo de getGrupoAtual(). Sem grupo, não há dados para
// mostrar: a pessoa vai para a aba Grupo.
export default async function LancamentosPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const grupo = await getGrupoAtualOuNull();
  if (!grupo) redirect("/grupo");

  const filtros = await resolverFiltros(grupo.grupoId, searchParams);
  const [lista, pessoas, meses] = await Promise.all([
    listarLancamentos(grupo.grupoId, filtros),
    pessoasDoFiltro(grupo.grupoId, filtros.mes),
    mesesDoSeletor(grupo.grupoId),
  ]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl">Lançamentos</h1>
        <SeletorMes
          meses={meses.map((m) => ({ chave: paraChaveDeMes(m), nome: nomeDoMes(m) }))}
          selecionado={paraChaveDeMes(filtros.mes)}
        />
      </div>
      <div className="grid grid-cols-1 items-start gap-4 min-[861px]:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <FormularioLancamento nomePessoa={grupo.usuario.nome} hoje={paraChaveDeData(hoje())} />
        <section className="quadro" aria-labelledby="titulo-lista">
          <h2 id="titulo-lista">{nomeDoMes(filtros.mes)}</h2>
          <FiltrosLista
            tipo={filtros.tipo ?? ""}
            autor={filtros.autorId ? String(filtros.autorId) : ""}
            pessoas={pessoas}
          />
          <ListaLancamentos
            linhas={lista.linhas}
            totalEntradas={lista.totalEntradas}
            totalSaidas={lista.totalSaidas}
            euId={grupo.usuario.id}
            ehAdmin={grupo.papel === "ADMIN"}
          />
        </section>
      </div>
    </section>
  );
}
