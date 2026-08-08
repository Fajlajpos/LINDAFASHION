'use client';

import React from 'react';
import { ChybovaObrazovka } from '@/components/ui/ChybovaObrazovka';

/**
 * Záchytná obrazovka pro chyby mimo obchod – administrace, přihlašování.
 *
 * Bez ní ukázal Next vlastní hlášku: ve vývoji červený přetisk, v produkci
 * holé „Application error: a server-side exception has occurred“ bez jakékoliv
 * nápovědy, co dál. Nejčastější spouštěč je nedostupná databáze – každé
 * `findMany` v Server Componentě vyhodí výjimku a s ní padá celá stránka.
 *
 * Obchod má vlastní hranici v `(shop)/error.tsx`, aby si zákaznice udržela
 * hlavičku a patičku; Next si vždycky vybere tu nejbližší.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ChybovaObrazovka error={error} reset={reset} kde="stránka" />;
}
