import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { KatalogVypis, jeRazeni } from '@/components/shop/KatalogVypis';
import { JsonLd } from '@/components/shop/JsonLd';
import { pocetZItalie } from '@/lib/katalog';
import { drobeckyLd } from '@/lib/strukturovana-data';
import { CESTA_ITALSKA_MODA } from '@/lib/zeme-puvodu';

export const dynamic = 'force-dynamic';

/**
 * Italská móda – kousky vyrobené v Itálii.
 *
 * ## Proč samostatná stránka, a ne „italská móda" v titulku webu
 *
 * Butik prodává běžné značky a italské jsou jen některé. „Italská dámská
 * móda" jako popis celého obchodu by byla klamání o zeměpisném původu
 * (§ 5 zák. č. 634/1992 Sb.). Tahle stránka říká totéž slovo **jen o tom,
 * o čem to platí** – skládá se z `Product.zemePuvodu`, takže se plní sama,
 * jakmile majitelka u kousku vyplní Itálii.
 *
 * Pro vyhledávače i AI asistenty je to přitom silnější než slovo v titulku:
 * vlastní adresa, vlastní nadpis a za nimi zboží, které dotazu opravdu
 * odpovídá. Každý kousek nese zemi původu i ve strukturovaných datech
 * (`countryOfOrigin` v `produktLd`).
 *
 * Statický segment má přednost před `[kategorie]`, takže kategorie se slugem
 * `italska-moda` by se tímhle zastínila – nezakládat.
 *
 * Bez jediného italského kousku se stránka nezaindexuje (`noindex`) a odkazy
 * na ni v patičce, katalogu, mapě webu a `/llms.txt` se schovají.
 */
export async function generateMetadata(): Promise<Metadata> {
  const pocet = await pocetZItalie();

  return {
    title: 'Italská móda – dámské oblečení vyrobené v Itálii | LINDA FASHION',
    description:
      'Dámské oblečení vyrobené v Itálii z nabídky butiku LINDA FASHION – šaty, halenky, svetry, saka a kabáty. Země původu je uvedená u každého kousku.',
    alternates: { canonical: CESTA_ITALSKA_MODA },
    ...(pocet === 0 ? { robots: { index: false, follow: true } } : {}),
  };
}

interface Props {
  searchParams: { razeni?: string; stranka?: string };
}

export default function ItalskaModaPage({ searchParams }: Props) {
  const stranka = Math.max(1, Number(searchParams.stranka ?? 1) || 1);

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd
        data={drobeckyLd([
          { nazev: 'Katalog', cesta: '/produkty' },
          { nazev: 'Italská móda', cesta: CESTA_ITALSKA_MODA },
        ])}
      />

      <div className="space-y-3 border-b border-linda-sand pb-8">
        <nav aria-label="Drobečková navigace">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-linda-espresso/70">
            <li>
              <Link href="/produkty" className="hover:text-linda-cognac hover:underline">
                Katalog
              </Link>
            </li>
            <ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" />
            <li aria-current="page" className="font-medium text-linda-espresso">
              Italská móda
            </li>
          </ol>
        </nav>

        <span className="block text-xs font-semibold uppercase tracking-widest text-linda-cognac">
          Vyrobeno v Itálii
        </span>
        <h1 className="font-serif text-4xl text-linda-espresso sm:text-5xl">Italská móda</h1>

        {/* Text je psaný tak, aby se dal citovat: AI asistent z něj má
            vyčíst, co tu je a podle čeho, ne jen klíčové slovo. A přiznává,
            že zbytek nabídky italský není – to je ta věta, která z celé
            stránky dělá pravdivé tvrzení. */}
        <p className="max-w-2xl text-sm leading-relaxed text-linda-espresso/75">
          Výběr dámského oblečení z naší nabídky, které bylo vyrobeno v Itálii. Země původu je
          uvedená u každého kousku – na kartě i v detailu produktu – takže přesně víte, odkud
          oblečení pochází. Ostatní kousky v butiku jsou od dalších zavedených značek; celou
          nabídku najdete v{' '}
          <Link
            href="/produkty"
            className="underline underline-offset-2 transition-colors duration-200 hover:text-linda-cognac"
          >
            katalogu
          </Link>
          .
        </p>
      </div>

      <Suspense
        fallback={<p className="py-16 text-center text-xs text-linda-espresso/70">Načítám kolekci…</p>}
      >
        <KatalogVypis
          jenZItalie
          razeni={jeRazeni(searchParams.razeni)}
          stranka={stranka}
          zakladniCesta={CESTA_ITALSKA_MODA}
        />
      </Suspense>
    </div>
  );
}
