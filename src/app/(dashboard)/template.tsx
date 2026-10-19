import { getGrupoAtualOuNull } from "@/lib/grupo-atual";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { Abas } from "./abas";
import { AvisoTrocaGrupo } from "./aviso-troca-grupo";
import { BotaoSair } from "./botao-sair";
import { SeletorGrupo } from "./seletor-grupo";

// Topo, abas e conteúdo das telas internas (capability estrutura-app,
// Requirements "Navegação por seções" e "Barra superior"; capability grupos,
// Requirement "Seletor de grupo e pessoa no topo"), no visual do `.top` do
// protótipo: nome do app à esquerda; seletor de grupo, pessoa e "Sair" à
// direita.
//
// É um template, não parte do layout, porque o Next renderiza o template de
// novo a cada navegação: o topo sempre mostra o grupo ativo atual, e o aviso
// de troca de grupo aparece mesmo quando a troca acontece ao trocar de aba.
export default async function DashboardTemplate({ children }: { children: React.ReactNode }) {
  const grupo = await getGrupoAtualOuNull();
  // Sem grupo, getGrupoAtual não devolve a pessoa; busca só o nome.
  const usuario = grupo?.usuario ?? (await getUsuarioAtual());

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 pb-3.5">
        <div className="font-display text-[1.3rem] font-bold text-destaque">Caixa Comum</div>
        <div className="flex flex-wrap items-center gap-2.5">
          {grupo && <SeletorGrupo key={grupo.grupoId} grupos={grupo.grupos} grupoAtivoId={grupo.grupoId} />}
          <div className="flex items-center gap-2 font-medium">
            <span
              aria-hidden="true"
              className="inline-grid h-[30px] w-[30px] flex-none place-items-center rounded-full bg-destaque-suave text-[0.85rem] font-bold text-destaque"
            >
              {usuario.nome.trim().charAt(0).toUpperCase()}
            </span>
            <span>{usuario.nome}</span>
          </div>
          <BotaoSair />
        </div>
      </header>
      {grupo?.trocouDe && <AvisoTrocaGrupo grupoAnterior={grupo.trocouDe} />}
      <Abas />
      <main>{children}</main>
    </>
  );
}
