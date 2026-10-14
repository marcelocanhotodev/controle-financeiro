// Regras do aviso de retorno (capability estrutura-app, Requirement "Avisos
// de retorno"), separadas do componente React para serem testadas sem
// navegador: o aviso dura 6 segundos e, se tiver ação ("Desfazer"), ela só
// existe enquanto o aviso está visível.

export const DURACAO_AVISO_MS = 6_000;

export interface AcaoAviso {
  rotulo: string;
  executar: () => void;
}

export interface Aviso {
  id: number;
  mensagem: string;
  acao?: AcaoAviso;
  expiraEm: number;
}

export function criarAviso(id: number, mensagem: string, agora: number, acao?: AcaoAviso): Aviso {
  return { id, mensagem, acao, expiraEm: agora + DURACAO_AVISO_MS };
}

export function avisoVisivel(aviso: Aviso | null, agora: number): aviso is Aviso {
  return aviso !== null && agora < aviso.expiraEm;
}

export function msAteExpirar(aviso: Aviso, agora: number): number {
  return Math.max(0, aviso.expiraEm - agora);
}
