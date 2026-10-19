// Moldura das telas públicas (login, cadastro, convite, senha), no visual do
// `.auth` do protótipo: apresentação à esquerda e o cartão à direita, em
// coluna única abaixo de 860 px. Modelo: moldura-auth.tsx do matilha-app.

export function MolduraAuth({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto grid min-h-[calc(100vh-80px)] max-w-app grid-cols-1 items-center gap-7 px-4 py-6 min-[861px]:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] min-[861px]:gap-10">
      <section className="flex flex-col gap-[18px]">
        <p className="font-display text-[1.05rem] font-bold text-destaque">Caixa Comum</p>
        <h1 className="text-[clamp(2rem,5vw,3.1rem)] leading-[1.05]">As entradas e saídas do grupo, num só lugar.</h1>
        <p className="max-w-[46ch] text-[1.02rem] text-suave">
          Cada pessoa entra com a própria conta e todo o grupo enxerga o mesmo caixa: quem recebeu, quem pagou e
          quanto sobrou no mês.
        </p>
      </section>
      <section className="quadro flex flex-col gap-[18px] p-6">{children}</section>
    </main>
  );
}
