import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { banco, criarGrupoCom, idDaConta } from "./banco";

// Capability resumo — aba Resumo. Tarefas 2.1 (cartões e comparação), 2.2
// (gráfico), 2.3 (categorias e "Quem registrou"), 2.4 (estados vazios), 2.5
// (mês compartilhado com Lançamentos e troca de grupo) e 2.7
// (acessibilidade).
//
// Cada teste cria a própria conta e os próprios lançamentos: os projetos
// celular e desktop rodam em paralelo e não podem escrever no mesmo grupo.

test.use({ storageState: { cookies: [], origins: [] } });

test.afterAll(async () => {
  await banco.$disconnect();
});

function sufixo(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function criarConta(page: Page, nome: string): Promise<{ usuarioId: number; grupoId: number }> {
  const email = `e2e-resumo-${sufixo()}@caixa.test`;
  await page.goto("/criar-conta");
  await page.getByLabel("Nome").fill(nome);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senha-forte-123");
  await page.getByRole("button", { name: "Criar conta" }).last().click();
  await expect(page).toHaveURL(/\/resumo$/);
  const usuarioId = await idDaConta(email);
  const { grupoAtivoId } = await banco.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
  return { usuarioId, grupoId: grupoAtivoId! };
}

/** Outra pessoa, direto no banco; `membroDe` a coloca no grupo. */
async function criarPessoa(nome: string, membroDe?: number): Promise<number> {
  const { id } = await banco.usuario.create({ data: { nome, email: `e2e-resumo-${sufixo()}@caixa.test`, senhaHash: "x" } });
  if (membroDe) await banco.participacao.create({ data: { usuarioId: id, grupoId: membroDe, papel: "MEMBRO" } });
  return id;
}

async function lancar(
  grupoId: number,
  autorId: number,
  dados: { tipo: "ENTRADA" | "SAIDA"; valor: string; data: string; categoria?: string },
) {
  await banco.lancamento.create({
    data: {
      grupoId,
      autorId,
      tipo: dados.tipo,
      descricao: `${dados.tipo} ${dados.valor}`,
      valor: dados.valor,
      categoria: dados.categoria ?? (dados.tipo === "ENTRADA" ? "Salário" : "Contas"),
      data: new Date(`${dados.data}T00:00:00Z`),
    },
  });
}

/** Mês atual em São Paulo deslocado `delta` meses, como "2026-09". */
function chaveDoMes(delta = 0): string {
  const [ano, mes] = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" })
    .format(new Date())
    .split("-")
    .map(Number);
  const total = ano * 12 + (mes - 1) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** "setembro". */
function nomeDoMes(chave: string): string {
  const [ano, mes] = chave.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, 15)).toLocaleDateString("pt-BR", { month: "long", timeZone: "UTC" });
}

