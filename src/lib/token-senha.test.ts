// Tarefa 2.8 — link de definir senha: só o hash no banco, uso único,
// validade e invalidação dos outros REDEFINIR sem afetar CRIAR de outros
// convites.
//
// PRÉ-REQUISITO: Postgres do docker-compose rodando e migrado.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  buscarTokenValido,
  consumirToken,
  criarTokenSenha,
  hashToken,
  invalidarTokensDoConvite,
} from "@/lib/token-senha";

const DOMINIO = "@token-senha.caixa.test";
const daquiA = (ms: number) => new Date(Date.now() + ms);
const HORA = 60 * 60 * 1000;

let usuarioId: number;
let conviteAId: number;
let conviteBId: number;

async function limpar() {
  const usuarios = await prisma.usuario.findMany({ where: { email: { endsWith: DOMINIO } }, select: { id: true } });
  await prisma.grupo.deleteMany({ where: { codigo: { in: ["TTOKA-0001", "TTOKB-0002"] } } });
  await prisma.usuario.deleteMany({ where: { id: { in: usuarios.map((u) => u.id) } } });
}

beforeAll(async () => {
  await limpar();
  const usuario = await prisma.usuario.create({ data: { nome: "Ana", email: `ana${DOMINIO}`, senhaHash: "x" } });
  usuarioId = usuario.id;
  const grupoA = await prisma.grupo.create({ data: { nome: "A", codigo: "TTOKA-0001" } });
  const grupoB = await prisma.grupo.create({ data: { nome: "B", codigo: "TTOKB-0002" } });
  const convite = (grupoId: number, token: string) =>
    prisma.convite.create({
      data: { grupoId, email: `joana${DOMINIO}`, token, criadoPorId: usuarioId, expiraEm: daquiA(7 * 24 * HORA) },
    });
  conviteAId = (await convite(grupoA.id, `tok-a-${Date.now()}`)).id;
  conviteBId = (await convite(grupoB.id, `tok-b-${Date.now()}`)).id;
});

afterAll(limpar);

const redefinir = () =>
  criarTokenSenha({ finalidade: "REDEFINIR", email: `ana${DOMINIO}`, usuarioId, expiraEm: daquiA(HORA) });
const criarDoConvite = (conviteId: number) =>
  criarTokenSenha({ finalidade: "CRIAR", email: `joana${DOMINIO}`, conviteId, expiraEm: daquiA(7 * 24 * HORA) });

describe("token de definir senha", () => {
  it("guarda só o sha256: o valor puro não aparece no banco", async () => {
    const valor = await redefinir();
    expect(valor).toMatch(/^[0-9a-f]{64}$/);

    const registro = await prisma.tokenSenha.findUniqueOrThrow({ where: { tokenHash: hashToken(valor) } });
    const linhas = await prisma.$queryRaw<{ linha: string }[]>`
      SELECT row_to_json(t)::text AS linha FROM tokens_senha t WHERE t.id = ${registro.id}`;
    expect(linhas[0].linha).not.toContain(valor);
  });

  it("é de uso único", async () => {
    const valor = await redefinir();
    const token = await buscarTokenValido(valor);
    expect(token).not.toBeNull();

    expect(await consumirToken(token!, prisma)).toBe(true);
    expect(await buscarTokenValido(valor)).toBeNull();
    // Um segundo pedido com o mesmo token em mãos não consegue usá-lo de novo.
    expect(await consumirToken(token!, prisma)).toBe(false);
  });

  it("vencido ou inexistente não vale", async () => {
    const vencido = await criarTokenSenha({
      finalidade: "REDEFINIR",
      email: `ana${DOMINIO}`,
      usuarioId,
      expiraEm: daquiA(-1),
    });
    expect(await buscarTokenValido(vencido)).toBeNull();
    expect(await buscarTokenValido("f".repeat(64))).toBeNull();
    expect(await buscarTokenValido("")).toBeNull();
  });

  it("usar um REDEFINIR invalida os outros REDEFINIR da conta, sem afetar CRIAR de convites", async () => {
    const primeiro = await redefinir();
    const segundo = await redefinir();
    const criarA = await criarDoConvite(conviteAId);

    await consumirToken((await buscarTokenValido(segundo))!, prisma);

    expect(await buscarTokenValido(primeiro)).toBeNull();
    expect(await buscarTokenValido(criarA)).not.toBeNull();
  });

  it("usar o CRIAR de um convite não afeta o CRIAR de convite de outro grupo", async () => {
    const criarA = await criarDoConvite(conviteAId);
    const criarB = await criarDoConvite(conviteBId);

    await consumirToken((await buscarTokenValido(criarA))!, prisma);

    expect(await buscarTokenValido(criarB)).not.toBeNull();
  });

  it("o reenvio invalida o CRIAR anterior do mesmo convite", async () => {
    const anterior = await criarDoConvite(conviteAId);
    const outroConvite = await criarDoConvite(conviteBId);

    await invalidarTokensDoConvite(conviteAId);

    expect(await buscarTokenValido(anterior)).toBeNull();
    expect(await buscarTokenValido(outroConvite)).not.toBeNull();
  });
});
