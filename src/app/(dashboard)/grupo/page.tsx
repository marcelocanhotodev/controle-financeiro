import { prisma } from "@/lib/prisma";
import { filtroPendente } from "@/lib/convite-pendente";
import { getGrupoAtualOuNull } from "@/lib/grupo-atual";
import { CriarOuEntrar } from "./criar-ou-entrar";
import { ListaMembros } from "./lista-membros";
import { PainelConvite } from "./painel-convite";

// Aba Grupo (capability grupos). Leituras aqui, no servidor, sempre pelo
// grupo de getGrupoAtual(); convites pendentes e código só chegam ao
// navegador de quem é Administrador.
export default async function GrupoPage() {
  const grupo = await getGrupoAtualOuNull();

  if (!grupo) {
    // Requirement "Pessoa sem grupo".
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-2xl">Grupo</h1>
        <p className="text-suave">Você ainda não participa de nenhum grupo. Crie um ou entre com um código.</p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-4">
          <CriarOuEntrar outroGrupo={false} />
        </div>
      </section>
    );
  }

  const ehAdmin = grupo.papel === "ADMIN";
  const [participacoes, convites, dadosGrupo] = await Promise.all([
    prisma.participacao.findMany({
      where: { grupoId: grupo.grupoId },
      orderBy: [{ entrouEm: "asc" }, { usuarioId: "asc" }],
      select: { usuarioId: true, papel: true, usuario: { select: { nome: true, email: true } } },
    }),
    ehAdmin
      ? prisma.convite.findMany({
          where: { grupoId: grupo.grupoId, ...filtroPendente() },
          orderBy: { criadoEm: "asc" },
          select: { id: true, email: true, envioStatus: true },
        })
      : Promise.resolve([]),
    ehAdmin ? prisma.grupo.findUniqueOrThrow({ where: { id: grupo.grupoId }, select: { codigo: true } }) : null,
  ]);

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl">{grupo.grupoNome}</h1>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-4">
        <ListaMembros
          euId={grupo.usuario.id}
          ehAdmin={ehAdmin}
          membros={participacoes.map((p) => ({ usuarioId: p.usuarioId, papel: p.papel, ...p.usuario }))}
          convites={convites.map((c) => ({ id: c.id, email: c.email, envioFalhou: c.envioStatus === "FALHOU" }))}
        />
        <div className="flex flex-col gap-5">
          {dadosGrupo && <PainelConvite codigo={dadosGrupo.codigo} />}
          <CriarOuEntrar outroGrupo />
        </div>
      </div>
    </section>
  );
}
