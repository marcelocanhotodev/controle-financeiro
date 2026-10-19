import { redirect } from "next/navigation";
import { getGrupoAtualOuNull } from "@/lib/grupo-atual";
import { EstadoVazio } from "../estado-vazio";

// Conteúdo real na change resumo-mensal. Sem grupo, não há dados para
// mostrar: a pessoa vai para a aba Grupo (capability grupos, Requirement
// "Pessoa sem grupo").
export default async function ResumoPage() {
  if (!(await getGrupoAtualOuNull())) redirect("/grupo");
  return <EstadoVazio titulo="Resumo" texto="O saldo do mês, as entradas e as saídas do grupo vão aparecer aqui." />;
}
