import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TiskoveTlacitko } from '@/components/ui/TiskoveTlacitko';
import { nacistNastaveni } from '@/lib/nastaveni';
import { DNU_NA_ODSTOUPENI } from '@/lib/lhuty';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Vzorový formulář pro odstoupení od smlouvy | LINDA FASHION',
  description:
    'Vzorový formulář pro odstoupení od kupní smlouvy podle přílohy 2 nařízení vlády č. 363/2013 Sb. K vytištění i k odeslání e-mailem.',
  alternates: { canonical: '/odstoupeni/formular' },
};

/**
 * Vzorový formulář pro odstoupení od smlouvy.
 *
 * Znění je dané **přílohou 2 nařízení vlády č. 363/2013 Sb.** – text se proto
 * needituje do hezčí češtiny. Povinnost je formulář poskytnout; splnit ji
 * odkazem do obchodních podmínek, kde žádný není, nešlo (a přesně to potvrzovací
 * stránka objednávky roky slibovala).
 *
 * Adresát se doplňuje z `Settings`, ne natvrdo: formulář, který zákaznice
 * vytiskne a pošle na starou adresu, je horší než prázdné pole.
 *
 * Zbytek jsou linky k vyplnění. Není to interaktivní formulář schválně –
 * elektronickou cestu řeší `/odstoupeni`, tohle je papír pro tu zákaznici,
 * která chce odstoupení poslat poštou nebo přiložit k zásilce.
 */

/** Řádek k vyplnění: popisek nad, linka pod ním. */
function Linka({ popis, vyska = 'h-8' }: { popis: string; vyska?: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold text-linda-espresso">{popis}</p>
      <div className={`${vyska} w-full border-b border-dashed border-linda-espresso/40`} />
    </div>
  );
}

export default async function VzorovyFormularPage() {
  const nastaveni = await nacistNastaveni();

  const adresat = [
    nastaveni.nazevFirmy,
    nastaveni.adresaProVraceni ?? nastaveni.adresaFirmy,
    nastaveni.icoFirmy ? `IČO: ${nastaveni.icoFirmy}` : null,
    nastaveni.emailFirmy,
  ].filter((radek): radek is string => Boolean(radek && radek.trim()));

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6 lg:px-8">
      <div data-tisk="skryt" className="space-y-4 border-b border-linda-sand pb-6">
        <Link
          href="/odstoupeni"
          className="inline-flex min-h-touch cursor-pointer items-center gap-2 text-xs font-semibold text-linda-cognac transition-colors hover:text-linda-cognacHover"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Zpět na odstoupení od smlouvy
        </Link>

        <div>
          <h1 className="font-serif text-4xl text-linda-espresso">Vzorový formulář</h1>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-linda-espresso/75">
            Podle přílohy 2 nařízení vlády č. 363/2013 Sb. Vyplňte ho jen tehdy, chcete-li
            odstoupit od smlouvy, a pošlete nám ho poštou nebo e-mailem. Rychlejší je{' '}
            <Link
              href="/odstoupeni"
              className="font-semibold text-linda-cognac underline underline-offset-2"
            >
              elektronické odstoupení
            </Link>{' '}
            – potvrzení dostanete okamžitě.
          </p>
        </div>

        <TiskoveTlacitko popis="Vytisknout formulář" />
      </div>

      {/* Samotný formulář. `tisk-list` mu na papíře sundá reliéf a barvu –
          neumorfní stín vytištěný na laserovce je jen šedý flek. */}
      <article className="tisk-list space-y-6 rounded-2xl bg-linda-cream p-6 shadow-neu sm:p-10">
        <h2 className="font-serif text-2xl text-linda-espresso">
          Oznámení o odstoupení od smlouvy
        </h2>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-linda-espresso">Adresát:</p>

          {adresat.length > 0 ? (
            <address className="whitespace-pre-line rounded-xl bg-linda-sandLight p-4 text-xs not-italic leading-relaxed text-linda-espresso shadow-neuInsetSm">
              {adresat.join('\n')}
            </address>
          ) : (
            /* Bez vyplněných údajů v administraci se tiskne prázdné pole.
               Vymyšlený adresát by z formuláře udělal doklad, který nikam
               nedojde – prázdná linka je poctivější. */
            <div className="h-20 w-full border-b border-dashed border-linda-espresso/40" />
          )}
        </div>

        <p className="text-xs leading-relaxed text-linda-espresso">
          Oznamuji/oznamujeme <span className="text-linda-espresso/70">(*)</span>, že tímto
          odstupuji/odstupujeme <span className="text-linda-espresso/70">(*)</span> od smlouvy
          o nákupu tohoto zboží <span className="text-linda-espresso/70">(*)</span> / o poskytnutí
          těchto služeb <span className="text-linda-espresso/70">(*)</span>:
        </p>

        <Linka popis="Označení zboží (název, velikost, počet kusů) a číslo objednávky" vyska="h-16" />
        <Linka popis="Datum objednání (*) / datum obdržení (*)" />
        <Linka popis="Jméno a příjmení spotřebitele / spotřebitelů" />
        <Linka popis="Adresa spotřebitele / spotřebitelů" vyska="h-12" />
        <Linka popis="Číslo účtu pro vrácení peněz" />
        <Linka popis="Podpis spotřebitele / spotřebitelů (pouze pokud je formulář zasílán v listinné podobě)" />
        <Linka popis="Datum" />

        <p className="border-t border-linda-sand pt-4 text-[11px] leading-relaxed text-linda-espresso/70">
          (*) Nehodící se škrtněte nebo údaje doplňte.
        </p>

        <p className="text-[11px] leading-relaxed text-linda-espresso/70">
          Zboží nám prosím odešlete nejpozději do {DNU_NA_ODSTOUPENI} dnů ode dne odstoupení. Peníze
          vám vrátíme do {DNU_NA_ODSTOUPENI} dnů ode dne, kdy nám odstoupení došlo; můžeme však
          počkat, dokud zboží neobdržíme zpět nebo dokud neprokážete, že jste ho odeslala.
        </p>
      </article>
    </div>
  );
}
