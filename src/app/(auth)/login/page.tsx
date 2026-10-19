import { MolduraAuth } from "../moldura-auth";
import { TelaAcesso } from "../tela-acesso";

// Capability autenticacao, Requirement "Tela de login". `retorno` leva de
// volta à página que pediu o login (ex.: o link do convite); o formulário só
// aceita caminhos do próprio app (src/lib/url-retorno.ts).
export default function LoginPage({ searchParams }: { searchParams: { retorno?: string } }) {
  return (
    <MolduraAuth>
      <TelaAcesso modoInicial="entrar" retorno={searchParams.retorno} />
    </MolduraAuth>
  );
}
