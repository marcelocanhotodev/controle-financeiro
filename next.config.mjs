/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Obrigatório nesta versão (14.2) para o Next carregar src/instrumentation.ts
    // — sem isso, register() nunca é chamado e as variáveis de ambiente não são
    // validadas na subida (ver src/lib/env.ts). Mesmo ajuste do matilha-app.
    instrumentationHook: true,
  },
};

export default nextConfig;
