import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { RETENCE } from '@/lib/retence';
import {
  PLATNOST_SOUHLASU_DNU,
  jeAnalytikaNastavena,
  jeMarketingNastaven,
} from '@/lib/souhlas-cookies';

export const metadata: Metadata = {
  title: 'Zásady používání cookies | LINDA FASHION',
  description:
    'Jaké soubory cookies a podobná úložiště web používá, k čemu, jak dlouho a komu se údaje předávají. Souhlas můžete kdykoliv odvolat.',
  alternates: { canonical: '/cookies' },
};

/*
 * Zásady cookies.
 *
 * Dřív tu byly dva odstavce a věta, že analytika měří „anonymně" – což GA4
 * nedělá. Informovaný souhlas (čl. 4 bod 11 GDPR, § 89 odst. 3 zák.
 * č. 127/2005 Sb.) potřebuje vědět, **co** se ukládá, **kdo** to čte, **jak
 * dlouho** a **kam** data odcházejí. Proto seznam po jednotlivých souborech.
 *
 * Analytika a marketing se vypisují jen tehdy, když je nástroj opravdu
 * zapnutý (`NEXT_PUBLIC_*`) – stejné pravidlo jako u lišty. Popisovat cookies,
 * které web neukládá, by bylo stejně nepravdivé jako zamlčet ty, které ukládá.
 *
 * Při každé věcné změně téhle stránky zvedněte `VERZE_ZASAD_COOKIES`.
 * Stránka je statická: `NEXT_PUBLIC_*` se vkládá při buildu, nic se nečte
 * z databáze, a proto nepotřebuje `force-dynamic` ani `loading.tsx`.
 */

interface Polozka {
  nazev: string;
  druh: string;
  ucel: string;
  doba: string;
}

const NEZBYTNE: Polozka[] = [
  {
    nazev: 'linda_session',
    druh: 'cookie (HttpOnly)',
    ucel: 'Přihlášení k zákaznickému účtu. Vzniká jen po přihlášení.',
    doba: '30 dní, nebo do odhlášení',
  },
  {
    nazev: 'linda_cart',
    druh: 'úložiště prohlížeče (localStorage)',
    ucel: 'Obsah nákupního košíku.',
    doba: 'do vyprázdnění košíku nebo smazání dat prohlížeče',
  },
  {
    nazev: 'linda_favorites',
    druh: 'úložiště prohlížeče (localStorage)',
    ucel: 'Kousky, které jste si označili srdíčkem.',
    doba: 'do odebrání nebo smazání dat prohlížeče',
  },
  {
    nazev: 'linda_kody',
    druh: 'úložiště relace (sessionStorage)',
    ucel: 'Slevový kód nebo poukaz uplatněný v košíku, aby ho pokladna znala.',
    doba: 'do zavření okna prohlížeče',
  },
  {
    nazev: 'linda_cookie_consent',
    druh: 'úložiště prohlížeče (localStorage)',
    ucel: 'Vaše volba v nastavení cookies, abychom se neptali při každé návštěvě.',
    doba: `${Math.round(PLATNOST_SOUHLASU_DNU / 30.4)} měsíců, pak se zeptáme znovu`,
  },
  {
    nazev: 'linda_consent_id',
    druh: 'úložiště prohlížeče (localStorage)',
    ucel:
      'Náhodné číslo, které v evidenci souhlasů spojuje vaše jednotlivá rozhodnutí. Nic o vás neříká a není odvozené z vaší IP adresy ani prohlížeče.',
    doba: 'do smazání dat prohlížeče',
  },
];

const ANALYTICKE: Polozka[] = [
  {
    nazev: '_ga',
    druh: 'cookie – Google',
    ucel: 'Rozlišuje návštěvníky, aby šlo spočítat, kolik lidí web navštívilo.',
    doba: '2 roky',
  },
  {
    nazev: '_ga_<ID>',
    druh: 'cookie – Google',
    ucel: 'Uchovává stav návštěvy (relace).',
    doba: '2 roky',
  },
];

const MARKETINGOVE: Polozka[] = [
  {
    nazev: '_fbp',
    druh: 'cookie – Meta',
    ucel: 'Rozlišuje prohlížeč, aby Meta mohla měřit účinnost reklam a zobrazovat je.',
    doba: '90 dní',
  },
  {
    nazev: '_fbc',
    druh: 'cookie – Meta',
    ucel: 'Zaznamená, že jste na web přišli kliknutím na reklamu na Facebooku nebo Instagramu.',
    doba: '90 dní',
  },
];

function SeznamPolozek({ polozky }: { polozky: Polozka[] }) {
  return (
    <ul className="space-y-3">
      {polozky.map((p) => (
        <li key={p.nazev} className="rounded-xl bg-linda-sandLight p-4 shadow-neuInsetSm">
          <p className="font-semibold text-linda-espresso">
            {p.nazev}
            <span className="ml-2 text-xs font-normal text-linda-espresso/70">{p.druh}</span>
          </p>
          <p className="mt-1 text-linda-espresso/80">{p.ucel}</p>
          <p className="mt-1 text-xs text-linda-espresso/70">Doba uložení: {p.doba}</p>
        </li>
      ))}
    </ul>
  );
}

