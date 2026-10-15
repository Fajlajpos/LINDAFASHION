/**
 * Kroky objednávky – sdílené košíkem (Server Component) i pokladnou (klient).
 *
 * Samostatný soubor bez `'use client'`: hodnota vyvezená z klientského modulu
 * by v Server Componentu nebyla pole, ale jen odkaz na klientský modul.
 */

export type CisloKroku = 1 | 2 | 3 | 4;

export const KROKY: ReadonlyArray<{ cislo: CisloKroku; nazev: string; href: string }> = [
  { cislo: 1, nazev: 'Košík', href: '/kosik' },
  { cislo: 2, nazev: 'Údaje', href: '/pokladna' },
  { cislo: 3, nazev: 'Doprava a platba', href: '/pokladna/doprava' },
  { cislo: 4, nazev: 'Shrnutí', href: '/pokladna/shrnuti' },
];
