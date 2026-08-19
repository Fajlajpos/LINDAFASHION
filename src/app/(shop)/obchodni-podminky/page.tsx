import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertCircle, History } from 'lucide-react';
import { PravniText } from '@/components/shop/PravniText';
import { nacistZneni, nacistVerzi } from '@/lib/pravni-dokumenty';
import { nacistNastaveni, popisDodaciLhuty } from '@/lib/nastaveni';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Obchodní podmínky | LINDA FASHION',
  description:
    'Všeobecné obchodní podmínky: uzavření smlouvy, ceny, doba dodání, odstoupení od smlouvy do 14 dnů, reklamace a mimosoudní řešení sporů.',
  alternates: { canonical: '/obchodni-podminky' },
};

/**
 * Obchodní podmínky.
 *
 * Text se čte z databáze (`PravniDokument`), ne z JSX. Důvod je důkazní:
 * `Order.verzePodminek` se snímkuje na každou objednávku, ale dokud znění
 * žilo v kódu, ukazoval ten štítek na text, který nikdo neuchovával – „s čím
 * přesně souhlasila" nešlo doložit.
 *
 * `?verze=` otevře konkrétní historické znění. Tenhle parametr je celý smysl
 * přestavby: odkaz u objednávky musí i za pět let vést na to, co zákaznice
 * tenkrát odsouhlasila, ne na dnešní text.
 *
 * Údaje o prodávajícím se berou z `Settings` a stojí **nad** dokumentem.
 * V uloženém znění schválně nejsou: adresa se stěhuje častěji než podmínky
 * a nová verze celého dokumentu kvůli změně telefonu by z verzování udělala
 * šum, ve kterém se skutečná změna pravidel ztratí.
 */
export default async function ObchodniPodminkyPage({
  searchParams,
}: {
  searchParams: { verze?: string };
}) {
  const nastaveni = await nacistNastaveni();

  const zadanaVerze = searchParams.verze?.trim();
  const historicke = zadanaVerze ? await nacistVerzi('obchodni-podminky', zadanaVerze) : null;
  const zneni = historicke ?? (await nacistZneni('obchodni-podminky'));

  const jeHistoricke = historicke !== null;
  const nenalezeno = Boolean(zadanaVerze) && historicke === null;

  const prodavajici = [
    nastaveni.nazevFirmy,
    nastaveni.adresaFirmy,
    nastaveni.icoFirmy ? `IČO: ${nastaveni.icoFirmy}` : null,
    nastaveni.dicFirmy ? `DIČ: ${nastaveni.dicFirmy}` : null,
    nastaveni.zapisVRejstriku,
    nastaveni.emailFirmy,
    nastaveni.telefonFirmy,
  ].filter((r): r is string => Boolean(r && r.trim()));

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <header className="space-y-2 border-b border-linda-sand pb-8">
        <h1 className="font-serif text-4xl text-linda-espresso">{zneni.nadpis}</h1>
        <p className="text-xs text-linda-espresso/70">
          Verze <strong className="font-semibold">{zneni.verze}</strong>
          {zneni.zDatabaze && (
            <> · účinné od {zneni.ucinnostOd.toLocaleDateString('cs-CZ')}</>
          )}
        </p>
      </header>

      {nenalezeno && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-linda-sandLight p-4 text-xs text-linda-espresso/85 shadow-neuInsetSm"
        >
          <AlertCircle className="mt-px h-4 w-4 shrink-0 text-linda-cognac" aria-hidden="true" />
          <span>
            Znění verze „{zadanaVerze}&ldquo; jsme nenašli. Níž je aktuální znění. Pokud potřebujete
            doložit starší verzi, napište nám prosím – dohledáme ji.
          </span>
        </p>
      )}

      {jeHistoricke && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-xl bg-linda-sandLight p-4 text-xs text-linda-espresso/85 shadow-neuInsetSm"
        >
          <History className="mt-px h-4 w-4 shrink-0 text-linda-cognac" aria-hidden="true" />
          <span>
            Prohlížíte si <strong>historické znění</strong> verze {zneni.verze}. Pro nové
            objednávky platí{' '}
            <Link
              href="/obchodni-podminky"
              className="font-semibold text-linda-cognac underline underline-offset-2"
            >
              aktuální podmínky
            </Link>
            .
          </span>
        </p>
      )}

      {/* Údaje o prodávajícím – § 435 o. z. a § 1811 odst. 2 o. z. */}
      {prodavajici.length > 0 && (
        <section className="space-y-2 rounded-2xl bg-linda-cream p-6 shadow-neu">
          <h2 className="font-serif text-lg text-linda-cognac">Prodávající</h2>
          <address className="whitespace-pre-line rounded-xl bg-linda-sandLight p-4 text-xs not-italic leading-relaxed text-linda-espresso shadow-neuInsetSm">
            {prodavajici.join('\n')}
          </address>
        </section>
      )}

      <article className="rounded-2xl bg-linda-cream p-6 shadow-neu sm:p-8">
        <PravniText obsah={zneni.obsah} />

        {/* Doba dodání se dopisuje pod text, ne do něj: mění se v nastavení
            a je to údaj o provozu, ne pravidlo smlouvy. § 1820 odst. 1
            písm. h) chce, aby zazněla – tady i u produktu a v pokladně. */}
        <p className="mt-6 rounded-xl bg-linda-sandLight p-4 text-xs leading-relaxed text-linda-espresso/85 shadow-neuInsetSm">
          <strong className="font-semibold">Aktuální doba dodání:</strong>{' '}
          {popisDodaciLhuty(nastaveni)} Odstoupit od smlouvy můžete{' '}
          <Link
            href="/odstoupeni"
            className="font-semibold text-linda-cognac underline underline-offset-2"
          >
            zde
          </Link>
          , vzorový formulář najdete{' '}
          <Link
            href="/odstoupeni/formular"
            className="font-semibold text-linda-cognac underline underline-offset-2"
          >
            zde
          </Link>
          .
        </p>
      </article>

      {!zneni.zDatabaze && (
        /* Záložní text z kódu. Říct to nahlas je důležitější než hezčí
           stránka: dokud znění není v databázi, nemá se čím doložit, s čím
           zákaznice u konkrétní objednávky souhlasila. */
        <p className="rounded-xl bg-linda-sandLight p-4 text-[11px] leading-relaxed text-linda-espresso/75 shadow-neuInsetSm">
          Toto je výchozí znění dodané s e-shopem. Majitelka ho může nahradit vlastním
          v administraci; teprve vložené znění se archivuje s verzí a dá se doložit
          u konkrétní objednávky.
        </p>
      )}
    </div>
  );
}
