import { PrismaClient } from "@prisma/client";

// Acesso direto ao banco dos testes de ponta a ponta, só para preparar
// situações que a interface leva vários passos para montar (ex.: uma pessoa
// em dois grupos) ou que dependem de outra pessoa agir (ex.: ser removido).
// O mesmo banco que o servidor dos testes usa (DATABASE_URL).

export const banco = new PrismaClient();

export async function idDaConta(email: string): Promise<number> {
  return (await banco.usuario.findUniqueOrThrow({ where: { email: email.toLowerCase() } })).id;
}

/** Cria um grupo com a pessoa como Membro, depois dos grupos que ela já tem. */
export async function criarGrupoCom(usuarioId: number, nome: string): Promise<number> {
  const codigo = `E2E-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
  const grupo = await banco.grupo.create({ data: { nome, codigo } });
  await banco.participacao.create({ data: { usuarioId, grupoId: grupo.id, papel: "MEMBRO" } });
  return grupo.id;
}
