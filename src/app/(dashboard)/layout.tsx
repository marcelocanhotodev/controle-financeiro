import { getUsuarioAtual } from "@/lib/usuario-atual";

// Moldura das telas internas, numa coluna de até 1080 px com margem lateral
// de 16 px (capability estrutura-app, Requirement "Layout responsivo"). O
// topo e as abas ficam em template.tsx, renderizado a cada navegação.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Confere a sessão no banco: conta removida ou senha redefinida depois do
  // login levam a /login (capability autenticacao).
  await getUsuarioAtual();

  return <div className="mx-auto max-w-app px-4 pb-14 pt-3.5">{children}</div>;
}
