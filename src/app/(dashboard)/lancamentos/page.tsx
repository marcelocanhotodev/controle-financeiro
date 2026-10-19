import { redirect } from "next/navigation";
import { getGrupoAtualOuNull } from "@/lib/grupo-atual";
import { EstadoVazio } from "../estado-vazio";

// Conteúdo real na change lancamentos. Sem grupo, não há dados para mostrar:
// a pessoa vai para a aba Grupo (capability grupos, Requirement "Pessoa sem
// grupo").
export default async function LancamentosPage() {
  if (!(await getGrupoAtualOuNull())) redirect("/grupo");
  return <EstadoVazio titulo="Lançamentos" texto="As entradas e saídas registradas pelo grupo vão aparecer aqui." />;
}
