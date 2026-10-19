// Tarefa 4.2 — rota do Vercel Cron que apaga de vez os lançamentos excluídos
// há mais de 24 horas. Modelo: lembretes-whatsapp/route.test.ts do
// matilha-app.
//
// Os testes de autorização rejeitam antes de tocar no banco. O de ponta a
// ponta precisa do Postgres do docker-compose rodando e migrado.

import { describe, it, expect, afterEach, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GET } from "./route";

const URL_ROTA = "http://localhost/api/cron/limpar-lancamentos";
const cronSecretOriginal = process.env.CRON_SECRET;

afterEach(() => {
  if (cronSecretOriginal === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = cronSecretOriginal;
});

describe("GET /api/cron/limpar-lancamentos — autorização", () => {
  it("responde 401 sem cabeçalho Authorization", async () => {
    process.env.CRON_SECRET = "segredo-correto";
    expect((await GET(new NextRequest(URL_ROTA))).status).toBe(401);
  });

  it("responde 401 com segredo errado", async () => {
    process.env.CRON_SECRET = "segredo-correto";
    const resposta = await GET(new NextRequest(URL_ROTA, { headers: { authorization: "Bearer segredo-errado" } }));
    expect(resposta.status).toBe(401);
  });

  it("responde 401 quando CRON_SECRET não existe no ambiente, até para `Bearer ` vazio", async () => {
    delete process.env.CRON_SECRET;
    expect((await GET(new NextRequest(URL_ROTA))).status).toBe(401);
    expect((await GET(new NextRequest(URL_ROTA, { headers: { authorization: "Bearer " } }))).status).toBe(401);
    expect((await GET(new NextRequest(URL_ROTA, { headers: { authorization: "Bearer undefined" } }))).status).toBe(401);
  });
});

describe("GET /api/cron/limpar-lancamentos — ponta a ponta", () => {
  const EMAIL = "cron@limpeza.caixa.test";
  const CODIGO = "TLCRON-0001";
  let grupoId: number;
  const ids: Record<string, number> = {};

  beforeAll(async () => {
    await prisma.grupo.deleteMany({ where: { codigo: CODIGO } });
    await prisma.usuario.deleteMany({ where: { email: EMAIL } });
    const autorId = (await prisma.usuario.create({ data: { nome: "Ana", email: EMAIL, senhaHash: "x" } })).id;
    grupoId = (await prisma.grupo.create({ data: { nome: "Cron", codigo: CODIGO } })).id;
    const agora = Date.now();
    const casos: Record<string, Date | null> = {
      ativo: null,
      excluidoAgora: new Date(agora - 60_000),
      excluidoHa23h: new Date(agora - 23 * 60 * 60 * 1000),
      excluidoHa25h: new Date(agora - 25 * 60 * 60 * 1000),
    };
    for (const [nome, excluidoEm] of Object.entries(casos)) {
      const lancamento = await prisma.lancamento.create({
        data: {
          grupoId,
          autorId,
          tipo: "SAIDA",
          descricao: nome,
          valor: new Prisma.Decimal("10"),
          categoria: "Outros",
          data: new Date("2026-10-10T00:00:00Z"),
          excluidoEm,
        },
      });
      ids[nome] = lancamento.id;
    }
  });

  afterAll(async () => {
    await prisma.grupo.deleteMany({ where: { codigo: CODIGO } });
    await prisma.usuario.deleteMany({ where: { email: EMAIL } });
  });

  it("com o segredo certo, apaga só o que foi excluído há mais de 24 horas", async () => {
    process.env.CRON_SECRET = "segredo-correto";
    const resposta = await GET(new NextRequest(URL_ROTA, { headers: { authorization: "Bearer segredo-correto" } }));

    expect(resposta.status).toBe(200);
    expect((await resposta.json()).apagados).toBeGreaterThanOrEqual(1);
    const restantes = await prisma.lancamento.findMany({ where: { grupoId }, select: { descricao: true } });
    expect(restantes.map((l) => l.descricao).sort()).toEqual(["ativo", "excluidoAgora", "excluidoHa23h"]);
    expect(await prisma.lancamento.findUnique({ where: { id: ids.excluidoHa25h } })).toBeNull();
  });
});
