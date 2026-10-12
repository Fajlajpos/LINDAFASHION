import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, MapPin, Navigation, Store } from 'lucide-react';
import type { RozlozenaAdresa } from '@/lib/prodejna';

interface Props {
  adresa: RozlozenaAdresa;
  oteviraciDoba: string | null;
  mapa: string | null;
  /** `/fotky/prodejna.jpg` – viz `najitFotku`. `null` = rám s ikonou. */
  fotka: string | null;
}

/**
 * Kamenná prodejna na konci úvodní stránky, těsně nad patičkou.
 *
 * ## Reliéf
 *
 * Sekce je **zapuštěná** (`sandLight` + `shadow-neuInset`) – stejně jako pruh
 * s výhodami a newsletter nad ní; servisní a informativní plochy jsou na
 * domovské stránce prohlubně, vystouplé je zboží. Vystouplá karta tu byla
 * první verze a majitel webu ji chtěl zapuštěnou.
 *
 * Do prohlubně se nesmí dát další prohlubeň (CLAUDE.md), takže rám na fotku
 * je naopak **vystouplá krémová pasparta** (`cream` + `shadow-neu`, okraj
 * `p-3`) a fotka v ní leží jako obraz v rámu. Fotka rám nevyplňuje od kraje
 * ke kraji – lem pasparty musí zůstat vidět, jinak fotka zakryje reliéf
 * a vypadá nalepeně, jediný plochý prvek na vymodelované stránce.
 *
 * Terče ikon mají barvu podkladu (`sandLight` + `shadow-neuSm`) jako v pruhu
 * s výhodami – vystouplá plocha musí mít barvu toho, z čeho vystupuje.
 *
 * ## Text
 *
 * Prodejna má **jiný výběr než e-shop** – to je důvod přijít. Nikde ji
 * nepodávat jako místo, kde si zákaznice vyzkouší zboží z e-shopu.
 */
export function ProdejnaSekce({ adresa, oteviraciDoba, mapa, fotka }: Props) {
  return (
    <section aria-labelledby="prodejna-uvod-nadpis" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 items-center gap-8 rounded-3xl bg-linda-sandLight p-5 shadow-neuInset sm:p-8 lg:grid-cols-2 lg:gap-12 lg:p-10">
        {/* Pasparta na fotku obchodu – vystouplá z prohlubně sekce */}
        <div className="rounded-2xl bg-linda-cream p-3 shadow-neu">
          {fotka ? (
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
              <Image
                src={fotka}
                alt={`Kamenná prodejna LINDA FASHION${adresa.mesto ? `, ${adresa.mesto}` : ''}`}
                fill
                sizes="(min-width: 1280px) 560px, (min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
            </div>
          ) : (
            /* Bez fotky tichá ikona na vystouplém terči – žádné „sem přijde
               fotka" pro zákaznici. */
            <div className="flex aspect-[4/3] items-center justify-center">
              <span className="flex h-24 w-24 items-center justify-center rounded-full bg-linda-cream shadow-neuSm">
                <Store className="h-11 w-11 stroke-[1.25] text-linda-espresso/40" aria-hidden="true" />
              </span>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-linda-espresso/70">
              Kamenná prodejna
            </span>
            <h2
              id="prodejna-uvod-nadpis"
              className="font-serif text-[1.75rem] leading-[1.15] text-linda-espresso sm:text-4xl"
            >
              Přijďte se podívat <span className="text-linda-cognac">osobně</span>
            </h2>
          </div>

          <p className="text-base leading-relaxed text-linda-espresso/85">
            Na prodejně najdete{' '}
            <strong className="font-semibold text-linda-espresso">
              i kousky, které na e-shopu nejsou
            </strong>
            . Zastavte se, vyzkoušejte si je a nechte si poradit s velikostí i kombinací.
          </p>

          {/* Ikony na vystouplých terčích – stejně jako pruh s výhodami
              a kontakt; odliší je reliéf, ne další barva. */}
          <dl className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linda-sandLight shadow-neuSm">
                <MapPin className="h-5 w-5 text-linda-cognac" aria-hidden="true" />
              </span>
              <div className="pt-1">
                <dt className="font-semibold text-linda-espresso">Adresa</dt>
                <dd className="text-linda-espresso/80">
                  {[adresa.ulice, [adresa.psc, adresa.mesto].filter(Boolean).join(' ')]
                    .filter(Boolean)
                    .join(', ')}
                </dd>
              </div>
            </div>

            {oteviraciDoba && (
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linda-sandLight shadow-neuSm">
                  <Clock className="h-5 w-5 text-linda-cognac" aria-hidden="true" />
                </span>
                <div className="pt-1">
                  <dt className="font-semibold text-linda-espresso">Otevírací doba</dt>
                  <dd className="whitespace-pre-line text-linda-espresso/80">{oteviraciDoba}</dd>
                </div>
              </div>
            )}
          </dl>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {mapa && (
              <a
                href={mapa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-linda-cognac px-6 py-3 text-sm font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
              >
                <Navigation className="h-4 w-4" aria-hidden="true" />
                Navigovat do prodejny
                <span className="sr-only"> (otevře mapu v novém okně)</span>
              </a>
            )}
            <Link
              href="/kontakt"
              className="inline-flex min-h-touch items-center text-sm font-medium text-linda-espresso underline underline-offset-4 transition-colors duration-200 hover:text-linda-cognac"
            >
              Kontakt a telefon
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
