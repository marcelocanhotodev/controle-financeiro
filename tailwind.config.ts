import type { Config } from "tailwindcss";

// Paleta extraída do protótipo (openspec/prototype/Caixa Comum.html). As cores
// apontam para variáveis CSS definidas em src/app/globals.css, que trocam de
// valor no tema escuro — por isso cada classe (bg-surface, text-entrada...)
// funciona nos dois temas sem precisar de variantes `dark:`.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        fundo: "var(--bg)",
        surface: {
          DEFAULT: "var(--surface)",
          2: "var(--surface-2)",
        },
        texto: "var(--fg)",
        suave: "var(--muted)",
        linha: "var(--line)",
        destaque: {
          DEFAULT: "var(--accent)",
          texto: "var(--accent-fg)",
          suave: "var(--accent-soft)",
        },
        entrada: {
          DEFAULT: "var(--in)",
          suave: "var(--in-soft)",
        },
        saida: {
          DEFAULT: "var(--out)",
          suave: "var(--out-soft)",
        },
        "sobre-semantica": "var(--on-sem)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Segoe UI", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "Segoe UI", "system-ui", "sans-serif"],
        mono: ["var(--font-num)", "ui-monospace", "Menlo", "Consolas", "monospace"],
      },
      maxWidth: {
        app: "1080px",
      },
    },
  },
  plugins: [],
};

export default config;
