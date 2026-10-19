import Link from "next/link";
import { MolduraAuth } from "../../moldura-auth";
import { auth } from "@/lib/auth";
import { buscarConvitePendente } from "@/lib/convite-pendente";
import { prisma } from "@/lib/prisma";
import { conferirSessao } from "@/lib/usuario-atual";
import { MENSAGEM_CONVITE_INVALIDO, MENSAGEM_CONVITE_OUTRO_EMAIL } from "@/lib/validators/convite";
import { MENSAGEM_JA_PARTICIPA } from "@/lib/validators/grupo";
import { BotaoAceitarConvite, BotaoSairParaTrocarConta } from "./acoes-convite";

// Link do convite para quem já tem conta (capability grupos, Requirement
// "Aceite de convite"). Quem não tem conta recebe o link de definir senha e
// cria a conta por ele (src/app/(auth)/definir-senha).
export default async function ConvitePage({ params }: { params: { token: string } }) {
  const convite = await buscarConvitePendente(params.token);

  if (!convite) {
    return (
      <MolduraAuth>
        <h2>{MENSAGEM_CONVITE_INVALIDO}</h2>
      </MolduraAuth>
    );
  }

  const sessao = await auth();
  const usuario = await conferirSessao(sessao?.user);
  const retorno = `/convite/${params.token}`;
  const cabecalho = (
    <div className="flex flex-col gap-1.5">
      <h2>Convite para &ldquo;{convite.grupo.nome}&rdquo;</h2>
      <p className="text-suave">
        {convite.criadoPor.nome} convidou {convite.email} para o grupo.
      </p>
    </div>
  );

  if (!usuario) {
    return (
      <MolduraAuth>
        {cabecalho}
        <p>Entre com a sua conta para aceitar o convite.</p>
        <Link href={`/login?retorno=${encodeURIComponent(retorno)}`} className="botao self-start">
          Entrar
        </Link>
      </MolduraAuth>
    );
  }

  if (usuario.email !== convite.email) {
    return (
      <MolduraAuth>
        {cabecalho}
        <p role="alert" className="rounded-lg bg-saida-suave px-3 py-[9px] font-medium text-saida">
          {MENSAGEM_CONVITE_OUTRO_EMAIL} Você entrou como {usuario.email}.
        </p>
        <BotaoSairParaTrocarConta retorno={retorno} />
      </MolduraAuth>
    );
  }

  const jaParticipa = await prisma.participacao.findUnique({
    where: { usuarioId_grupoId: { usuarioId: usuario.id, grupoId: convite.grupoId } },
  });
  if (jaParticipa) {
    return (
      <MolduraAuth>
        {cabecalho}
        <p>{MENSAGEM_JA_PARTICIPA}</p>
        <Link href="/resumo" className="botao self-start">
          Ir para o app
        </Link>
      </MolduraAuth>
    );
  }

  return (
    <MolduraAuth>
      {cabecalho}
      <BotaoAceitarConvite token={params.token} />
    </MolduraAuth>
  );
}
