import { test, expect } from "@playwright/test";

// Capability estrutura-app — Requirements "Navegação por seções" e
// "Barra superior".

test("abrir o app leva à aba Resumo, marcada como ativa", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/resumo$/);
  const abas = page.getByRole("navigation", { name: "Seções" });
  await expect(abas.getByRole("link", { name: "Resumo" })).toHaveAttribute("aria-current", "page");
  await expect(abas.getByRole("link", { name: "Lançamentos" })).not.toHaveAttribute("aria-current");
});

test("tocar em uma aba mostra a seção e muda a aba ativa", async ({ page }) => {
  await page.goto("/resumo");
  const abas = page.getByRole("navigation", { name: "Seções" });

  await abas.getByRole("link", { name: "Lançamentos" }).click();
  await expect(page).toHaveURL(/\/lancamentos$/);
  await expect(page.getByRole("heading", { level: 1, name: "Lançamentos" })).toBeVisible();
  await expect(abas.getByRole("link", { name: "Lançamentos" })).toHaveAttribute("aria-current", "page");
  await expect(abas.getByRole("link", { name: "Resumo" })).not.toHaveAttribute("aria-current");

  await abas.getByRole("link", { name: "Grupo" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Grupo" })).toBeVisible();
  await expect(abas.getByRole("link", { name: "Grupo" })).toHaveAttribute("aria-current", "page");
});

test("o topo mostra o nome do app em todas as abas", async ({ page }) => {
  for (const rota of ["/resumo", "/lancamentos", "/grupo"]) {
    await page.goto(rota);
    await expect(page.getByRole("banner")).toContainText("Caixa Comum");
  }
});
