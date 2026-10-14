// Estado vazio de uma seção — usado pelas abas enquanto a change que as
// preenche (usuarios-e-grupos, lancamentos, resumo-mensal) não chega.
export function EstadoVazio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl">{titulo}</h1>
      <div className="quadro">
        <p className="text-suave">{texto}</p>
      </div>
    </section>
  );
}
