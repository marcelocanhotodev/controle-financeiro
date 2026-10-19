// Tarefas 2.2 e 4.1 — Server Actions de lançamento (spec lancamentos,
// Requirements "Registro de lançamento", "Autoria dos lançamentos",
// "Exclusão de lançamento" e "Desfazer exclusão").
//
// PRÉ-REQUISITO: Postgres do docker-compose rodando e migrado.

import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (destino: string) => {
    throw new Error(`REDIRECT ${destino}`);
  },
}));

import { prisma } from "@/lib/prisma";
import { criarLancamento, excluirLancamento, restaurarLancamento } from "@/lib/actions/lancamento";

const DOMINIO = "@acoes-lancamento.caixa.test";

let anaId: number;
let marceloId: number;
let pedroId: number;
let casaId: number;
let viagemId: number;

function logarComo(id: number) {
  authMock.mockResolvedValue({ user: { id: String(id), emitidoEm: Date.now() } });
}

async function limpar() {
  await prisma.grupo.deleteMany({ where: { codigo: { startsWith: "TLACAO" } } });
  await prisma.usuario.deleteMany({ where: { email: { endsWith: DOMINIO } } });
}

beforeEach(async () => {
  await limpar();
  const criarUsuario = async (nome: string) =>
    (await prisma.usuario.create({ data: { nome, email: `${nome.toLowerCase()}${DOMINIO}`, senhaHash: "x" } })).id;
  marceloId = await criarUsuario("Marcelo");
  anaId = await criarUsuario("Ana");
  pedroId = await criarUsuario("Pedro");
  casaId = (await prisma.grupo.create({ data: { nome: "Finanças da Casa", codigo: "TLACAO-CASA" } })).id;
  viagemId = (await prisma.grupo.create({ data: { nome: "Viagem", codigo: "TLACAO-VIAG" } })).id;
  await prisma.participacao.createMany({
    data: [
      { usuarioId: marceloId, grupoId: casaId, papel: "ADMIN" },
      { usuarioId: anaId, grupoId: casaId, papel: "MEMBRO" },
      { usuarioId: pedroId, grupoId: casaId, papel: "MEMBRO" },
      { usuarioId: marceloId, grupoId: viagemId, papel: "ADMIN" },
    ],
  });
  await prisma.usuario.updateMany({ where: { email: { endsWith: DOMINIO } }, data: { grupoAtivoId: casaId } });
  logarComo(anaId);
});

afterAll(limpar);

const saida = { tipo: "SAIDA", descricao: "Mercado da semana", valor: "412,80", categoria: "Mercado", data: "2026-10-10" };

describe("criarLancamento", () => {
  it('Scenario "Registrar uma saída" — salvo em nome de Ana, no grupo ativo, com o aviso', async () => {
    const resultado = await criarLancamento(saida);

    expect(resultado).toEqual({ ok: true, mensagem: "Saída de R$ 412,80 registrada.", mes: "2026-10" });
    const lancamento = await prisma.lancamento.findFirstOrThrow({ where: { grupoId: casaId } });
    expect(lancamento).toMatchObject({ autorId: anaId, tipo: "SAIDA", descricao: "Mercado da semana", categoria: "Mercado" });
    expect(lancamento.valor.toString()).toBe("412.8");
    expect(lancamento.data.toISOString()).toBe("2026-10-10T00:00:00.000Z");
  });

  it('Scenario "Registrar uma entrada" — o aviso diz "Entrada de ... registrada."', async () => {
    const resultado = await criarLancamento({ ...saida, tipo: "ENTRADA", categoria: "Salário", valor: "1.250,50" });
    expect(resultado.mensagem).toBe("Entrada de R$ 1.250,50 registrada.");
  });

  it('Scenario "Autor forçado no servidor" e "Id e grupo escolhidos pelo cliente"', async () => {
    await criarLancamento({ ...saida, autorId: marceloId, grupoId: viagemId, id: 999_999 });

    const lancamento = await prisma.lancamento.findFirstOrThrow({ where: { descricao: "Mercado da semana", autor: { email: { endsWith: DOMINIO } } } });
    expect(lancamento.autorId).toBe(anaId);
    expect(lancamento.grupoId).toBe(casaId);
    expect(lancamento.id).not.toBe(999_999);
    expect(await prisma.lancamento.count({ where: { grupoId: viagemId } })).toBe(0);
  });

  it("dados inválidos não gravam nada e apontam o campo", async () => {
    expect(await criarLancamento({ ...saida, valor: "0" })).toEqual({
      ok: false,
      campo: "valor",
      erro: "Informe um valor maior que zero, como 125,90.",
    });
    expect(await prisma.lancamento.count({ where: { grupoId: casaId } })).toBe(0);
  });

  it('Scenario "Acesso cortado ao sair do grupo" — removida, Ana não registra no grupo antigo', async () => {
    await prisma.participacao.delete({ where: { usuarioId_grupoId: { usuarioId: anaId, grupoId: casaId } } });
    const resultado = await criarLancamento(saida);
    expect(resultado.ok).toBe(false);
    expect(await prisma.lancamento.count({ where: { grupoId: casaId } })).toBe(0);
  });

  it("sem sessão, leva a /login", async () => {
    authMock.mockResolvedValue(null);
    await expect(criarLancamento(saida)).rejects.toThrow("REDIRECT /login");
  });
});

