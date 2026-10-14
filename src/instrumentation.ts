// ============================================================================
// Hook oficial do Next.js, chamado uma única vez quando o servidor sobe.
// Usado só para validar as variáveis de ambiente obrigatórias antes do app
// aceitar qualquer requisição (ver src/lib/env.ts). Modelo: matilha-app.
//
// Requer `experimental.instrumentationHook: true` em next.config.mjs nesta
// versão do Next (14.2) — sem isso, `register()` nunca é chamado.
//
// A checagem `NEXT_RUNTIME === "nodejs"` é essencial: este arquivo também é
// carregado no bundle de Edge, e `@/lib/env` chama `process.exit`, que não
// existe no runtime Edge.
// ============================================================================

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertEnv } = await import("@/lib/env");
    assertEnv();
  }
}