/** "Setembro de 2026". */
function nomeComAno(chave: string): string {
  const nome = nomeDoMes(chave);
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${chave.slice(0, 4)}`;
}

const resumoDoMes = (page: Page) => page.getByRole("region", { name: "Resumo do mês" });
const quadro = (page: Page, titulo: string) => page.getByRole("region", { name: titulo });
const barras = (page: Page) => page.locator(".recharts-bar-rectangle");

/** Grupo com Ana (conta da sessão), Marcelo e Joana membros, Pedro
 * ex-membro com lançamentos no mês atual, e saídas no mês anterior. */
async function montarGrupoCompleto(page: Page) {
  const { usuarioId: anaId, grupoId } = await criarConta(page, "Ana Lima");
  const marceloId = await criarPessoa("Marcelo Souza", grupoId);
  await criarPessoa("Joana Reis", grupoId);
  const pedroId = await criarPessoa("Pedro Alves");
  const mes = chaveDoMes();
  await lancar(grupoId, anaId, { tipo: "ENTRADA", valor: "5400", data: `${mes}-01` });
  await lancar(grupoId, marceloId, { tipo: "SAIDA", valor: "1850", data: `${mes}-01`, categoria: "Moradia" });
  await lancar(grupoId, marceloId, { tipo: "SAIDA", valor: "520", data: `${mes}-01`, categoria: "Moradia" });
  await lancar(grupoId, anaId, { tipo: "SAIDA", valor: "1600", data: `${mes}-01`, categoria: "Mercado" });
  await lancar(grupoId, pedroId, { tipo: "SAIDA", valor: "400", data: `${mes}-01`, categoria: "Lazer" });
  await lancar(grupoId, pedroId, { tipo: "ENTRADA", valor: "850", data: `${mes}-01`, categoria: "Extra" });
  await lancar(grupoId, anaId, { tipo: "SAIDA", valor: "4000", data: `${chaveDoMes(-1)}-10` });
  await page.goto("/resumo");
}

test("cartões de saldo, entradas e saídas, com a comparação com o mês anterior", async ({ page }) => {
  await montarGrupoCompleto(page);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Grupo de Ana");
  const resumo = resumoDoMes(page);
  await expect(resumo).toContainText(`Saldo de ${nomeDoMes(chaveDoMes())}`);
  await expect(resumo.getByTestId("saldo")).toHaveText("R$ 1.880,00");
  await expect(resumo.getByTestId("entradas")).toHaveText("+ R$ 6.250,00");
  await expect(resumo.getByTestId("saidas")).toHaveText("− R$ 4.370,00");
  // 4.370 contra 4.000: 9,25%, arredondado para 9%.
  await expect(resumo).toContainText(`Saídas 9% maiores que em ${nomeDoMes(chaveDoMes(-1))}.`);
});

test("saldo negativo em destaque de alerta e com sinal de menos", async ({ page }) => {
  const { usuarioId, grupoId } = await criarConta(page, "Marcelo Souza");
  await lancar(grupoId, usuarioId, { tipo: "SAIDA", valor: "300", data: `${chaveDoMes()}-01` });
  await page.goto("/resumo");

  const saldo = resumoDoMes(page).getByTestId("saldo");
  await expect(saldo).toHaveText("-R$ 300,00");
  await expect(saldo).toHaveClass(/text-saida/);
  // Sem mês anterior com saídas, não há comparação.
  await expect(resumoDoMes(page)).not.toContainText("que em");
});

test("gráfico de seis meses: escala a partir de zero, legenda e valor exato na dica", async ({ page }) => {
  await montarGrupoCompleto(page);
  const grafico = quadro(page, "Últimos 6 meses");

  await expect(grafico).toContainText("Entradas");
  await expect(grafico).toContainText("Saídas");
  await expect(grafico.locator(".recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value")).toHaveText([
    "0",
    "2 mil",
    "4 mil",
    "6 mil",
    "8 mil",
  ]);
  // Seis meses no eixo, terminando no mês atual.
  await expect(grafico.locator(".recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value")).toHaveCount(6);
  // Barras do mês atual com opacidade cheia, as do anterior atenuadas (só
  // há saídas no mês anterior; barras de valor zero não são desenhadas).
  const saidas = page.locator(".recharts-bar-rectangle path[name=\"Saídas\"]");
  await expect(saidas).toHaveCount(2);
  await expect(saidas.first()).toHaveAttribute("fill-opacity", "0.5");
  await expect(saidas.last()).toHaveAttribute("fill-opacity", "1");

  await barras(page).last().hover();
  const dica = page.getByTestId("dica-grafico");
  await expect(dica).toContainText(nomeComAno(chaveDoMes()));
  await expect(dica).toContainText("Entradas: R$ 6.250,00");
  await expect(dica).toContainText("Saídas: R$ 4.370,00");
});

test("saídas por categoria em ordem e quem registrou, com o ex-membro opaco", async ({ page }) => {
  await montarGrupoCompleto(page);

  const categorias = quadro(page, "Saídas por categoria").getByRole("listitem");
  await expect(categorias).toHaveCount(3);
  await expect(categorias.nth(0)).toContainText("MoradiaR$ 2.370,00 54%");
  await expect(categorias.nth(1)).toContainText("MercadoR$ 1.600,00 37%");
  await expect(categorias.nth(2)).toContainText("LazerR$ 400,00 9%");

  const linhas = quadro(page, "Quem registrou").locator("tbody tr");
  await expect(linhas.locator("th")).toHaveText(["Ana Lima", "Joana Reis", "Marcelo Souza", "Pedro Alves (ex-membro)"]);
  await expect(linhas.nth(1).locator("td")).toHaveText(["R$ 0,00", "R$ 0,00"]);
  const pedro = linhas.nth(3);
  await expect(pedro.locator("td")).toHaveText(["R$ 850,00", "R$ 400,00"]);
  await expect(pedro).toHaveAttribute("data-ex-membro", "true");
  await expect(pedro).toHaveCSS("opacity", "0.7");
  await expect(linhas.nth(0)).not.toHaveAttribute("data-ex-membro");
});

test("grupo novo: zeros, gráfico sem barras e convite para o primeiro lançamento", async ({ page }) => {
  await criarConta(page, "Joana Reis");

  await expect(resumoDoMes(page).getByTestId("saldo")).toHaveText("R$ 0,00");
  await expect(resumoDoMes(page).getByTestId("entradas")).toHaveText("+ R$ 0,00");
  await expect(resumoDoMes(page).getByTestId("saidas")).toHaveText("− R$ 0,00");
  await expect(quadro(page, "Últimos 6 meses").locator(".recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value")).toHaveCount(6);
  await expect(barras(page)).toHaveCount(0);
  await expect(quadro(page, "Saídas por categoria")).toContainText("Nenhuma saída registrada neste mês.");

  await page.getByRole("link", { name: "Registre o primeiro lançamento" }).click();
  await expect(page).toHaveURL(/\/lancamentos$/);
});

test("mês vazio num grupo com lançamentos: zeros, gráfico com os outros meses e sem o convite", async ({ page }) => {
  const { usuarioId, grupoId } = await criarConta(page, "Pedro Alves");
  await lancar(grupoId, usuarioId, { tipo: "SAIDA", valor: "250", data: `${chaveDoMes(-2)}-10` });
  await page.goto("/resumo");

  await expect(resumoDoMes(page).getByTestId("saldo")).toHaveText("R$ 0,00");
  await expect(resumoDoMes(page)).toContainText(`Nenhum lançamento em ${nomeDoMes(chaveDoMes())} de ${chaveDoMes().slice(0, 4)}.`);
  await expect(page.getByRole("link", { name: "Registre o primeiro lançamento" })).toHaveCount(0);
  await expect(barras(page)).toHaveCount(1);
});

test("o mês escolhido passa entre Resumo e Lançamentos, e trocar de grupo volta ao mês atual", async ({ page }) => {
  const { usuarioId, grupoId } = await criarConta(page, "Ana Lima");
  const anterior = chaveDoMes(-1);
  const retrasado = chaveDoMes(-2);
  await lancar(grupoId, usuarioId, { tipo: "SAIDA", valor: "100", data: `${anterior}-10` });
  await lancar(grupoId, usuarioId, { tipo: "SAIDA", valor: "200", data: `${retrasado}-10` });
  await criarGrupoCom(usuarioId, "Viagem de Dezembro");
  const abas = page.getByRole("navigation", { name: "Seções" });

  // Do Resumo para Lançamentos.
  await page.goto("/resumo");
  await page.getByLabel("Mês", { exact: true }).selectOption(anterior);
  await expect(page).toHaveURL(new RegExp(`/resumo\\?mes=${anterior}$`));
  await expect(resumoDoMes(page)).toContainText(`Saldo de ${nomeDoMes(anterior)}`);
  await abas.getByRole("link", { name: "Lançamentos" }).click();
  await expect(page).toHaveURL(new RegExp(`/lancamentos\\?mes=${anterior}$`));
  await expect(page.getByRole("region", { name: nomeComAno(anterior) })).toBeVisible();

  // De Lançamentos para o Resumo.
  await page.getByLabel("Mês", { exact: true }).selectOption(retrasado);
  await expect(page).toHaveURL(new RegExp(`/lancamentos\\?mes=${retrasado}$`));
  await abas.getByRole("link", { name: "Resumo" }).click();
  await expect(page).toHaveURL(new RegExp(`/resumo\\?mes=${retrasado}$`));
  await expect(resumoDoMes(page)).toContainText(`Saldo de ${nomeDoMes(retrasado)}`);
  await expect(resumoDoMes(page).getByTestId("saidas")).toHaveText("− R$ 200,00");

  // A aba Grupo não leva o mês.
  await expect(abas.getByRole("link", { name: "Grupo" })).toHaveAttribute("href", "/grupo");

  // Trocar de grupo volta ao mês atual.
  await page.getByRole("banner").getByLabel("Grupo").selectOption({ label: "Viagem de Dezembro" });
  await expect(page).toHaveURL(/\/resumo$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Viagem de Dezembro");
  await expect(resumoDoMes(page)).toContainText(`Saldo de ${nomeDoMes(chaveDoMes())}`);
});

test("Resumo com ex-membro sem violações de acessibilidade nos dois temas", async ({ page }) => {
  await montarGrupoCompleto(page);
  await expect(quadro(page, "Quem registrou").locator("[data-ex-membro]")).toHaveCount(1);

  // Exceção aceita no design: só a regra de contraste fica de fora, e só nas
  // linhas de ex-membro (opacidade de 70%).
  const regras = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
  for (const tema of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: tema });
    const resto = await new AxeBuilder({ page }).withTags(regras).exclude("[data-ex-membro]").analyze();
    expect(resto.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    const linhasExMembro = await new AxeBuilder({ page })
      .withTags(regras)
      .include("[data-ex-membro]")
      .disableRules(["color-contrast"])
      .analyze();
    expect(linhasExMembro.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  }
});