describe("excluirLancamento e restaurarLancamento", () => {
  async function lancamentoDe(autorId: number, grupo = casaId) {
    return prisma.lancamento.create({
      data: {
        grupoId: grupo,
        autorId,
        tipo: "SAIDA",
        descricao: "Mercado",
        valor: "50",
        categoria: "Mercado",
        data: new Date("2026-10-10T00:00:00Z"),
      },
    });
  }
  const excluidoEm = async (id: number) => (await prisma.lancamento.findUniqueOrThrow({ where: { id } })).excluidoEm;

  it('Scenario "Autor exclui o seu" — sai da lista (excluidoEm) com o aviso', async () => {
    const lancamento = await lancamentoDe(anaId);
    expect(await excluirLancamento(lancamento.id)).toEqual({ ok: true, mensagem: "Lançamento excluído." });
    expect(await excluidoEm(lancamento.id)).not.toBeNull();
  });

  it('Scenario "Membro não exclui o de outro" — requisição direta recusada sem alterar nada', async () => {
    const lancamento = await lancamentoDe(anaId);
    logarComo(pedroId);
    expect((await excluirLancamento(lancamento.id)).ok).toBe(false);
    expect(await excluidoEm(lancamento.id)).toBeNull();
    expect((await restaurarLancamento(lancamento.id)).ok).toBe(false);
  });

  it('Scenario "Administrador exclui o de outro"', async () => {
    const lancamento = await lancamentoDe(anaId);
    logarComo(marceloId);
    expect((await excluirLancamento(lancamento.id)).ok).toBe(true);
    expect(await excluidoEm(lancamento.id)).not.toBeNull();
  });

  it('Scenario "Desfazer a tempo" — volta com os mesmos dados', async () => {
    const lancamento = await lancamentoDe(anaId);
    await excluirLancamento(lancamento.id);
    expect(await restaurarLancamento(lancamento.id)).toEqual({ ok: true });
    const restaurado = await prisma.lancamento.findUniqueOrThrow({ where: { id: lancamento.id } });
    expect(restaurado).toEqual({ ...lancamento, excluidoEm: null });
  });

  it('Scenario "Restaurar depois do prazo por requisição direta" — recusado e continua excluído', async () => {
    const lancamento = await lancamentoDe(anaId);
    const haDoisMinutos = new Date(Date.now() - 2 * 60_000);
    await prisma.lancamento.update({ where: { id: lancamento.id }, data: { excluidoEm: haDoisMinutos } });

    expect(await restaurarLancamento(lancamento.id)).toEqual({ ok: false, erro: "Lançamento não encontrado." });
    expect(await excluidoEm(lancamento.id)).toEqual(haDoisMinutos);
  });

  it("excluir duas vezes ou restaurar o que não foi excluído não muda nada", async () => {
    const lancamento = await lancamentoDe(anaId);
    expect((await restaurarLancamento(lancamento.id)).ok).toBe(false);
    await excluirLancamento(lancamento.id);
    const primeiro = await excluidoEm(lancamento.id);
    expect((await excluirLancamento(lancamento.id)).ok).toBe(false);
    expect(await excluidoEm(lancamento.id)).toEqual(primeiro);
  });
});
