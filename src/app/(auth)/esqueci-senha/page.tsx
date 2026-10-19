import { MolduraAuth } from "../moldura-auth";
import { FormularioEsqueciSenha } from "./formulario-esqueci-senha";

// Capability autenticacao, Requirement "Recuperação de senha".
export default function EsqueciSenhaPage() {
  return (
    <MolduraAuth>
      <FormularioEsqueciSenha />
    </MolduraAuth>
  );
}
