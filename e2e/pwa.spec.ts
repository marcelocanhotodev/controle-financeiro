import { test, expect, type Page } from "@playwright/test";

// Capability estrutura-app — Requirement "Instalação como app".

async function esperarServiceWorkerNoControle(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) return;
    await new Promise<void>((resolve) =>
      navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true })
    );
  });
}

test("o Chrome considera o app instalável", async ({ page }) => {
  await page.goto("/resumo");
  await esperarServiceWorkerNoControle(page);

  const cdp = await page.context().newCDPSession(page);
  const { installabilityErrors } = await cdp.send("Page.getInstallabilityErrors");
  expect(installabilityErrors.map((e) => e.errorId)).toEqual([]);
});

test("o manifesto instala com o nome do produto, abre em tela cheia e tem ícones válidos", async ({ request }) => {
  const manifesto = await (await request.get("/manifest.webmanifest")).json();
  expect(manifesto.name).toBe("Caixa Comum");
  expect(manifesto.display).toBe("standalone");

  for (const icone of manifesto.icons as { src: string; sizes: string; type: string }[]) {
    const resposta = await request.get(icone.src);
    expect(resposta.status(), icone.src).toBe(200);
    expect(resposta.headers()["content-type"]).toBe(icone.type);
  }
});

test("sem conexão, o app carrega e avisa que precisa de internet", async ({ page, context }) => {
  await page.goto("/resumo");
  await esperarServiceWorkerNoControle(page);

  await context.setOffline(true);
  await page.goto("/lancamentos");

  await expect(page.getByRole("heading", { level: 1, name: "Sem conexão" })).toBeVisible();
  await expect(page.getByText("É preciso conexão com a internet para ver e registrar lançamentos.")).toBeVisible();
  // O visual do app também veio do cache: o nome aparece com a cor de destaque.
  await expect(page.getByText("Caixa Comum", { exact: true })).toHaveCSS("color", "rgb(43, 71, 201)");

  await context.setOffline(false);
});
