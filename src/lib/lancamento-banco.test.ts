// Tarefa 1.1 — o banco recusa valor zero ou negativo (CHECK valor > 0): o
// sinal vem do tipo, nunca do valor.
//
// PRÉ-REQUISITO: Postgres do docker-compose rodando e migrado.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const EMAIL = "banco@lancamento.caixa.test";
const CODIGO = "TLBANCO-0001";
let autorId: number;
let grupoId: number;

async function limpar() {
  await prisma.grupo.deleteMany({ where: { codigo: CODIGO } });
  await prisma.usuario.deleteMany({ where: { email: EMAIL } });
}

beforeAll(async () => {
  await limpar();
  autorId = (await prisma.usuario.create({ data: { nome: "Ana", email: EMAIL, senhaHash: "x" } })).id;
  grupoId = (await prisma.grupo.create({ data: { nome: "Teste", codigo: CODIGO } })).id;
});

afterAll(limpar);

const lancamento = (valor: string) => ({
  grupoId,
  autorId,
  tipo: "SAIDA" as const,
  descricao: "Teste",
  valor: new Prisma.Decimal(valor),
  categoria: "Outros",
  data: new Date("2026-10-10"),
});

describe("tabela lancamentos", () => {
  it.each(["0", "-1.50"])("recusa valor %s", async (valor) => {
    await expect(prisma.lancamento.create({ data: lancamento(valor) })).rejects.toThrow(/lancamentos_valor_positivo/);
  });

  it("aceita valor positivo com duas casas, exato", async () => {
    const criado = await prisma.lancamento.create({ data: lancamento("1250.50") });
    expect(criado.valor.toString()).toBe("1250.5");
    expect(criado.valor.equals(new Prisma.Decimal("1250.50"))).toBe(true);
  });
});
