// Tarefa 2.1 — o JWT guarda só `id`, `email` e `emitidoEm`, e a renovação da
// sessão preserva `emitidoEm` (base da queda das sessões ao redefinir a senha).

import { describe, it, expect } from "vitest";
import { montarTokenSessao } from "@/lib/sessao-token";

describe("montarTokenSessao", () => {
  it("no login grava id, email e emitidoEm, sem grupo ativo", () => {
    const token = montarTokenSessao({}, { id: "7", email: "ana@exemplo.com" }, 1_000);
    expect(token).toEqual({ id: "7", email: "ana@exemplo.com", emitidoEm: 1_000 });
  });

  it("na renovação (sem user) preserva o emitidoEm do login", () => {
    const noLogin = montarTokenSessao({}, { id: "7", email: "ana@exemplo.com" }, 1_000);
    const renovado = montarTokenSessao({ ...noLogin, iat: 999_999 }, undefined, 5_000);
    expect(renovado.emitidoEm).toBe(1_000);
    expect(renovado.id).toBe("7");
  });
});