function Sekce({ nadpis, children }: { nadpis: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl bg-linda-cream p-6 shadow-neu">
      <h2 className="font-serif text-xl text-linda-cognac">{nadpis}</h2>
      {children}
    </section>
  );
}

export default function CookiesInfoPage() {
  const analytika = jeAnalytikaNastavena();
  const marketing = jeMarketingNastaven();
  const letEvidence = Math.round(RETENCE.souhlasCookiesDnu / 365);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-12 text-linda-espresso sm:px-6 lg:px-8">
      <div className="border-b border-linda-sand pb-6">
        <h1 className="font-serif text-4xl">Zásady používání cookies</h1>
        <p className="mt-1 text-sm text-linda-espresso/70">
          Co web ukládá ve vašem prohlížeči, k čemu a na jak dlouho
        </p>
      </div>

      <div className="space-y-6 text-sm leading-relaxed">
        <Sekce nadpis="Co jsou cookies">
          <p>
            Cookies jsou malé textové soubory, které web ukládá ve vašem prohlížeči. Podobně
            funguje i úložiště prohlížeče (localStorage, sessionStorage), proto je uvádíme
            společně. Nezbytné soubory potřebujeme k tomu, aby web fungoval, a souhlas k nim
            nepotřebujeme. Všechno ostatní ukládáme jen s vaším souhlasem (§ 89 odst. 3 zákona
            č. 127/2005 Sb., o elektronických komunikacích).
          </p>
        </Sekce>

        <Sekce nadpis="Nezbytné – vždy zapnuté">
          <p>Ukládá je jen tento web a nikomu je nepředává.</p>
          <SeznamPolozek polozky={NEZBYTNE} />
        </Sekce>

        {analytika && (
          <Sekce nadpis="Analytické – jen s vaším souhlasem">
            <p>
              Používáme Google Analytics, abychom věděli, které stránky lidé navštěvují a kde
              web nefunguje dobře. Data nejsou anonymní: Google vám přidělí identifikátor
              (pseudonym), podle kterého pozná opakované návštěvy. Poskytovatelem je Google
              Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irsko. Údaje mohou být
              předány společnosti Google LLC do USA, která je certifikovaná v rámci EU-US Data
              Privacy Framework (rozhodnutí Evropské komise o odpovídající ochraně z 10. 7. 2023).
            </p>
            <SeznamPolozek polozky={ANALYTICKE} />
          </Sekce>
        )}

        {marketing && (
          <Sekce nadpis="Marketingové – jen s vaším souhlasem">
            <p>
              Meta Pixel měří, jestli naše reklamy na Facebooku a Instagramu vedou k návštěvám
              a nákupům, a umožňuje vám je zobrazit. Za sběr a předání těchto údajů společnosti
              Meta odpovídáme společně se společností Meta Platforms Ireland Limited, Merrion
              Road, Dublin 4, Irsko (společní správci podle čl. 26 GDPR). Další zpracování už
              řídí Meta podle svých zásad ochrany osobních údajů. Údaje mohou být předány
              společnosti Meta Platforms, Inc. do USA, která je certifikovaná v rámci EU-US Data
              Privacy Framework.
            </p>
            <SeznamPolozek polozky={MARKETINGOVE} />
          </Sekce>
        )}

        {!analytika && !marketing && (
          <Sekce nadpis="Analytické a marketingové">
            <p>
              Žádné analytické ani marketingové nástroje teď nepoužíváme, a proto se vás na
              souhlas ani neptáme. Kdybychom je v budoucnu zapnuli, uvedeme je zde a před jejich
              spuštěním vás požádáme o souhlas.
            </p>
          </Sekce>
        )}

        <Sekce nadpis="Jak souhlas změnit nebo odvolat">
          <p>
            Volbu můžete kdykoliv změnit tlačítkem <strong>Nastavení cookies</strong> v patičce
            webu. Odvolání platí okamžitě: stránka se znovu načte bez měřicích nástrojů a jejich
            soubory smažeme. Odvolání se nedotýká zpracování, které proběhlo předtím. Po{' '}
            {Math.round(PLATNOST_SOUHLASU_DNU / 30.4)} měsících se vás zeptáme znovu.
          </p>
          <p>
            Cookies můžete také smazat nebo zablokovat v nastavení svého prohlížeče. Cookies,
            které si Meta nebo Google uložily na svých vlastních doménách, smazat neumíme – ty
            spravujete v nastavení svého účtu u nich.
          </p>
          <p>
            Každé vaše rozhodnutí si zaznamenáváme (datum, volba, verze těchto zásad, IP adresa),
            abychom ho mohli doložit. Záznam uchováváme {letEvidence}{' '}
            {letEvidence === 1 ? 'rok' : letEvidence < 5 ? 'roky' : 'let'}. Víc o zpracování
            osobních údajů najdete v{' '}
            <Link
              href="/ochrana-osobnich-udaju"
              className="font-semibold text-linda-cognac underline underline-offset-2"
            >
              zásadách ochrany osobních údajů
            </Link>
            .
          </p>
        </Sekce>
      </div>
    </div>
  );
}
