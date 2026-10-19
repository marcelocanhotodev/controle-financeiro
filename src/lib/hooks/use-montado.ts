"use client";

import { useEffect, useState } from "react";

/** Fica `true` depois que o React assume a página. Os botões de envio só
 * ficam ativos a partir daí: antes, um toque faria o envio nativo do
 * formulário, sem passar pela action. */
export function useMontado(): boolean {
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  return montado;
}
