'use client';

import React from 'react';
import { ChybovaObrazovka } from '@/components/ui/ChybovaObrazovka';

/**
 * Chyba na některé ze stránek obchodu.
 *
 * Sedí uvnitř `(shop)/layout.tsx`, takže hlavička s navigací i patička
 * zůstanou stát. Kořenová hranice je nahradila celé a zákaznici pak zbývalo
 * jediné tlačítko – odsud se dá odejít kamkoliv.
 */
export default function ChybaObchodu({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ChybovaObrazovka error={error} reset={reset} kde="obchod" />;
}
