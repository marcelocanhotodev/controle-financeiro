import { test, expect } from "@playwright/test";

// Capability estrutura-app — Requirement "Layout responsivo": sem rolagem
// horizontal a partir de 360 px e margem lateral mínima de 16 px.

for (const largura of [360, 400]) {
  test.describe(`tela de ${largura} px`, () => {
    test.use({ viewport: { width: largura, height: 800 } });

    for (const rota of ["/resumo", "/lancamentos", "/grupo"]) {
      test(`${rota} não rola na horizontal e mantém 16 px de margem`, async ({ page }) => {
        await page.goto(rota);

        // Compara com a largura configurada, não com window.innerWidth: no
        // projeto "celular" (isMobile), o navegador amplia o innerWidth para
        // caber um conteúdo largo demais, o que esconderia a rolagem.
        const larguraTela = largura;
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(larguraTela);

        const caixa = await page.locator("main").boundingBox();
        expect(caixa).not.toBeNull();
        expect(caixa!.x).toBeGreaterThanOrEqual(16);
        expect(larguraTela - (caixa!.x + caixa!.width)).toBeGreaterThanOrEqual(16);
      });
    }
  });
}

test.describe("conteúdo largo", () => {
  test.use({ viewport: { width: 360, height: 800 } });

  test("rola dentro do próprio quadro, nunca a página inteira", async ({ page }) => {
    await page.goto("/resumo");

    // Simula uma tabela larga dentro de um quadro rolável, como as que
    // chegam em lancamentos e resumo-mensal.
    await page.locator("main").evaluate((main) => {
      const quadro = document.createElement("div");
      quadro.className = "quadro quadro-rolavel";
      quadro.dataset.testid = "quadro-largo";
      const tabela = document.createElement("div");
      tabela.style.width = "900px";
      tabela.textContent = "conteúdo largo";
      quadro.appendChild(tabela);
      main.appendChild(quadro);
    });

    const quadro = page.locator("[data-testid=quadro-largo]");
    const { rolaNoQuadro, rolaNaPagina } = await quadro.evaluate((el) => ({
      rolaNoQuadro: el.scrollWidth > el.clientWidth,
      rolaNaPagina: document.documentElement.scrollWidth > 360,
    }));
    expect(rolaNoQuadro).toBe(true);
    expect(rolaNaPagina).toBe(false);
  });
});
