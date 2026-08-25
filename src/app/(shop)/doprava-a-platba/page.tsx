import React from 'react';
import { Truck, CreditCard, ShieldCheck, Clock, Info } from 'lucide-react';
import { dostupneDopravy, popisDopravyZdarma } from '@/lib/shipping';
import { nacistNastaveni, popisDodaciLhuty, popisDph } from '@/lib/nastaveni';
import { jeNastaveno } from '@/lib/gopay';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Doprava a platba | LINDA FASHION',
};

/**
 * Předsmluvní informace o dopravě a platbě (§ 1820 odst. 1 o. z.).
 *
 * Celá stránka byla statická: ceny 79/109/99 Kč a věta „doprava zdarma nad
 * 2 500 Kč" tu stály natvrdo, zatímco pokladna počítala podle `Settings`.
 * Cena dopravy a doba dodání přitom patří mezi údaje, které musí prodávající
 * sdělit **před** uzavřením smlouvy – a sdělit je jinak, než pak naúčtuje, je
 * horší než je nesdělit vůbec.
 *
 * Stejný problém měl výčet platebních metod: karta se nabízela vždycky,
 * přestože se zapíná až s klíči GoPay (`jeNastaveno()`).
 */
export default async function DopravaAPlatbaPage() {
  const nastaveni = await nacistNastaveni();
  const dopravy = dostupneDopravy(nastaveni);
  const dopravaZdarma = popisDopravyZdarma(nastaveni);
  const platby = [
    ...(jeNastaveno()
      ? [
          {
            nazev: 'Platba kartou online (GoPay)',
            popis:
              'Zabezpečená platba kartou Visa, Mastercard nebo Apple Pay/Google Pay bez poplatku.',
          },
        ]
      : []),
    {
      nazev: 'Bankovní převod + QR platba',
      popis: 'Bezhotovostní převod na náš účet s přehledným QR kódem po dokončení objednávky.',
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-12 text-linda-espresso sm:px-6 lg:px-8">
      <div className="border-b border-linda-sand pb-6">
        <h1 className="font-serif text-4xl">Možnosti dopravy a platby</h1>
        <p className="mt-1 text-xs text-linda-espresso/70">
          Přehled způsobů doručení a plateb v e-shopu LINDA FASHION
        </p>
      </div>

      {/* Doprava */}
      <div className="space-y-6">
        <h2 className="flex items-center gap-2 font-serif text-2xl text-linda-cognac">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-linda-cream shadow-neuSm">
            <Truck className="h-6 w-6" aria-hidden="true" />
          </span>
          Způsoby doručení
        </h2>

        {dopravy.length === 0 ? (
          /* Bez vyplněných cen nemá smysl předstírat nabídku – pokladna by
             stejně žádnou metodu nenabídla. */
          <p className="rounded-2xl bg-linda-sandLight p-6 text-xs text-linda-espresso/80 shadow-neuInsetSm">
            Ceny dopravy právě aktualizujeme. Napište nám prosím a rádi vám je sdělíme.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {dopravy.map((sm) => (
              <div key={sm.id} className="space-y-2 rounded-2xl bg-linda-cream p-6 shadow-neu">
                <h3 className="font-serif text-lg text-linda-espresso">{sm.nazev}</h3>
                <p className="text-xs text-linda-espresso/75">{sm.popis}</p>
                <div className="pt-2 text-sm font-semibold text-linda-cognac">
                  {sm.cena.toLocaleString('cs-CZ')} Kč
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Doba dodání – § 1820 odst. 1 písm. h). Skládá ji `popisDodaciLhuty`,
            aby detail produktu, pokladna i tahle stránka slibovaly totéž. */}
        <p className="flex items-start gap-2 rounded-2xl bg-linda-sandLight p-4 text-xs font-medium text-linda-espresso/80 shadow-neuInsetSm">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-linda-sage" aria-hidden="true" />
          <span>{popisDodaciLhuty(nastaveni)}</span>
        </p>

        {/* Věta o dopravě zdarma se zobrazí, jen když práh opravdu existuje. */}
        {dopravaZdarma && (
          <p className="flex items-start gap-2 rounded-2xl bg-linda-sandLight p-4 text-xs font-medium text-linda-espresso/80 shadow-neuInsetSm">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-linda-sage" aria-hidden="true" />
            <span>
              <strong>Doprava zdarma:</strong> {dopravaZdarma}
            </span>
          </p>
        )}
      </div>

      {/* Platba */}
      <div className="space-y-6 border-t border-linda-sand/60 pt-6">
        <h2 className="flex items-center gap-2 font-serif text-2xl text-linda-cognac">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-linda-cream shadow-neuSm">
            <CreditCard className="h-6 w-6" aria-hidden="true" />
          </span>
          Platební metody
        </h2>

        {/* Mřížka se řídí počtem dlaždic, ne pevnými dvěma sloupci. Karta se
            nabízí jen s nastavenou bránou (stejná podmínka jako v pokladně),
            takže bez klíčů zbyde jediná dlaždice – v `md:grid-cols-2` by
            visela v levé polovině a vedle ní by zela prázdná buňka. */}
        <div
          className={`grid grid-cols-1 gap-6 ${platby.length > 1 ? 'md:grid-cols-2' : ''}`}
        >
          {platby.map((platba) => (
            <div key={platba.nazev} className="space-y-2 rounded-2xl bg-linda-cream p-6 shadow-neu">
              <h3 className="font-serif text-lg text-linda-espresso">{platba.nazev}</h3>
              <p className="text-xs text-linda-espresso/75">{platba.popis}</p>
            </div>
          ))}
        </div>

        <p className="flex items-start gap-2 rounded-2xl bg-linda-sandLight p-4 text-xs font-medium text-linda-espresso/80 shadow-neuInsetSm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-linda-sage" aria-hidden="true" />
          <span>{popisDph(nastaveni)}</span>
        </p>

        <div className="space-y-1 rounded-2xl bg-linda-espresso p-4 text-xs text-linda-cream shadow-neu">
          <span className="font-semibold text-linda-sand">Upozornění k platbám:</span>
          <p className="text-linda-cream/80">
            E-shop LINDA FASHION nepodporuje platbu na dobírku pro zajištění maximální
            bezpečnosti a plynulosti doručení.
          </p>
        </div>
      </div>
    </div>
  );
}
