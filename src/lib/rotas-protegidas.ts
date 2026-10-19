// Regra de redirecionamento do middleware (capability: autenticacao,
// Requirement "Proteção de acesso"). Lógica pura, sem import de "next-auth"
// nem "next/server" — esses módulos não resolvem no runtime Node do Vitest,
// então mantê-la aqui é o que permite testá-la sem mocks. Modelo:
// src/lib/rotas-protegidas.ts do matilha-app.
//
// O middleware só confere se existe sessão. Se a sessão ainda vale (conta
// existe, senha não foi redefinida depois do login) é conferido no banco por
// getUsuarioAtual() (src/lib/usuario-atual.ts), que o Edge não alcança.

export const ROTA_LOGIN = "/login";

export const ROTAS_PUBLICAS = [
  ROTA_LOGIN,
  "/criar-conta",
  "/esqueci-senha",
  "/definir-senha",
  "/convite",
  // Tela que o service worker mostra sem rede (capability estrutura-app).
  "/offline",
  // Páginas de exemplo dos testes de ponta a ponta. Já devolvem 404 sem
  // PAGINAS_DE_TESTE=1 e não mostram dados de ninguém.
  "/teste",
] as const;

/** Casa a rota exata ou qualquer subcaminho dela ("/convite/abc"), nunca um
 * prefixo solto ("/loginx"). */
export function ehRotaPublica(pathname: string): boolean {
  return ROTAS_PUBLICAS.some((rota) => pathname === rota || pathname.startsWith(`${rota}/`));
}

/** Devolve para onde redirecionar, ou `null` para seguir. */
export function decidirRedirecionamento(params: { pathname: string; autenticado: boolean }): typeof ROTA_LOGIN | null {
  if (ehRotaPublica(params.pathname)) return null;
  if (!params.autenticado) return ROTA_LOGIN;
  return null;
}
