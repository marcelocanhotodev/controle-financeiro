// Limpeza definitiva dos lançamentos excluídos (capability: lancamentos,
// Scenario "Prazo esgotado"). Excluído há mais de 24 horas sai do banco de
// vez; até lá, as leituras já o ignoram (excluidoEm != null). Chamado pela
// rota do Vercel Cron (src/app/api/cron/limpar-lancamentos/route.ts).

import { prisma } from "@/lib/prisma";

export const RETENCAO_EXCLUIDOS_MS = 24 * 60 * 60 * 1000;

export async function apagarLancamentosExcluidos(agora: Date = new Date()): Promise<{ apagados: number }> {
  const { count } = await prisma.lancamento.deleteMany({
    where: { excluidoEm: { lt: new Date(agora.getTime() - RETENCAO_EXCLUIDOS_MS) } },
  });
  return { apagados: count };
}
