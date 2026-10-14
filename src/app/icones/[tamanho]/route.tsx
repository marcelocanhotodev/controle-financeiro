import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";

// Ícones do PWA, gerados como PNG no build (sem arquivos binários no
// repositório). A versão "maskable" deixa a marca dentro da zona segura
// central de 80%, porque o Android recorta o ícone em círculo ou gota.
const ICONES = {
  "192": { lado: 192, mascaravel: false },
  "512": { lado: 512, mascaravel: false },
  "512-maskable": { lado: 512, mascaravel: true },
} as const;

type NomeIcone = keyof typeof ICONES;

export const dynamic = "force-static";
// Runtime Edge: no Node, o next/og do Next 14.2 quebra no Windows ao resolver
// o caminho da própria fonte (fileURLToPath → "Invalid URL") durante o build.
export const runtime = "edge";

export function generateStaticParams() {
  return Object.keys(ICONES).map((tamanho) => ({ tamanho }));
}

export function GET(_req: Request, { params }: { params: { tamanho: string } }) {
  const icone = ICONES[params.tamanho as NomeIcone];
  if (!icone) notFound();

  const { lado, mascaravel } = icone;
  // Marca: um cofre (a "caixa") com uma moeda entrando pela fenda.
  const marca = mascaravel ? lado * 0.56 : lado * 0.7;
  const moeda = marca * 0.3;
  const fenda = marca * 0.4;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2b47c9",
          borderRadius: mascaravel ? 0 : lado * 0.22,
        }}
      >
        <div
          style={{
            width: marca,
            height: marca,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: moeda,
              height: moeda,
              borderRadius: moeda / 2,
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: marca * 0.07,
            }}
          >
            <div
              style={{
                width: moeda * 0.56,
                height: moeda * 0.56,
                borderRadius: moeda * 0.28,
                border: `${Math.max(2, Math.round(moeda * 0.09))}px solid #2b47c9`,
              }}
            />
          </div>
          <div
            style={{
              width: marca,
              height: marca * 0.62,
              borderRadius: marca * 0.12,
              background: "#ffffff",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: fenda,
                height: marca * 0.07,
                borderRadius: marca * 0.035,
                background: "#2b47c9",
                marginTop: marca * 0.09,
              }}
            />
          </div>
        </div>
      </div>
    ),
    { width: lado, height: lado }
  );
}
