import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Capability estrutura-app — Requirement "Acessibilidade".

for (const rota of ["/resumo", "/lancamentos", "/grupo"]) {
  for (const tema of ["light", "dark"] as const) {
    test(`${rota} no tema ${tema === "light" ? "claro" : "escuro"} não tem violações de acessibilidade`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: tema });
      await page.goto(rota);

      const resultado = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

      expect(resultado.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  }
}

test("o padrão de campo associa rótulo, dica e erro, e o botão de ícone tem nome acessível", async ({ page }) => {
  await page.goto("/teste/formulario");

  const descricao = page.getByLabel("Descrição");
  await expect(descricao).toBeVisible();
  await expect(descricao).toHaveAccessibleDescription("Ex.: Mercado da semana");

  const valor = page.getByLabel("Valor");
  await expect(valor).toHaveAttribute("aria-invalid", "true");
  await expect(valor).toHaveAccessibleDescription("Informe um valor maior que zero, como 125,90.");
  // Dentro do main: o Next.js tem o próprio anunciador de rotas com role="alert".
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Informe um valor maior que zero, como 125,90.");

  await expect(page.getByLabel("Categoria")).toBeVisible();
  await expect(page.getByRole("button", { name: "Excluir Mercado da semana" })).toBeVisible();

  const resultado = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(resultado.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});

test("todos os elementos interativos recebem foco com contorno visível pelo teclado", async ({ page }) => {
  await page.goto("/resumo");
  const interativos = await page.locator("a[href], button, input, select, textarea").count();
  expect(interativos).toBeGreaterThan(0);

  for (let i = 0; i < interativos; i++) {
    await page.keyboard.press("Tab");
    const foco = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const estilo = getComputedStyle(el);
      return { texto: el.textContent?.trim(), contorno: estilo.outlineStyle, largura: estilo.outlineWidth };
    });
    expect(foco, `Tab ${i + 1} não chegou a um elemento`).not.toBeNull();
    expect(foco!.contorno, `sem contorno em "${foco!.texto}"`).not.toBe("none");
    expect(foco!.largura).not.toBe("0px");
  }
});
