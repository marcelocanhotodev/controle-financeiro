// Disparado pelo Vercel Cron uma vez por dia (ver vercel.json), no modelo de
// /api/cron/lembretes-whatsapp do matilha-app. A Vercel envia
// `Authorization: Bearer <CRON_SECRET>` quando a variável existe no projeto.
//
// Enquanto CRON_SECRET não estiver configurado no ambiente, toda chamada é
// recusada (401): nunca um segredo vazio que aceite qualquer um. A
// configuração entra junto com o ambiente de produção (design.md, "Exclusão
// reversível com excluidoEm").

import { NextRequest, NextResponse } from "next/server";
import { apagarLancamentosExcluidos } from "@/lib/limpeza-lancamentos";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const autorizacao = request.headers.get("authorization");

  if (!cronSecret || autorizacao !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  return NextResponse.json(await apagarLancamentosExcluidos());
}
