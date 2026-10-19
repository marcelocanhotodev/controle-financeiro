// Formato do código do grupo (design.md, "Código do grupo") e nova tentativa
// quando o código sorteado já existe.

import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { comCodigoUnico, gerarCodigoGrupo, normalizarCodigo } from "@/lib/codigo-grupo";

describe("gerarCodigoGrupo", () => {
  it("usa até 6 letras do nome, sem acentos e em maiúsculas, mais 4 dígitos", () => {
    expect(gerarCodigoGrupo("Viagem de Dezembro", () => 4821)).toBe("VIAGEM-4821");
    expect(gerarCodigoGrupo("Ação", () => 7)).toBe("ACAO-0007");
  });

  it('usa "GRUPO" quando o nome não tem letras', () => {
    expect(gerarCodigoGrupo("2026", () => 1234)).toBe("GRUPO-1234");
  });
});

describe("normalizarCodigo", () => {
  it("compara sem diferenciar maiúsculas", () => {
    expect(normalizarCodigo(" viagem-4821 ")).toBe("VIAGEM-4821");
  });
});

describe("comCodigoUnico", () => {
  const conflito = (target: string) =>
    new Prisma.PrismaClientKnownRequestError("único", { code: "P2002", clientVersion: "5", meta: { target: [target] } });

  it("tenta de novo com outro código quando o banco recusa por código repetido", async () => {
    const criar = vi.fn().mockRejectedValueOnce(conflito("codigo")).mockResolvedValueOnce("criado");
    await expect(comCodigoUnico("Casa", criar)).resolves.toBe("criado");
    expect(criar).toHaveBeenCalledTimes(2);
  });

  it("não engole conflitos de outras colunas", async () => {
    const criar = vi.fn().mockRejectedValue(conflito("email"));
    await expect(comCodigoUnico("Casa", criar)).rejects.toThrow();
    expect(criar).toHaveBeenCalledTimes(1);
  });
});
