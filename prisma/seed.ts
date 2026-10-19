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
// Lançamentos: os mesmos 6 meses do protótipo, terminando no mês atual (no mês
// atual, só até hoje). Recriados do zero a cada execução nos dois grupos.
//
// Só para desenvolvimento: recusa rodar com NODE_ENV=production. Pode rodar
// quantas vezes quiser — tudo é upsert por chave de negócio (e-mail da conta,
// código do grupo, par pessoa-grupo), nunca por id escolhido na mão.
//
// Rodar com: npm run db:seed

import { Prisma, PrismaClient, type PapelGrupo, type TipoLancamento } from "@prisma/client";
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

  await recriarLancamentos(grupoIds[0], grupoIds[1], idPorEmail);

  // Todos começam em "Finanças da Casa", o grupo em comum.
  await prisma.usuario.updateMany({ where: { email: { in: CONTAS.map((c) => c.email) } }, data: { grupoAtivoId: grupoIds[0] } });

  console.log(`[seed] ${CONTAS.length} contas e ${GRUPOS.length} grupos prontos. Senha das contas: ${SENHA}`);
}

/** Dia de hoje em America/Sao_Paulo (UTC-3, sem horário de verão). */
function hojeEmSaoPaulo(): { ano: number; mes: number; dia: number } {
  const deslocado = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return { ano: deslocado.getUTCFullYear(), mes: deslocado.getUTCMonth() + 1, dia: deslocado.getUTCDate() };
}

/** Mesmo gerador do protótipo (função seed() de openspec/prototype/Caixa
 * Comum.html): `j` vai de 0 (5 meses atrás) a 5 (mês atual). */
async function recriarLancamentos(casaId: number, viagemId: number, idPorEmail: Map<string, number>) {
  await prisma.lancamento.deleteMany({ where: { grupoId: { in: [casaId, viagemId] } } });

  const marcelo = idPorEmail.get("marcelo@exemplo.com")!;
  const ana = idPorEmail.get("ana@exemplo.com")!;
  const pedro = idPorEmail.get("pedro@exemplo.com")!;
  const hoje = hojeEmSaoPaulo();
  const dados: Prisma.LancamentoCreateManyInput[] = [];

  for (let k = 5; k >= 0; k--) {
    const primeiroDia = new Date(Date.UTC(hoje.ano, hoje.mes - 1 - k, 1));
    const ano = primeiroDia.getUTCFullYear();
    const mes = primeiroDia.getUTCMonth();
    const ultimoDia = k === 0 ? hoje.dia : 28;
    const j = 5 - k;
    // `criadoEm` crescente na ordem do protótipo: no mesmo dia, o último da
    // lista é o "último registrado".
    const lancar = (
      grupoId: number,
      dia: number,
      autorId: number,
      tipo: TipoLancamento,
      descricao: string,
      valor: number,
      categoria: string,
    ) => {
      if (dia > ultimoDia) return;
      const data = new Date(Date.UTC(ano, mes, dia));
      dados.push({
        grupoId,
        autorId,
        tipo,
        descricao,
        valor: new Prisma.Decimal(valor.toFixed(2)),
        categoria,
        data,
        criadoEm: new Date(data.getTime() + 12 * 60 * 60 * 1000 + dados.length * 1000),
      });
    };

    lancar(casaId, 5, marcelo, "ENTRADA", "Salário Marcelo", 6200, "Salário");
    lancar(casaId, 5, ana, "ENTRADA", "Salário Ana", 5400, "Salário");
    lancar(casaId, 10, pedro, "ENTRADA", "Freela de design", [600, 900, 450, 1100, 700, 850][j], "Extra");
    lancar(casaId, 8, marcelo, "SAIDA", "Aluguel", 1850, "Moradia");
    lancar(casaId, 8, marcelo, "SAIDA", "Condomínio", 520, "Moradia");
    lancar(casaId, 12, ana, "SAIDA", "Conta de luz", [212.4, 198.9, 236.7, 251.3, 224.1, 203.8][j], "Contas");
    lancar(casaId, 9, ana, "SAIDA", "Internet fibra", 119.9, "Contas");
    lancar(casaId, 3, ana, "SAIDA", "Mercado da semana", [412.8, 388.5, 451.2, 397.6, 430.1, 405.3][j], "Mercado");
    lancar(casaId, 10, marcelo, "SAIDA", "Mercado da semana", [380.2, 402.9, 365.4, 420.8, 395.7, 388.1][j], "Mercado");
    lancar(casaId, 17, ana, "SAIDA", "Mercado da semana", [398.6, 371.2, 410.3, 389.9, 402.4, 376.8][j], "Mercado");
    lancar(casaId, 24, marcelo, "SAIDA", "Mercado da semana", [405.1, 396.4, 388.7, 415.2, 380.9, 399.5][j], "Mercado");
    lancar(casaId, 6, marcelo, "SAIDA", "Combustível", [260, 240, 285, 250, 270, 255][j], "Transporte");
    lancar(casaId, 11, pedro, "SAIDA", "Aplicativo de transporte", [64.5, 48.9, 72.3, 55.1, 61.7, 58.4][j], "Transporte");
    lancar(casaId, 7, pedro, "SAIDA", "Cinema e lanche", [96, 0, 118, 84, 102, 90][j] || 60, "Lazer");
    lancar(casaId, 20, ana, "SAIDA", "Jantar fora", [168, 142, 190, 155, 176, 149][j], "Lazer");
    lancar(casaId, 13, ana, "SAIDA", "Farmácia", [78.9, 45.5, 132.2, 60.3, 88.1, 54.7][j], "Saúde");
    if (k <= 2) {
      lancar(viagemId, 6, marcelo, "ENTRADA", "Aporte Marcelo", 500, "Aporte");
      lancar(viagemId, 6, ana, "ENTRADA", "Aporte Ana", 500, "Aporte");
    }
    if (k === 1) lancar(viagemId, 12, marcelo, "SAIDA", "Entrada da pousada", 1400, "Viagem");
    if (k === 0) lancar(viagemId, 4, ana, "SAIDA", "Passagens de ônibus", 380, "Viagem");
  }

  await prisma.lancamento.createMany({ data: dados });
  console.log(`[seed] ${dados.length} lançamentos recriados.`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
