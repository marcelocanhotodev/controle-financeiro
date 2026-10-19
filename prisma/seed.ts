// Dados de exemplo para desenvolvimento, iguais aos do protótipo
// (openspec/prototype/Caixa Comum.html): três contas e dois grupos.
//
//   Marcelo  marcelo@exemplo.com  Administrador dos dois grupos
//   Ana      ana@exemplo.com      Membro dos dois grupos
//   Pedro    pedro@exemplo.com    Membro de "Finanças da Casa"
//
// Senha das três contas: senha1234 (o protótipo usava 1234, mas o app exige
// pelo menos 8 caracteres).
//
// Só para desenvolvimento: recusa rodar com NODE_ENV=production. Pode rodar
// quantas vezes quiser — tudo é upsert por chave de negócio (e-mail da conta,
// código do grupo, par pessoa-grupo), nunca por id escolhido na mão.
//
// Rodar com: npm run db:seed

import { PrismaClient, type PapelGrupo } from "@prisma/client";
import bcrypt from "bcryptjs";

if (process.env.NODE_ENV === "production") {
  console.error("[seed] Recusado: os dados de exemplo são só para desenvolvimento (NODE_ENV=production).");
  process.exit(1);
}

const prisma = new PrismaClient();
const SENHA = "senha1234";

const CONTAS = [
  { nome: "Marcelo", email: "marcelo@exemplo.com" },
  { nome: "Ana", email: "ana@exemplo.com" },
  { nome: "Pedro", email: "pedro@exemplo.com" },
] as const;

const GRUPOS: { nome: string; codigo: string; membros: [string, PapelGrupo][] }[] = [
  {
    nome: "Finanças da Casa",
    codigo: "CASA-2026",
    membros: [
      ["marcelo@exemplo.com", "ADMIN"],
      ["ana@exemplo.com", "MEMBRO"],
      ["pedro@exemplo.com", "MEMBRO"],
    ],
  },
  {
    nome: "Viagem de Dezembro",
    codigo: "VIAGEM-DEZ",
    membros: [
      ["marcelo@exemplo.com", "ADMIN"],
      ["ana@exemplo.com", "MEMBRO"],
    ],
  },
];

async function main() {
  const senhaHash = await bcrypt.hash(SENHA, 10);
  const idPorEmail = new Map<string, number>();

  for (const conta of CONTAS) {
    const usuario = await prisma.usuario.upsert({
      where: { email: conta.email },
      update: { nome: conta.nome, senhaHash, senhaAlteradaEm: null },
      create: { ...conta, senhaHash },
    });
    idPorEmail.set(conta.email, usuario.id);
  }

  const grupoIds: number[] = [];
  for (const dados of GRUPOS) {
    const grupo = await prisma.grupo.upsert({
      where: { codigo: dados.codigo },
      update: { nome: dados.nome },
      create: { nome: dados.nome, codigo: dados.codigo },
    });
    grupoIds.push(grupo.id);

    for (const [email, papel] of dados.membros) {
      const usuarioId = idPorEmail.get(email)!;
      await prisma.participacao.upsert({
        where: { usuarioId_grupoId: { usuarioId, grupoId: grupo.id } },
        update: { papel },
        create: { usuarioId, grupoId: grupo.id, papel },
      });
    }
  }

  // Todos começam em "Finanças da Casa", o grupo em comum.
  await prisma.usuario.updateMany({ where: { email: { in: CONTAS.map((c) => c.email) } }, data: { grupoAtivoId: grupoIds[0] } });

  console.log(`[seed] ${CONTAS.length} contas e ${GRUPOS.length} grupos prontos. Senha das contas: ${SENHA}`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
