import React from 'react';
import Link from 'next/link';
import { Heart, Sparkles, ArrowRight } from 'lucide-react';

/**
 * Stránka o butiku – zatím jen to, co platí bez ověřování.
 *
 * Původní text byl vymyšlený: majitelku jmenoval „Linda" (prodávající je
 * Martina Ludvíková), sliboval zboží „přímo z rodinných dílen v Toskánsku,
 * Miláně a Římě", osobní vzkaz v každém balení a limitované série, a zákaznice
 * na něm četla pracovní poznámky o chystaném focení. Tvrzení o původu zboží
 * a o službách, která neplatí, je klamavá obchodní praktika (§ 5 zák.
 * č. 634/1992 Sb.) – stejný problém jako dřívější štítek „100% Italský
 * materiál" na kartě produktu.
 *
 * Co tu zbylo, plyne z kódu: složení materiálu je u oblečení povinné
 * (`produktSchema`), země původu se ukazuje, když je vyplněná, a kontaktní
 * formulář existuje. Skutečný příběh dodá majitelka – pak sem patří její text
 * a její fotky, ne další odhad.
 */
export default function OMnePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-16 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-4 text-center">
        <span className="block text-xs font-semibold uppercase tracking-widest text-linda-cognac">
          O butiku LINDA FASHION
        </span>
        <h1 className="font-serif text-4xl leading-tight text-linda-espresso sm:text-6xl">
          Dámská móda s italským půvabem
        </h1>
        <p className="font-serif text-base font-light italic text-linda-espresso/75">
          Vítejte v mém butiku.
        </p>
      </div>

      <div className="space-y-8 text-base font-light leading-relaxed text-linda-espresso/80">
        <div className="space-y-4">
          <h2 className="border-b border-linda-sand pb-3 font-serif text-3xl font-normal text-linda-espresso">
            Co u mě najdete
          </h2>
          <p>
            <strong className="font-medium">LINDA FASHION</strong> je malý butik s dámskou módou.
            Nabízím šaty, halenky, svetry, saka a kabáty – kousky, které se dají nosit každý den
            i na výjimečnou příležitost.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 py-6 md:grid-cols-2">
          <div className="space-y-3 rounded-2xl bg-linda-cream p-6 shadow-neu">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-linda-cream shadow-neuSm">
              <Sparkles className="h-6 w-6 text-linda-cognac" aria-hidden="true" />
            </span>
            <h3 className="font-serif text-xl text-linda-espresso">Víte, co kupujete</h3>
            <p className="text-sm leading-relaxed text-linda-espresso/75">
              U každého kousku najdete přesné materiálové složení v procentech, a pokud je známa,
              i zemi původu.
            </p>
          </div>

          <div className="space-y-3 rounded-2xl bg-linda-cream p-6 shadow-neu">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-linda-cream shadow-neuSm">
              <Heart className="h-6 w-6 text-linda-cognac" aria-hidden="true" />
            </span>
            <h3 className="font-serif text-xl text-linda-espresso">Ráda poradím</h3>
            <p className="text-sm leading-relaxed text-linda-espresso/75">
              Nevíte si rady s velikostí nebo s kombinací? Napište mi přes{' '}
              <Link
                href="/kontakt"
                className="underline underline-offset-2 transition-colors duration-200 hover:text-linda-cognac"
              >
                kontaktní formulář
              </Link>{' '}
              a poradím vám.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-3xl bg-linda-espresso p-8 text-center text-linda-cream shadow-neuLg sm:p-12">
        <h2 className="font-serif text-3xl text-linda-sand">Prohlédněte si kolekci</h2>
        <p className="mx-auto max-w-md text-sm text-linda-cream/75">
          Podívejte se, co je právě skladem.
        </p>
        <div>
          <Link
            href="/produkty"
            className="inline-flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-linda-cognac px-8 text-xs font-semibold uppercase tracking-wider text-white shadow-neuOnDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuOnDarkInset"
          >
            Objevit kolekci
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
