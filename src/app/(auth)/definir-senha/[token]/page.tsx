import Link from "next/link";
import { MolduraAuth } from "../../moldura-auth";
import { filtroPendente } from "@/lib/convite-pendente";
import { prisma } from "@/lib/prisma";
import { buscarToken, tokenUtilizavel } from "@/lib/token-senha";
import { MENSAGEM_EMAIL_JA_TEM_CONTA_CONVITE, MENSAGEM_LINK_INVALIDO } from "@/lib/validators/senha";
import { FormularioDefinirSenha } from "./formulario-definir-senha";

// Link de definir senha (capability autenticacao, Requirements "Link de
// definir senha" e "Recuperação de senha"; capability grupos, Requirement
// "Aceite de convite").
//   - REDEFINIR: pede só a nova senha.
//   - CRIAR: mostra o e-mail do convite, sem edição, e pede nome e senha.
export default async function DefinirSenhaPage({ params }: { params: { token: string } }) {
  const token = await buscarToken(params.token);
  const convite = token?.finalidade === "CRIAR";

  if (!token || !tokenUtilizavel(token)) {
    return (
      <MolduraAuth>
        <LinkInvalido convite={convite} />
      </MolduraAuth>
    );
  }

  if (token.finalidade === "REDEFINIR") {
    return (
      <MolduraAuth>
        <FormularioDefinirSenha token={params.token} modo="redefinir" />
      </MolduraAuth>
    );
  }

  const dadosConvite = token.conviteId
    ? await prisma.convite.findFirst({
        where: { id: token.conviteId, ...filtroPendente() },
        include: { grupo: { select: { nome: true } }, criadoPor: { select: { nome: true } } },
      })
    : null;
  if (!dadosConvite) {
    return (
      <MolduraAuth>
        <LinkInvalido convite />
      </MolduraAuth>
    );
  }

  // Corrida: a conta foi criada pela tela "Criar conta" depois do envio.
  if ((await prisma.usuario.count({ where: { email: dadosConvite.email } })) > 0) {
    return (
      <MolduraAuth>
        <h2>{MENSAGEM_EMAIL_JA_TEM_CONTA_CONVITE}</h2>
        <Link
          href={`/login?retorno=${encodeURIComponent(`/convite/${dadosConvite.token}`)}`}
          className="botao self-start"
        >
          Entrar
        </Link>
      </MolduraAuth>
    );
  }

  return (
    <MolduraAuth>
      <FormularioDefinirSenha
        token={params.token}
        modo="criar"
        convite={{ email: dadosConvite.email, grupoNome: dadosConvite.grupo.nome, convidadoPor: dadosConvite.criadoPor.nome }}
      />
    </MolduraAuth>
  );
}

function LinkInvalido({ convite }: { convite: boolean }) {
  return (
    <div className="flex flex-col gap-3.5">
      <h2>{MENSAGEM_LINK_INVALIDO}</h2>
      {convite ? (
        <p className="text-suave">Peça um novo convite a quem administra o grupo.</p>
      ) : (
        <>
          <p className="text-suave">Ele já foi usado ou passou da validade de 1 hora.</p>
          <Link href="/esqueci-senha" className="botao self-start">
            Pedir um novo link
          </Link>
        </>
      )}
    </div>
  );
}
