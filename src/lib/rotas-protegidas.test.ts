// Tarefa 2.3 — regra do middleware (spec autenticacao, "Proteção de acesso").

import { describe, it, expect } from "vitest";
import { decidirRedirecionamento } from "@/lib/rotas-protegidas";

describe("decidirRedirecionamento", () => {
  it.each(["/resumo", "/lancamentos", "/grupo", "/"])(
    'Scenario "Página interna sem login" — %s sem sessão leva a /login',
    (pathname) => {
      expect(decidirRedirecionamento({ pathname, autenticado: false })).toBe("/login");
    },
  );

  it.each([
    "/login",
    "/criar-conta",
    "/esqueci-senha",
    "/definir-senha/abc123",
    "/convite/abc123",
    "/offline",
    "/teste/aviso",
  ])('Scenario "Páginas públicas" — %s abre sem sessão', (pathname) => {
    expect(decidirRedirecionamento({ pathname, autenticado: false })).toBeNull();
  });

  it("não trata um prefixo solto como rota pública", () => {
    expect(decidirRedirecionamento({ pathname: "/loginx", autenticado: false })).toBe("/login");
    expect(decidirRedirecionamento({ pathname: "/convites-falsos", autenticado: false })).toBe("/login");
  });

  it("com sessão, páginas internas seguem", () => {
    expect(decidirRedirecionamento({ pathname: "/resumo", autenticado: true })).toBeNull();
  });
});
