import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, Undo2 } from 'lucide-react';
import { OdstoupeniFormular } from '@/components/shop/OdstoupeniFormular';
import { nacistNastaveni } from '@/lib/nastaveni';
import { DNU_NA_ODSTOUPENI } from '@/lib/lhuty';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Odstoupení od smlouvy | LINDA FASHION',
  description:
    'Odstupte od kupní smlouvy do 14 dnů od převzetí zboží, bez udání důvodu a bez přihlášení. Potvrzení s datem a časem přijetí dorazí e-mailem.',
  alternates: { canonical: '/odstoupeni' },
};

/**
 * Stránka „Odstoupit od smlouvy" – § 1830a o. z., účinný od 19. 6. 2026.
 *
 * Zákon nechce jen možnost odstoupit (tu dává § 1829 dávno), ale **funkci
 * v prostředí, kde smlouva vznikla**: viditelné a snadno dostupné tlačítko,
 * jednoduchý formulář za ním, potvrzovací krok a automatické potvrzení
 * s datem a časem. Proto je to samostatná veřejná cesta a ne odstavec
 * v obchodních podmínkách s adresou, kam napsat.
 *
 * `?token=` v adrese přichází z odkazu v potvrzovacím e-mailu a přeskočí
 * hledání objednávky. Rekapitulaci ale nepřeskočí – ta je zákonný krok.
 */
export default async function OdstoupeniPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const nastaveni = await nacistNastaveni();

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <header className="space-y-3 border-b border-linda-sand pb-8">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-linda-cognac">
          <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
          Vrácení bez udání důvodu
        </p>
        <h1 className="font-serif text-4xl text-linda-espresso">Odstoupení od smlouvy</h1>
        <p className="max-w-2xl text-xs leading-relaxed text-linda-espresso/75">
          Zboží koupené přes internet můžete vrátit do {DNU_NA_ODSTOUPENI} dnů od převzetí, bez
          udání důvodu a bez sankce. Vyplňte níž objednávku, potvrďte odstoupení a my vám obratem
          pošleme potvrzení s datem a časem přijetí.
        </p>
      </header>

      <OdstoupeniFormular
        tokenZOdkazu={searchParams.token}
        adresaProVraceni={nastaveni.adresaProVraceni}
        emailFirmy={nastaveni.emailFirmy}
      />

      {/* Poučení podle přílohy 1 nařízení vlády č. 363/2013 Sb. Patří k formuláři,
          ne za odkaz: povinnost je poučit **před** uzavřením smlouvy i u něj. */}
      <section className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neuSm sm:p-8">
        <h2 className="font-serif text-xl text-linda-espresso">Poučení o právu na odstoupení</h2>

        <div className="space-y-3 text-xs leading-relaxed text-linda-espresso/85">
          <p>
            <strong>Právo odstoupit od smlouvy.</strong> Máte právo odstoupit od této smlouvy bez
            udání důvodu ve lhůtě {DNU_NA_ODSTOUPENI} dnů. Lhůta běží ode dne, kdy jste vy nebo
            vámi určená třetí osoba (jiná než dopravce) převzala poslední kus zboží z objednávky.
          </p>
          <p>
            <strong>Jak odstoupit.</strong> Stačí jednoznačné prohlášení – formulář na této
            stránce, dopis, e-mail nebo{' '}
            <Link
              href="/odstoupeni/formular"
              className="font-semibold text-linda-cognac underline underline-offset-2"
            >
              vzorový formulář
            </Link>
            . Lhůta je zachována, pokud odstoupení odešlete její poslední den.
          </p>
          <p>
            <strong>Důsledky odstoupení.</strong> Vrátíme vám všechny platby včetně nákladů na
            dodání (kromě dodatečných nákladů vzniklých tím, že jste zvolila jiný než námi nabízený
            nejlevnější způsob dodání), a to nejpozději do {DNU_NA_ODSTOUPENI} dnů ode dne, kdy nám
            odstoupení došlo. Platbu vrátíme stejným způsobem, jakým jste platila, pokud se
            nedohodneme jinak. S vrácením můžeme počkat, dokud zboží neobdržíme zpět nebo dokud
            neprokážete, že jste ho odeslala.
          </p>
          <p>
            <strong>Vrácení zboží.</strong> Zboží nám zašlete zpět bez zbytečného odkladu,
            nejpozději do {DNU_NA_ODSTOUPENI} dnů ode dne odstoupení
            {nastaveni.adresaProVraceni ? (
              <>
                , na adresu <strong>{nastaveni.adresaProVraceni}</strong>
              </>
            ) : null}
            . Přímé náklady spojené s vrácením nesete vy. Odpovídáte za snížení hodnoty zboží,
            které vzniklo nakládáním s ním jinak, než je nutné k obeznámení se s jeho povahou,
            vlastnostmi a funkčností.
          </p>
        </div>

        <Link
          href="/odstoupeni/formular"
          className="inline-flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-linda-cream px-5 text-xs font-semibold text-linda-espresso shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
        >
          <FileText className="h-4 w-4 text-linda-cognac" aria-hidden="true" />
          Vzorový formulář k vytištění
        </Link>
      </section>
    </div>
  );
}
