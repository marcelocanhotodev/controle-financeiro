// Tarefa 3.1 — getGrupoAtual() e exigirAdmin() (spec grupos, Requirements
// "Lista de grupos e grupo ativo", "Papéis e permissões" e "Remoção de
// membro").
//
// PRÉ-REQUISITO: Postgres do docker-compose rodando e migrado.

import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: authMock }));
// Fora do Next, redirect() só precisa interromper a execução.
vi.mock("next/navigation", () => ({
  redirect: (destino: string) => {
    throw new Error(`REDIRECT ${destino}`);
  },
}));

import { prisma } from "@/lib/prisma";
import { getGrupoAtual, resolverGrupoAtual, SemGrupoAtivoError } from "@/lib/grupo-atual";
import { exigirAdmin, NaoAutorizadoError } from "@/lib/rbac";

const DOMINIO = "@grupo-atual.caixa.test";
const PREFIXO_CODIGO = "TGAT";
let pedroId: number;
let casaId: number;
let viagemId: number;

const sessaoDe = (id: number) => ({ id: String(id), emitidoEm: Date.now() });

async function limpar() {
  await prisma.grupo.deleteMany({ where: { codigo: { startsWith: PREFIXO_CODIGO } } });
  await prisma.usuario.deleteMany({ where: { email: { endsWith: DOMINIO } } });
}

beforeEach(async () => {
  await limpar();
  pedroId = (await prisma.usuario.create({ data: { nome: "Pedro", email: `pedro${DOMINIO}`, senhaHash: "x" } })).id;
  casaId = (await prisma.grupo.create({ data: { nome: "Finanças da Casa", codigo: `${PREFIXO_CODIGO}-0001` } })).id;
  viagemId = (await prisma.grupo.create({ data: { nome: "Viagem de Dezembro", codigo: `${PREFIXO_CODIGO}-0002` } })).id;
  await prisma.participacao.create({
    data: { usuarioId: pedroId, grupoId: casaId, papel: "MEMBRO", entrouEm: new Date("2026-01-01") },
  });
  await prisma.participacao.create({
    data: { usuarioId: pedroId, grupoId: viagemId, papel: "ADMIN", entrouEm: new Date("2026-02-01") },
  });
  await prisma.usuario.update({ where: { id: pedroId }, data: { grupoAtivoId: viagemId } });
});

afterAll(limpar);

describe("resolverGrupoAtual", () => {
  it("participação válida: devolve o grupo ativo e o papel, sem trocar nada", async () => {
    const grupo = await resolverGrupoAtual(sessaoDe(pedroId));
    expect(grupo).toMatchObject({ grupoId: viagemId, grupoNome: "Viagem de Dezembro", papel: "ADMIN" });
    expect(grupo?.trocouDe).toBeUndefined();
  });

  it("sem grupo ativo gravado: escolhe a participação mais antiga, sem aviso", async () => {
    await prisma.usuario.update({ where: { id: pedroId }, data: { grupoAtivoId: null } });
    const grupo = await resolverGrupoAtual(sessaoDe(pedroId));
    expect(grupo).toMatchObject({ grupoId: casaId, papel: "MEMBRO" });
    expect(grupo?.trocouDe).toBeUndefined();
    expect((await prisma.usuario.findUniqueOrThrow({ where: { id: pedroId } })).grupoAtivoId).toBe(casaId);
  });

  it('Scenario "Grupo ativo deixa de valer e há outro grupo" — troca, grava e avisa só na primeira vez', async () => {
    await prisma.participacao.delete({ where: { usuarioId_grupoId: { usuarioId: pedroId, grupoId: viagemId } } });

    const primeira = await resolverGrupoAtual(sessaoDe(pedroId));
    expect(primeira).toMatchObject({ grupoId: casaId, trocouDe: "Viagem de Dezembro" });
    expect((await prisma.usuario.findUniqueOrThrow({ where: { id: pedroId } })).grupoAtivoId).toBe(casaId);

    const segunda = await resolverGrupoAtual(sessaoDe(pedroId));
    expect(segunda?.grupoId).toBe(casaId);
    expect(segunda?.trocouDe).toBeUndefined();
  });

  it("grupo ativo excluído: troca sem nome de grupo anterior", async () => {
    await prisma.grupo.delete({ where: { id: viagemId } });
    const grupo = await resolverGrupoAtual(sessaoDe(pedroId));
    expect(grupo?.grupoId).toBe(casaId);
    expect(grupo?.trocouDe).toBeUndefined();
  });

  it("removido sem outro grupo: SemGrupoAtivoError e grupo ativo vazio", async () => {
    await prisma.participacao.deleteMany({ where: { usuarioId: pedroId } });
    await expect(resolverGrupoAtual(sessaoDe(pedroId))).rejects.toBeInstanceOf(SemGrupoAtivoError);
    expect((await prisma.usuario.findUniqueOrThrow({ where: { id: pedroId } })).grupoAtivoId).toBeNull();
  });

  it("sessão inválida ou anterior à redefinição de senha devolve null", async () => {
    expect(await resolverGrupoAtual(null)).toBeNull();
    await prisma.usuario.update({ where: { id: pedroId }, data: { senhaAlteradaEm: new Date() } });
    expect(await resolverGrupoAtual({ id: String(pedroId), emitidoEm: 1 })).toBeNull();
  });
});

describe("getGrupoAtual e exigirAdmin", () => {
  it("sem sessão, leva a /login", async () => {
    authMock.mockResolvedValue(null);
    await expect(getGrupoAtual()).rejects.toThrow("REDIRECT /login");
  });

  it("Administradora do grupo ativo passa em exigirAdmin", async () => {
    authMock.mockResolvedValue({ user: sessaoDe(pedroId) });
    await expect(exigirAdmin()).resolves.toMatchObject({ grupoId: viagemId, papel: "ADMIN" });
  });

  it("Membro comum é recusado em exigirAdmin", async () => {
    await prisma.usuario.update({ where: { id: pedroId }, data: { grupoAtivoId: casaId } });
    authMock.mockResolvedValue({ user: sessaoDe(pedroId) });
    await expect(exigirAdmin()).rejects.toBeInstanceOf(NaoAutorizadoError);
  });
});
