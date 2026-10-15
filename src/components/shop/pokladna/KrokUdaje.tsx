'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Mail, MapPin, MessageSquare } from 'lucide-react';
import { udajeSchema } from '@/lib/validations/objednavka';
import { udajeProServer, usePokladna, useStrazceKroku } from '@/lib/pokladna-kontext';
import type { UdajeZakaznice } from '@/lib/pokladna-uloziste';
import { KrokKarty, NavigaceKroku, Pole, TRIDY_HLAVNIHO_TLACITKA } from './prvky';
import { NacitaniKroku } from './NacitaniKroku';
import { PrubeznySouhrn } from './PrubeznySouhrn';

/** Pořadí polí na stránce – na první chybné se přesune fokus. */
const PORADI: ReadonlyArray<keyof UdajeZakaznice> = [
  'email',
  'dodaciTelefon',
  'dodaciJmenoPrijmeni',
  'dodaciUlice',
  'dodaciMesto',
  'dodaciPsc',
  'poznamka',
];

const ID_POLE: Record<keyof UdajeZakaznice, string> = {
  email: 'pokladna-email',
  dodaciTelefon: 'pokladna-telefon',
  dodaciJmenoPrijmeni: 'pokladna-jmeno',
  dodaciUlice: 'pokladna-ulice',
  dodaciMesto: 'pokladna-mesto',
  dodaciPsc: 'pokladna-psc',
  poznamka: 'pokladna-poznamka',
};

