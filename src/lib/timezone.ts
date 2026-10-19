// ============================================================================
// Calendário de America/Sao_Paulo (capability: lancamentos, Scenario "Data
// padrão"). Cópia adaptada de src/lib/timezone.ts do matilha-app, só com o que
// o Caixa Comum usa: dias e meses, sem horário.
//
// O Brasil não observa horário de verão desde 2019, então America/Sao_Paulo é
// sempre UTC-3 — por isso um offset fixo, sem tz database.
//
// REGRA: todo código que decide "que dia é hoje", monta limites de mês ou lê
// datas de <input type="date"> e da URL passa por este módulo — nunca
// `new Date(string)` nem getters locais (`getDate()`, `getMonth()`...), que
// dependem do fuso de quem executa (servidor ou navegador).
//
// Colunas `@db.Date` (Lancamento.data) guardam só o dia. O Prisma as lê e
// escreve como `Date` à meia-noite UTC desse dia — `paraDataDoBanco` e
// `deDataDoBanco` fazem a ponte.
// ============================================================================

const OFFSET_MINUTOS = -180; // UTC-3

export interface DiaCalendario {
  ano: number;
  mes: number; // 1-12
  dia: number;
}

export interface MesCalendario {
  ano: number;
  mes: number; // 1-12
}

const NOMES_MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function doisDigitos(valor: number): string {
  return String(valor).padStart(2, "0");
}

/** Dia do calendário de São Paulo em que cai um instante. */
export function paraDiaCalendario(instante: Date): DiaCalendario {
  const deslocado = new Date(instante.getTime() + OFFSET_MINUTOS * 60_000);
  return { ano: deslocado.getUTCFullYear(), mes: deslocado.getUTCMonth() + 1, dia: deslocado.getUTCDate() };
}

/** Hoje em São Paulo. */
export function hoje(agora: Date = new Date()): DiaCalendario {
  return paraDiaCalendario(agora);
}

/** `yyyy-mm-dd`, o formato de `<input type="date">`. */
export function paraChaveDeData({ ano, mes, dia }: DiaCalendario): string {
  return `${ano}-${doisDigitos(mes)}-${doisDigitos(dia)}`;
}

/** Inverso de `paraChaveDeData`. `null` para texto malformado ou data que não
 * existe (ex.: 2026-02-30) — nunca lança. */
export function paraDiaCalendarioDeChave(chave: string): DiaCalendario | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(chave);
  if (!match) return null;
  const ano = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  const normalizado = new Date(Date.UTC(ano, mes - 1, dia));
  if (normalizado.getUTCFullYear() !== ano || normalizado.getUTCMonth() !== mes - 1 || normalizado.getUTCDate() !== dia) {
    return null;
  }
  return { ano, mes, dia };
}

/** Valor para gravar numa coluna `@db.Date`. */
export function paraDataDoBanco({ ano, mes, dia }: DiaCalendario): Date {
  return new Date(Date.UTC(ano, mes - 1, dia));
}

/** Dia guardado numa coluna `@db.Date`. */
export function deDataDoBanco(data: Date): DiaCalendario {
  return { ano: data.getUTCFullYear(), mes: data.getUTCMonth() + 1, dia: data.getUTCDate() };
}

/** "dd/mm", como nas linhas da lista. */
export function formatarDiaMes({ mes, dia }: DiaCalendario): string {
  return `${doisDigitos(dia)}/${doisDigitos(mes)}`;
}

/** `yyyy-mm`, o formato de `?mes=` na URL. */
export function paraChaveDeMes({ ano, mes }: MesCalendario): string {
  return `${ano}-${doisDigitos(mes)}`;
}

/** Inverso de `paraChaveDeMes`; `null` para texto malformado ou mês fora de 1-12. */
export function paraMesDeChave(chave: string | null | undefined): MesCalendario | null {
  const match = /^(\d{4})-(\d{2})$/.exec(chave ?? "");
  if (!match) return null;
  const ano = Number(match[1]);
  const mes = Number(match[2]);
  if (mes < 1 || mes > 12) return null;
  return { ano, mes };
}

/** "Outubro de 2026". */
export function nomeDoMes({ ano, mes }: MesCalendario): string {
  return `${NOMES_MESES[mes - 1]} de ${ano}`;
}

/** Primeiro dia do mês e primeiro dia do mês seguinte, para `data >= inicio
 * AND data < fim` em colunas `@db.Date`. */
export function limitesDoMes({ ano, mes }: MesCalendario): { inicio: Date; fim: Date } {
  return { inicio: new Date(Date.UTC(ano, mes - 1, 1)), fim: new Date(Date.UTC(ano, mes, 1)) };
}
