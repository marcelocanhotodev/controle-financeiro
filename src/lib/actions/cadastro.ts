"use server";

// Server Action de cadastro pela tela "Criar conta" (capability:
// autenticacao). Cria o Usuario e, na mesma transação, a participação no
// grupo do código informado ou o grupo "Grupo de <primeiro nome>" com a
// pessoa como Administradora — conta e participação nascem juntas, então um
// cadastro recusado não deixa resíduo (design.md, "Operações de vários passos
// com prisma.$transaction").
//
// NUNCA estabelece sessão: o formulário reautentica com as mesmas credenciais
// via signIn() do next-auth/react, como no matilha-app.
//
// Não procura convites pendentes pelo e-mail (Scenario "Cadastro não procura
// convites pelo e-mail"): convite só vale pelo link.

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { comCodigoUnico } from "@/lib/codigo-grupo";
import {
  cadastroSchema,
  MENSAGEM_CODIGO_INEXISTENTE,
  MENSAGEM_EMAIL_JA_CADASTRADO,
  type CampoCadastro,
} from "@/lib/validators/cadastro";

export interface CadastroResultado {
  ok: boolean;
  erro?: string;
  /** Campo com problema, para o formulário mover o foco até ele. */
  campo?: CampoCadastro;
}

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0];
}

export async function cadastrar(dadosBrutos: unknown): Promise<CadastroResultado> {
  const parse = cadastroSchema.safeParse(dadosBrutos);
  if (!parse.success) {
    const problema = parse.error.issues[0];
    return { ok: false, erro: problema?.message ?? "Dados inválidos.", campo: problema?.path[0] as CampoCadastro };
  }
  const { nome, email, senha, codigoGrupo } = parse.data;

  // Checado antes para dar a mensagem certa no caminho comum. A constraint
  // única de Usuario.email é a rede de segurança contra corrida (catch abaixo).
  if (await prisma.usuario.findUnique({ where: { email } })) {
    return { ok: false, erro: MENSAGEM_EMAIL_JA_CADASTRADO, campo: "email" };
  }

  let grupoDoCodigo: { id: number } | null = null;
  if (codigoGrupo) {
    grupoDoCodigo = await prisma.grupo.findUnique({ where: { codigo: codigoGrupo }, select: { id: true } });
    if (!grupoDoCodigo) {
      return { ok: false, erro: MENSAGEM_CODIGO_INEXISTENTE, campo: "codigoGrupo" };
    }
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  try {
    if (grupoDoCodigo) {
      const grupoId = grupoDoCodigo.id;
      await prisma.$transaction(async (tx) => {
        const usuario = await tx.usuario.create({ data: { nome, email, senhaHash, grupoAtivoId: grupoId } });
        await tx.participacao.create({ data: { usuarioId: usuario.id, grupoId, papel: "MEMBRO" } });
      });
    } else {
      const nomeGrupo = `Grupo de ${primeiroNome(nome)}`;
      await comCodigoUnico(nomeGrupo, (codigo) =>
        prisma.$transaction(async (tx) => {
          const grupo = await tx.grupo.create({ data: { nome: nomeGrupo, codigo } });
          const usuario = await tx.usuario.create({ data: { nome, email, senhaHash, grupoAtivoId: grupo.id } });
          await tx.participacao.create({ data: { usuarioId: usuario.id, grupoId: grupo.id, papel: "ADMIN" } });
        }),
      );
    }
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      return { ok: false, erro: MENSAGEM_EMAIL_JA_CADASTRADO, campo: "email" };
    }
    throw erro;
  }

  return { ok: true };
}
