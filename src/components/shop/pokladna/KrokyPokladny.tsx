import React from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { KROKY, type CisloKroku } from '@/lib/pokladna-kroky';

/**
 * Ukazatel postupu objednávkou: Košík → Doprava a platba → Údaje → Shrnutí.
 *
 * Hotové kroky jsou odkazy (vrátit se jde vždycky), budoucí ne – do nich se
 * smí jen tlačítkem „Pokračovat", které hlídá, že je předchozí krok vyplněný.
 *
 * Stejný jazyk reliéfu jako zbytek pokladny: aktivní krok je tmavý vystouplý
 * kroužek, hotový vystouplý krémový s fajfkou, budoucí vyfrézovaný do plochy.
 * Na telefonu se popisky schovají a místo nich se ukáže „Krok 2 ze 4".
 */
export function KrokyPokladny({ aktivni }: { aktivni: CisloKroku }) {
  const aktualni = KROKY.find((k) => k.cislo === aktivni);

  return (
    <nav aria-label="Postup objednávky" className="space-y-2">
      <ol className="flex items-center gap-2 sm:gap-3">
        {KROKY.map((krok, i) => {
          const hotovy = krok.cislo < aktivni;
          const jeAktivni = krok.cislo === aktivni;

          const kruh = (
            <span
              aria-hidden="true"
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-200 ${
                jeAktivni
                  ? 'bg-linda-cognac text-white shadow-neuDark'
                  : hotovy
                    ? 'bg-linda-cream text-linda-cognac shadow-neuSm group-hover:shadow-neu'
                    : 'bg-linda-sandLight text-linda-espresso/70 shadow-neuInsetSm'
              }`}
            >
              {hotovy ? <Check className="h-4 w-4" /> : krok.cislo}
            </span>
          );

          const popisek = (
            <span
              className={`hidden text-xs sm:inline ${
                jeAktivni ? 'font-semibold text-linda-espresso' : 'text-linda-espresso/75'
              } ${hotovy ? 'group-hover:text-linda-cognac' : ''}`}
            >
              {krok.nazev}
            </span>
          );

          return (
            <React.Fragment key={krok.cislo}>
              {i > 0 && (
                /* Spojnice je žlábek; hotový úsek v něm leží vyplněný. */
                <li aria-hidden="true" className="h-1 min-w-[12px] flex-1 rounded-full bg-linda-sandLight shadow-neuInsetSm">
                  {krok.cislo <= aktivni && <span className="block h-full rounded-full bg-linda-cognac/70" />}
                </li>
              )}
              <li className="shrink-0">
                {hotovy ? (
                  <Link
                    href={krok.href}
                    aria-label={`${krok.nazev} – hotovo, vrátit se`}
                    className="group flex min-h-touch cursor-pointer items-center gap-2 rounded-full"
                  >
                    {kruh}
                    {popisek}
                  </Link>
                ) : (
                  <span
                    aria-current={jeAktivni ? 'step' : undefined}
                    className="flex min-h-touch items-center gap-2"
                  >
                    {kruh}
                    {popisek}
                    <span className="sr-only sm:hidden">{krok.nazev}</span>
                  </span>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>

      <p className="text-xs text-linda-espresso/75 sm:hidden">
        Krok {aktivni} ze {KROKY.length}: <strong className="text-linda-espresso">{aktualni?.nazev}</strong>
      </p>
    </nav>
  );
}
