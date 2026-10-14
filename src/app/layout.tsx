import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { RegistrarServiceWorker } from "./registrar-service-worker";

// Mesmas fontes do protótipo, servidas pelo next/font (sem requisição ao
// Google em tempo de execução). As variáveis CSS são lidas pelo
// tailwind.config.ts (font-display, font-sans, font-mono).
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
  display: "swap",
});
const corpo = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});
const numeros = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-num",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Caixa Comum",
  description: "Controle financeiro em grupo: entradas, saídas e saldo do mês, compartilhados.",
  applicationName: "Caixa Comum",
  appleWebApp: { capable: true, title: "Caixa Comum", statusBarStyle: "default" },
  icons: { apple: "/icones/192" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1513" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${corpo.variable} ${numeros.variable}`}>
      <body>
        <Providers>{children}</Providers>
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
