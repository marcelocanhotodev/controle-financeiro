import { test, expect, type Page } from "@playwright/test";

// Capability estrutura-app — Requirement "Tema claro e escuro". As cores
// esperadas são os tokens --bg, --in e --out do protótipo.

async function cor(page: Page, variavel: string) {
  return page.evaluate((v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim(), variavel);
}

test.describe("aparelho no modo claro", () => {
  test.use({ colorScheme: "light" });

  test("usa a paleta clara", async ({ page }) => {
    await page.goto("/resumo");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(238, 241, 240)");
  });
});

test.describe("aparelho no modo escuro", () => {
  test.use({ colorScheme: "dark" });

  test("usa a paleta escura em todas as abas", async ({ page }) => {
    for (const rota of ["/resumo", "/lancamentos", "/grupo"]) {
      await page.goto(rota);
      await expect(page.locator("body")).toHaveCSS("background-color", "rgb(15, 21, 19)");
      await expect(page.locator("body")).toHaveCSS("color", "rgb(231, 238, 235)");
    }
  });

  test("entrada, saída e alerta continuam distinguíveis", async ({ page }) => {
    await page.goto("/resumo");
    const entrada = await cor(page, "--in");
    const saida = await cor(page, "--out");
    const fundo = await cor(page, "--bg");

    expect(entrada).toBe("#4fd39a");
    expect(saida).toBe("#ff8a80");
    expect(new Set([entrada, saida, fundo]).size).toBe(3);
  });
});
