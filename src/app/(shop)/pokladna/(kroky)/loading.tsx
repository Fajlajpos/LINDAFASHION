import React from 'react';
import { NacitaniKroku } from '@/components/shop/pokladna/NacitaniKroku';

/**
 * Přechod mezi kroky. Layout s krokovačem zůstává stát, mění se jen obsah –
 * a díky téhle hranici jde další krok i přednačíst (viz CLAUDE.md).
 */
export default function NacitaniMeziKroky() {
  return <NacitaniKroku />;
}
