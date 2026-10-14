import { redirect } from "next/navigation";

// Capability estrutura-app, Requirement "Navegação por seções", Scenario
// "Aba inicial": abrir o app leva à aba Resumo.
export default function Home() {
  redirect("/resumo");
}
