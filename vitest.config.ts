import { defineConfig } from "vitest/config";

// Config de testes no modelo do matilha-app. Ambiente "node" (não "jsdom")
// porque os testes de integração rodam contra o Postgres real do
// docker-compose, não contra componentes React — a interface é coberta pelo
// Playwright (pasta e2e/, fora deste include). `resolve.tsconfigPaths`
// resolve o alias "@/*" -> "src/*" de tsconfig.json sem plugin extra.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    passWithNoTests: true,
    // Testes de integração batem no mesmo Postgres — arquivos em sequência
    // evitam que um enxergue os dados do outro (mesma decisão do matilha-app).
    fileParallelism: false,
  },
});
