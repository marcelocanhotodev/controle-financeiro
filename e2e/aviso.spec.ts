import { test, expect } from "@playwright/test";

// Capability estrutura-app — Requirement "Avisos de retorno". Usa a página de
// exemplo /teste/aviso (só existe com PAGINAS_DE_TESTE=1).

test("aviso aparece embaixo, é anunciado e some sozinho em 6 segundos", async ({ page }) => {
  await page.clock.install();
  await page.goto("/teste/aviso");
  await expect(page.locator("main[data-hidratado=sim]")).toBeVisible();

  await page.getByRole("button", { name: "Ação simples" }).click();
  const regiao = page.getByRole("status");
  await expect(regiao).toHaveAttribute("aria-live", "polite");
  await expect(regiao).toContainText("Ação concluída.");

  const caixa = await regiao.getByText("Ação concluída.").boundingBox();
  const tela = page.viewportSize()!;
  expect(caixa!.y).toBeGreaterThan(tela.height / 2);

  // O relógio instalado continua correndo sozinho entre os passos do teste,
  // então há 1 s de folga de cada lado. O limite exato de 6 s é coberto por
  // src/components/aviso-regras.test.ts.
  await page.clock.runFor(5_000);
  await expect(regiao).toContainText("Ação concluída.");
  await page.clock.runFor(1_500);
  await expect(regiao).not.toContainText("Ação concluída.");
});

test("aviso de ação reversível traz o botão Desfazer enquanto visível", async ({ page }) => {
  await page.clock.install();
  await page.goto("/teste/aviso");
  await expect(page.locator("main[data-hidratado=sim]")).toBeVisible();

  await page.getByRole("button", { name: "Ação reversível" }).click();
  const desfazer = page.getByRole("status").getByRole("button", { name: "Desfazer" });
  await expect(desfazer).toBeVisible();

  await desfazer.click();
  await expect(page.getByText("Desfeito", { exact: true })).toBeVisible();
  await expect(desfazer).toHaveCount(0);

  await page.getByRole("button", { name: "Ação reversível" }).click();
  await page.clock.runFor(6_100);
  await expect(page.getByRole("status").getByRole("button", { name: "Desfazer" })).toHaveCount(0);
});
