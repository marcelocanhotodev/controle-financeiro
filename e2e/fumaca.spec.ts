import { test, expect } from "@playwright/test";

// Teste de fumaça: o app sobe e a página inicial abre.
test("a página inicial abre", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Caixa Comum");
});
