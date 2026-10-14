// Service worker mínimo do Caixa Comum (capability estrutura-app,
// Requirement "Instalação como app", Scenario "Sem conexão").
//
// Não guarda dados financeiros nem páginas com dados: só a tela /offline e os
// arquivos estáticos dela. Sem internet, qualquer navegação cai nessa tela.
// Com internet, tudo vai direto para a rede.
//
// Ao mudar este arquivo, troque a VERSAO para descartar o cache antigo.

const VERSAO = "caixa-comum-v1";
const PAGINA_OFFLINE = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSAO);
      const resposta = await fetch(PAGINA_OFFLINE, { cache: "reload" });
      await cache.put(PAGINA_OFFLINE, resposta.clone());

      // Guarda também o CSS, as fontes e os scripts que a tela usa, para ela
      // aparecer com o visual do app mesmo sem rede.
      const html = await resposta.text();
      const arquivos = [...new Set(html.match(/\/_next\/static\/[^"'\s)]+/g) || [])];
      await cache.addAll(arquivos);
    })()
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const nomes = await caches.keys();
      await Promise.all(nomes.filter((nome) => nome !== VERSAO).map((nome) => caches.delete(nome)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(VERSAO);
        return (await cache.match(PAGINA_OFFLINE)) || Response.error();
      })
    );
    return;
  }

  // Arquivos estáticos do Next têm hash no nome e nunca mudam: servir do
  // cache quando existir (é o que faz a tela offline carregar sem rede).
  if (new URL(request.url).pathname.startsWith("/_next/static/")) {
    event.respondWith(caches.match(request).then((emCache) => emCache || fetch(request)));
  }
});
