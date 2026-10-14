import { describe, it, expect } from "vitest";
import { criarAviso, avisoVisivel, msAteExpirar, DURACAO_AVISO_MS } from "@/components/aviso-regras";

// Capability estrutura-app — Requirement "Avisos de retorno".
describe("aviso de retorno", () => {
  const agora = 1_000_000;

  it("dura 6 segundos", () => {
    expect(DURACAO_AVISO_MS).toBe(6_000);
    const aviso = criarAviso(1, "Pronto.", agora);
    expect(msAteExpirar(aviso, agora)).toBe(6_000);
  });

  it("fica visível até o fim do prazo e some depois", () => {
    const aviso = criarAviso(1, "Pronto.", agora);
    expect(avisoVisivel(aviso, agora)).toBe(true);
    expect(avisoVisivel(aviso, agora + 5_999)).toBe(true);
    expect(avisoVisivel(aviso, agora + 6_000)).toBe(false);
  });

  it("sem aviso, nada é visível", () => {
    expect(avisoVisivel(null, agora)).toBe(false);
  });

  it("a ação acompanha o aviso e some junto com ele", () => {
    const aviso = criarAviso(2, "Excluído.", agora, { rotulo: "Desfazer", executar: () => {} });
    expect(aviso.acao?.rotulo).toBe("Desfazer");
    expect(avisoVisivel(aviso, agora + 6_000)).toBe(false);
  });

  it("o tempo restante nunca fica negativo", () => {
    const aviso = criarAviso(3, "Pronto.", agora);
    expect(msAteExpirar(aviso, agora + 10_000)).toBe(0);
  });
});
