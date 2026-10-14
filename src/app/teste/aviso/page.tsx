import { notFound } from "next/navigation";
import { ExemploAviso } from "./exemplo-aviso";

// Página de exemplo do aviso, usada só pelo teste e2e/aviso.spec.ts enquanto
// nenhuma ação real (lançamentos, grupos) existe. Só responde com
// PAGINAS_DE_TESTE=1, que o playwright.config.ts liga no webServer — em
// produção e no dia a dia, devolve 404.
export const dynamic = "force-dynamic";

export default function TesteAvisoPage() {
  if (process.env.PAGINAS_DE_TESTE !== "1") notFound();
  return <ExemploAviso />;
}
