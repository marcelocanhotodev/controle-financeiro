// Destino depois do login (ex.: voltar ao link do convite). Só aceita caminho
// relativo do próprio app — nunca uma URL de outro site, para o login não
// virar um redirecionador aberto ("//site.com" e "/\site.com" contam como
// outro site para o navegador).

export const DESTINO_PADRAO = "/resumo";

export function destinoSeguro(valor: string | null | undefined): string {
  if (!valor || !valor.startsWith("/") || valor.startsWith("//") || valor.startsWith("/\\")) {
    return DESTINO_PADRAO;
  }
  return valor;
}
