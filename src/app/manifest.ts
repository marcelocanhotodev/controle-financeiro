import type { MetadataRoute } from "next";

// Manifesto do PWA (capability estrutura-app, Requirement "Instalação como
// app"): instala com o nome "Caixa Comum" e o ícone do produto e abre em
// tela cheia, sem a barra do navegador.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Caixa Comum",
    short_name: "Caixa Comum",
    description: "Controle financeiro em grupo: entradas, saídas e saldo do mês, compartilhados.",
    lang: "pt-BR",
    start_url: "/resumo",
    scope: "/",
    display: "standalone",
    background_color: "#eef1f0",
    theme_color: "#2b47c9",
    icons: [
      { src: "/icones/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icones/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icones/512-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
