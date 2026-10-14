import { useId } from "react";

// Padrão de campo de formulário (capability estrutura-app, Requirement
// "Acessibilidade", Scenario "Rótulos"), no visual do `.field` do protótipo:
// rótulo visível sempre associado ao controle, dica opcional ligada por
// aria-describedby e erro anunciado com role="alert".
//
// Botões que só têm ícone não usam este componente: recebem `aria-label`
// dizendo sobre o que agem (ex.: aria-label={`Excluir ${descricao}`}).
//
// Uso:
//   <Campo rotulo="Descrição" erro={erros.descricao}>
//     {(props) => <input type="text" name="descricao" {...props} />}
//   </Campo>

export interface PropsControle {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  className: string;
}

export const CLASSE_CONTROLE =
  "min-h-[42px] w-full rounded-lg border border-linha bg-surface px-3 py-[9px] text-texto placeholder:text-suave";

export function Campo({
  rotulo,
  dica,
  erro,
  children,
}: {
  rotulo: string;
  dica?: string;
  erro?: string;
  children: (props: PropsControle) => React.ReactNode;
}) {
  const id = useId();
  const idDica = dica ? `${id}-dica` : undefined;
  const idErro = erro ? `${id}-erro` : undefined;
  const descritoPor = [idDica, idErro].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {rotulo}
      </label>
      {children({
        id,
        "aria-describedby": descritoPor,
        "aria-invalid": erro ? true : undefined,
        className: CLASSE_CONTROLE,
      })}
      {dica && (
        <small id={idDica} className="text-[0.8rem] text-suave">
          {dica}
        </small>
      )}
      {erro && (
        <p id={idErro} role="alert" className="rounded-lg bg-saida-suave px-3 py-[9px] text-[0.88rem] font-medium text-saida">
          {erro}
        </p>
      )}
    </div>
  );
}
