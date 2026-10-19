import { MolduraAuth } from "../moldura-auth";
import { TelaAcesso } from "../tela-acesso";

// Mesma tela do login, já na opção "Criar conta" (capability autenticacao,
// Requirement "Tela de login").
export default function CriarContaPage() {
  return (
    <MolduraAuth>
      <TelaAcesso modoInicial="criar" />
    </MolduraAuth>
  );
}
