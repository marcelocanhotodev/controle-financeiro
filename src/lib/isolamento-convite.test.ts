// Tarefa 3.12 — isolamento de convites entre grupos (spec grupos,
// Requirement "Identificadores numéricos sem efeito sobre o acesso"). Mesmo
// padrão de src/lib/isolamento-grupo.test.ts.
//
// PRÉ-REQUISITO: Postgres do docker-compose rodando e migrado.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

const { authMock, enviarConviteMock } = vi.hoisted(() => ({ authMock: vi.fn(), enviarConviteMock: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/email", () => ({ enviarConvite: enviarConviteMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (destino: string) => {
    throw new Error(`REDIRECT ${destino}`);
  },
}));

import { prisma } from "@/lib/prisma";
import { cancelarConvite, convidar, reenviarConvite } from "@/lib/actions/convite";

const DOMINIO = "@isolamento-convite.caixa.test";
const ID_INEXISTENTE = 2_000_000_000;

let anaId: number;
let grupoAId: number;
let grupoBId: number;
let conviteBId: number;

async function limpar() {
  await prisma.grupo.deleteMany({ where: { codigo: { startsWith: "TISOC" } } });
  await prisma.usuario.deleteMany({ where: { email: { endsWith: DOMINIO } } });
}

beforeAll(async () => {
  await limpar();
  enviarConviteMock.mockResolvedValue(undefined);
  anaId = (await prisma.usuario.create({ data: { nome: "Ana", email: `ana${DOMINIO}`, senhaHash: "x" } })).id;
  const bruno = await prisma.usuario.create({ data: { nome: "Bruno", email: `bruno${DOMINIO}`, senhaHash: "x" } });
  grupoAId = (await prisma.grupo.create({ data: { nome: "Grupo A", codigo: "TISOC-000A" } })).id;
  grupoBId = (await prisma.grupo.create({ data: { nome: "Grupo B", codigo: "TISOC-000B" } })).id;
  await prisma.participacao.createMany({
    data: [
      { usuarioId: anaId, grupoId: grupoAId, papel: "ADMIN" },
      { usuarioId: bruno.id, grupoId: grupoBId, papel: "ADMIN" },
    ],
  });
  await prisma.usuario.update({ where: { id: anaId }, data: { grupoAtivoId: grupoAId } });
  conviteBId = (
    await prisma.convite.create({
      data: {
        grupoId: grupoBId,
        email: `convidado${DOMINIO}`,
        token: `tok-isolamento-${Date.now()}`,
        criadoPorId: bruno.id,
        expiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })
  ).id;
  authMock.mockResolvedValue({ user: { id: String(anaId), emitidoEm: Date.now() } });
});

afterAll(limpar);

describe("isolamento de convites (sessão do grupo A)", () => {
  it("reenviar convite do grupo B responde como convite inexistente e não envia nada", async () => {
    const deOutro = await reenviarConvite(conviteBId);
    const inexistente = await reenviarConvite(ID_INEXISTENTE);
    expect(deOutro).toEqual(inexistente);
    expect(deOutro).toEqual({ ok: false, erro: "Convite não encontrado." });
    expect(enviarConviteMock).not.toHaveBeenCalled();
  });

  it("cancelar convite do grupo B responde como convite inexistente e o convite continua lá", async () => {
    const deOutro = await cancelarConvite(conviteBId);
    const inexistente = await cancelarConvite(ID_INEXISTENTE);
    expect(deOutro).toEqual(inexistente);
    expect(await prisma.convite.findUnique({ where: { id: conviteBId } })).not.toBeNull();
  });

  it('Scenario "Id escolhido pelo cliente" — convidar com `id` e `grupoId` do grupo B cria o convite no grupo A', async () => {
    await convidar({ email: `novo${DOMINIO}`, id: conviteBId, grupoId: grupoBId });
    const convite = await prisma.convite.findFirstOrThrow({ where: { email: `novo${DOMINIO}` } });
    expect(convite.grupoId).toBe(grupoAId);
    expect(convite.id).not.toBe(conviteBId);
    expect((await prisma.convite.findUniqueOrThrow({ where: { id: conviteBId } })).email).toBe(`convidado${DOMINIO}`);
  });
});