/** Krok 2 – kontakt a adresa. Doprava a platba přijdou až po nich. */
export function KrokUdaje() {
  const router = useRouter();
  const pripraveno = useStrazceKroku(2);
  const { data, koncept, nastavitUdaj, upravit } = usePokladna();
  const { udaje } = koncept;
  const [chyby, setChyby] = useState<Partial<Record<keyof UdajeZakaznice, string>>>({});

  const zmenit = (pole: keyof UdajeZakaznice) => (hodnota: string) => {
    nastavitUdaj(pole, hodnota);
    if (chyby[pole]) setChyby((c) => ({ ...c, [pole]: undefined }));
  };

  const pokracovat = (e: React.FormEvent) => {
    e.preventDefault();

    // Stejné schéma jako server – hláška zazní u pole hned, ne až po odeslání
    // ze shrnutí. Poslední slovo má pořád server.
    const vysledek = udajeSchema.safeParse(udajeProServer(udaje));

    if (!vysledek.success) {
      const nove: Partial<Record<keyof UdajeZakaznice, string>> = {};
      for (const problem of vysledek.error.issues) {
        const pole = problem.path[0] as keyof UdajeZakaznice;
        nove[pole] ??= problem.message;
      }
      setChyby(nove);

      const prvni = PORADI.find((p) => nove[p]);
      if (prvni) document.getElementById(ID_POLE[prvni])?.focus();
      return;
    }

    upravit((k) => ({ ...k, potvrzeno: { ...k.potvrzeno, udaje: true } }));
    router.push('/pokladna/doprava');
  };

  if (!pripraveno) return <NacitaniKroku />;

  return (
    <form onSubmit={pokracovat} noValidate className="grid grid-cols-1 gap-10 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-7">
        <KrokKarty nadpis="Kontaktní údaje" ikona={<Mail className="h-5 w-5 text-linda-cognac" aria-hidden="true" />}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Pole
              id={ID_POLE.email}
              label="E-mail"
              type="email"
              inputMode="email"
              required
              autoComplete="email"
              placeholder="vas.email@example.cz"
              value={udaje.email}
              onChange={zmenit('email')}
              chyba={chyby.email}
              napoveda="Pošleme na něj potvrzení objednávky a doklad."
            />
            <Pole
              id={ID_POLE.dodaciTelefon}
              label="Telefon"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+420 777 888 999"
              value={udaje.dodaciTelefon}
              onChange={zmenit('dodaciTelefon')}
              chyba={chyby.dodaciTelefon}
              napoveda="Nepovinný – hodí se dopravci, kdyby zásilku nemohl doručit."
            />
          </div>

          {!data.uzivatel && (
            <p className="text-[11px] text-linda-espresso/75">
              Objednávat můžete i bez registrace. Máte účet?{' '}
              <Link
                href="/prihlaseni?dalsi=/pokladna"
                className="font-semibold text-linda-cognac underline-offset-2 hover:underline"
              >
                Přihlaste se
              </Link>{' '}
              a údaje doplníme z něj.
            </p>
          )}
        </KrokKarty>

        <KrokKarty nadpis="Adresa" ikona={<MapPin className="h-5 w-5 text-linda-cognac" aria-hidden="true" />}>
          {/* Doprava se vybírá až v dalším kroku, takže tady ještě nevíme, jestli
              zásilka půjde na adresu, nebo na výdejní místo. Adresa je potřeba
              v obou případech – na výdejní místo ji uvedeme aspoň na dokladu. */}
          <p className="text-[11px] text-linda-espresso/75">
            Na tuto adresu doručíme, pokud v dalším kroku nezvolíte výdejní místo. Uvedeme ji i na
            dokladu.
          </p>

          {data.vychoziAdresa && (
            <p className="flex items-start gap-2 rounded-xl bg-linda-sandLight p-3 text-[11px] leading-relaxed text-linda-espresso/85 shadow-neuInsetSm">
              <MapPin className="mt-px h-3.5 w-3.5 shrink-0 text-linda-cognac" aria-hidden="true" />
              <span>
                Předvyplnili jsme vaši výchozí adresu z účtu. Můžete ji tady přepsat – uložené adresy se tím
                nezmění a spravujete je v{' '}
                <Link href="/muj-ucet" className="font-semibold text-linda-cognac hover:underline">
                  mém účtu
                </Link>
                .
              </span>
            </p>
          )}

          <div className="space-y-4">
            <Pole
              id={ID_POLE.dodaciJmenoPrijmeni}
              label="Jméno a příjmení"
              required
              autoComplete="name"
              placeholder="Marie Nováková"
              value={udaje.dodaciJmenoPrijmeni}
              onChange={zmenit('dodaciJmenoPrijmeni')}
              chyba={chyby.dodaciJmenoPrijmeni}
            />
            <Pole
              id={ID_POLE.dodaciUlice}
              label="Ulice a číslo popisné"
              required
              autoComplete="street-address"
              placeholder="Vodičkova 45"
              value={udaje.dodaciUlice}
              onChange={zmenit('dodaciUlice')}
              chyba={chyby.dodaciUlice}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Pole
                id={ID_POLE.dodaciMesto}
                label="Město"
                required
                autoComplete="address-level2"
                placeholder="Praha 1"
                value={udaje.dodaciMesto}
                onChange={zmenit('dodaciMesto')}
                chyba={chyby.dodaciMesto}
              />
              <Pole
                id={ID_POLE.dodaciPsc}
                label="PSČ"
                required
                autoComplete="postal-code"
                inputMode="numeric"
                placeholder="110 00"
                value={udaje.dodaciPsc}
                onChange={zmenit('dodaciPsc')}
                chyba={chyby.dodaciPsc}
              />
            </div>
            <p className="text-[11px] text-linda-espresso/70">Doručujeme v rámci České republiky.</p>
          </div>
        </KrokKarty>

        <KrokKarty
          nadpis="Poznámka"
          ikona={<MessageSquare className="h-5 w-5 text-linda-cognac" aria-hidden="true" />}
        >
          <Pole
            id={ID_POLE.poznamka}
            label="Poznámka k objednávce"
            placeholder="Např. přání k dárku nebo prosba o dárkové balení"
            value={udaje.poznamka}
            onChange={zmenit('poznamka')}
            chyba={chyby.poznamka}
          />
        </KrokKarty>

        <NavigaceKroku zpetHref="/kosik" zpetText="Zpět do košíku">
          <button type="submit" className={TRIDY_HLAVNIHO_TLACITKA}>
            Pokračovat k dopravě a platbě
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </NavigaceKroku>
      </div>

      {/* Doprava je předvybraná, ale zvolená ještě není – její cenu by
          souhrn sliboval dřív, než si ji zákaznice vybrala. */}
      <PrubeznySouhrn bezDopravy={!koncept.potvrzeno.doprava} />
    </form>
  );
}
