// Código do grupo (capability: grupos, Requirement "Código do grupo"): até 6
// letras do nome, sem acentos e em maiúsculas, mais um hífen e 4 dígitos
// aleatórios — ex.: "VIAGEM-4821". Ver design.md, "Código do grupo".

import { randomInt } from "crypto";
import { Prisma } from "@prisma/client";

const LETRAS_PADRAO = "GRUPO";
const TENTATIVAS = 5;

/** Maiúsculas e sem espaços nas pontas — a busca por código é feita assim. */
export function normalizarCodigo(codigo: string): string {
  return codigo.trim().toUpperCase();
}

export function gerarCodigoGrupo(nome: string, sortearDigitos: () => number = () => randomInt(0, 10_000)): string {
  const letras = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 6);
  const digitos = String(sortearDigitos()).padStart(4, "0");
  return `${letras || LETRAS_PADRAO}-${digitos}`;
}

function conflitoDeCodigo(erro: unknown): boolean {
  if (!(erro instanceof Prisma.PrismaClientKnownRequestError) || erro.code !== "P2002") return false;
  const alvo = erro.meta?.target;
  return Array.isArray(alvo) ? alvo.includes("codigo") : String(alvo ?? "").includes("codigo");
}

/**
 * Roda `criar` com um código novo e, se o banco recusar por código repetido
 * (`@unique`), tenta de novo com outro. `criar` deve ser a transação inteira:
 * no Postgres, um erro dentro da transação a invalida, então a nova tentativa
 * precisa recomeçar do zero.
 */
export async function comCodigoUnico<T>(nome: string, criar: (codigo: string) => Promise<T>): Promise<T> {
  for (let tentativa = 1; ; tentativa++) {
    try {
      return await criar(gerarCodigoGrupo(nome));
    } catch (erro) {
      if (!conflitoDeCodigo(erro) || tentativa >= TENTATIVAS) throw erro;
    }
  }
}
