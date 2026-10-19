import { describe, it, expect } from "vitest";
import { destinoSeguro } from "@/lib/url-retorno";

describe("destinoSeguro", () => {
  it("aceita caminhos do próprio app", () => {
    expect(destinoSeguro("/convite/abc")).toBe("/convite/abc");
  });

  it.each([null, "", "https://outro.site/x", "//outro.site", "/\\outro.site", "javascript:alert(1)"])(
    "troca %s pela aba Resumo",
    (valor) => {
      expect(destinoSeguro(valor)).toBe("/resumo");
    },
  );
});
