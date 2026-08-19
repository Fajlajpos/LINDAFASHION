'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CheckCircle,
  FileText,
  Loader2,
  Package,
  ShieldCheck,
} from 'lucide-react';
import { nacist, poslatJson } from '@/lib/api-klient';
import { OblastFormulare, PoleFormulare, Hlaska } from '@/components/ui/PoleFormulare';

/**
 * Odstoupení od smlouvy – § 1829 a § 1830a o. z.
 *
 * Tři vlastnosti tady nejsou vzhledové, ale zákonné, a nesmí se „zjednodušit“:
 *
 *  1. **Bez přihlášení.** Formulář se ptá na číslo objednávky a e-mail, nebo
 *     si vezme token z odkazu v potvrzovacím e-mailu. Objednávka bez
 *     registrace nemá účet, ale právo odstoupit má stejné.
 *  2. **Dva kroky.** § 1830a chce potvrzovací krok proti odstoupení omylem –
 *     druhá obrazovka je rekapitulace a teprve na ní se odstupuje. Proto je to
 *     stavový automat, ne jeden formulář s jedním tlačítkem.
 *  3. **Datum a čas.** Poslední krok ukazuje okamžik přijetí, který přišel ze
 *     serveru. Nepočítá se v prohlížeči: čas zákaznicina notebooku není důkaz.
 */

interface Polozka {
  id: string;
  nazev: string;
  velikost: string;
  mnozstvi: number;
}

interface NalezenaObjednavka {
  cisloObjednavky: string;
  token: string;
  celkovaCena: number;
  datumObjednani: string;
  datumDoruceni: string | null;
  lhutaDo: string | null;
  polozky: Polozka[];
}

type OdpovedHledani =
  | { nalezeno: true; objednavka: NalezenaObjednavka }
  | { nalezeno: false; zprava: string };

interface OdpovedPrijeti {
  prijatoAt: string;
  cisloObjednavky: string;
  adresaProVraceni: string | null;
  zprava: string;
}

type Krok = 'hledani' | 'rekapitulace' | 'hotovo';

function datum(hodnota: string | null): string {
  if (!hodnota) return '—';
  return new Date(hodnota).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function datumACas(hodnota: string): string {
  return new Date(hodnota).toLocaleString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Řádek rekapitulace: štítek vlevo, hodnota vpravo. */
function Radek({ stitek, hodnota }: { stitek: string; hodnota: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-linda-sand/40 py-2 last:border-b-0">
      <span className="text-[11px] uppercase tracking-wider text-linda-espresso/70">{stitek}</span>
      <span className="text-xs font-semibold text-linda-espresso">{hodnota}</span>
    </div>
  );
}

export function OdstoupeniFormular({
  tokenZOdkazu,
  adresaProVraceni,
  emailFirmy,
}: {
  tokenZOdkazu?: string;
  adresaProVraceni: string | null;
  emailFirmy: string | null;
}) {
  const [krok, setKrok] = useState<Krok>('hledani');

  const [cislo, setCislo] = useState('');
  const [email, setEmail] = useState('');
  const [duvod, setDuvod] = useState('');

  const [objednavka, setObjednavka] = useState<NalezenaObjednavka | null>(null);
  const [vysledek, setVysledek] = useState<OdpovedPrijeti | null>(null);

  const [nacitam, setNacitam] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [chybyPoli, setChybyPoli] = useState<Record<string, string>>({});

  /*
   * Hledání je společné pro obě cesty – token z e-mailu i ručně vyplněnou
   * dvojici. Kdyby to byly dvě funkce, rozejdou se v tom, jak reagují na
   * odmítnutí, a jedna cesta by časem uměla něco, co druhá ne.
   */
  const najit = useCallback(async (dotaz: string) => {
    setNacitam(true);
    setChyba(null);
    setChybyPoli({});

    const odpoved = await nacist<OdpovedHledani>(`/api/odstoupeni?${dotaz}`);

    if (!odpoved.ok) {
      setChyba(odpoved.chyba);
      setChybyPoli(odpoved.pole ?? {});
      setNacitam(false);
      return;
    }

    if (!odpoved.data.nalezeno) {
      setChyba(odpoved.data.zprava);
      setNacitam(false);
      return;
    }

    setObjednavka(odpoved.data.objednavka);
    setKrok('rekapitulace');
    setNacitam(false);
  }, []);

  /*
   * Odkaz z e-mailu nese token a přeskakuje první krok. Rekapitulaci ale
   * nepřeskakuje – potvrzovací krok musí projít i zákaznice, která přišla
   * přímo z e-mailu, jinak by § 1830a splňovala jen půlka příchodů.
   */
  useEffect(() => {
    if (tokenZOdkazu) void najit(`token=${encodeURIComponent(tokenZOdkazu)}`);
  }, [tokenZOdkazu, najit]);

  const odeslatHledani = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nacitam) return;

    await najit(
      `cisloObjednavky=${encodeURIComponent(cislo.trim())}&email=${encodeURIComponent(email.trim())}`
    );
  };

  const potvrdit = async () => {
    if (!objednavka || nacitam) return;

    setNacitam(true);
    setChyba(null);

    const odpoved = await poslatJson<OdpovedPrijeti>('/api/odstoupeni', {
      token: objednavka.token,
      potvrzeno: true,
      duvod: duvod.trim() || null,
    });

    if (odpoved.ok) {
      setVysledek(odpoved.data);
      setKrok('hotovo');
    } else {
      setChyba(odpoved.chyba);
    }

    setNacitam(false);
  };

  /* --- Krok 3: přijato ------------------------------------------------- */
  if (krok === 'hotovo' && vysledek) {
    const adresa = vysledek.adresaProVraceni ?? adresaProVraceni;

    return (
      <div className="animate-fadeInUp space-y-6">
        <section className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu sm:p-8">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-linda-sageLight">
              <CheckCircle className="h-5 w-5 text-linda-sage" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-serif text-2xl text-linda-espresso">Odstoupení jsme přijali</h2>
              <p className="mt-1 text-xs text-linda-espresso/75">
                Potvrzení s datem a časem jsme vám poslali e-mailem. Uschovejte si ho – je to
                doklad, že odstoupení dorazilo včas.
              </p>
            </div>
          </div>

          {/* Datum a čas přijetí je povinná náležitost potvrzení (§ 1830a).
              Ukazuje se i tady, aby ho zákaznice viděla dřív, než jí dojde
              e-mail – a mohla si ho rovnou vytisknout. */}
          <div className="rounded-xl bg-linda-sandLight p-4 shadow-neuInsetSm">
            <Radek stitek="Objednávka" hodnota={vysledek.cisloObjednavky} />
            <Radek stitek="Přijato" hodnota={datumACas(vysledek.prijatoAt)} />
          </div>
        </section>

        <section className="space-y-3 rounded-2xl bg-linda-cream p-6 shadow-neu sm:p-8">
          <h3 className="flex items-center gap-2 font-serif text-lg text-linda-espresso">
            <Package className="h-4 w-4 text-linda-cognac" aria-hidden="true" />
            Co bude dál
          </h3>

          <ol className="space-y-2 text-xs leading-relaxed text-linda-espresso/85">
            <li>
              <strong>Zboží odešlete do 14 dnů</strong> od tohoto odstoupení
              {adresa ? (
                <>
                  {' '}
                  na adresu: <span className="font-semibold">{adresa}</span>.
                </>
              ) : (
                <>. Adresu vám pošleme e-mailem – ozveme se co nejdřív.</>
              )}
            </li>
            <li>
              <strong>Peníze vrátíme do 14 dnů</strong> od doručení odstoupení, a to stejným
              způsobem, jakým jste platila. S vrácením můžeme počkat, dokud zboží nedorazí zpět
              nebo dokud nedoložíte, že jste ho odeslala.
            </li>
            <li>Náklady na vrácení zboží nese kupující, pokud jsme se nedomluvili jinak.</li>
          </ol>

          {emailFirmy && (
            <p className="text-xs text-linda-espresso/75">
              Kdyby se cokoliv zamotalo, napište na{' '}
              <a
                href={`mailto:${emailFirmy}`}
                className="font-semibold text-linda-cognac underline underline-offset-2"
              >
                {emailFirmy}
              </a>
              .
            </p>
          )}
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/produkty"
            className="flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cream px-6 text-xs font-semibold text-linda-espresso shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
          >
            Zpět do obchodu
          </Link>
        </div>
      </div>
    );
  }

  /* --- Krok 2: rekapitulace a potvrzení -------------------------------- */
  if (krok === 'rekapitulace' && objednavka) {
    return (
      <div className="animate-fadeInUp space-y-6">
        <section className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu sm:p-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-linda-cognac">
              Krok 2 ze 2
            </p>
            <h2 className="mt-1 font-serif text-2xl text-linda-espresso">
              Zkontrolujte a potvrďte
            </h2>
            <p className="mt-1 text-xs text-linda-espresso/75">
              Odstoupení se odešle až tlačítkem dole. Dokud ho nestisknete, nic se neděje.
            </p>
          </div>

          <div className="rounded-xl bg-linda-sandLight p-4 shadow-neuInsetSm">
            <Radek stitek="Objednávka" hodnota={objednavka.cisloObjednavky} />
            <Radek stitek="Objednáno" hodnota={datum(objednavka.datumObjednani)} />
            <Radek
              stitek="Doručeno"
              hodnota={
                objednavka.datumDoruceni ? datum(objednavka.datumDoruceni) : 'zatím nedoručeno'
              }
            />
            <Radek
              stitek="Celkem"
              hodnota={`${objednavka.celkovaCena.toLocaleString('cs-CZ')} Kč`}
            />
          </div>

          {objednavka.polozky.length > 0 && (
            <div>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-linda-espresso/70">
                Zboží z objednávky
              </h3>
              <ul className="space-y-1.5 text-xs text-linda-espresso/85">
                {objednavka.polozky.map((p) => (
                  <li key={p.id} className="flex justify-between gap-3">
                    <span>
                      {p.nazev} <span className="text-linda-espresso/70">· {p.velikost}</span>
                    </span>
                    <span className="shrink-0 font-semibold">{p.mnozstvi} ks</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="flex items-start gap-2 rounded-xl bg-linda-sandLight p-4 text-[11px] leading-relaxed text-linda-espresso/85 shadow-neuInsetSm">
            <CalendarClock className="mt-px h-4 w-4 shrink-0 text-linda-cognac" aria-hidden="true" />
            <span>
              {objednavka.lhutaDo ? (
                <>
                  Lhůta pro odstoupení běží do <strong>{datum(objednavka.lhutaDo)}</strong>. Stačí,
                  když odstoupení odešlete poslední den lhůty.
                </>
              ) : (
                <>
                  Zboží k vám zatím nedorazilo, takže čtrnáctidenní lhůta ještě ani nezačala běžet.
                  Odstoupit můžete i teď.
                </>
              )}
            </span>
          </p>
        </section>

        <section className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu sm:p-8">
          {/* Důvod je nepovinný, a je to zákonná vlastnost, ne zdvořilost:
              § 1829 dává právo odstoupit **bez udání důvodu**. Povinné pole
              by bylo podmínkou navíc, kterou zákon nepřipouští. */}
          <OblastFormulare
            id="odstoupeni-duvod"
            label="Chcete něco dodat?"
            napoveda="Nepovinné. Odstoupit můžete bez udání důvodu – ale když nám napíšete, co nesedlo, hodně nám to pomůže."
            value={duvod}
            onChange={setDuvod}
            rows={3}
            maxLength={1000}
            placeholder="Například: sedlo mi to malé…"
            disabled={nacitam}
          />

          {chyba && <Hlaska druh="chyba">{chyba}</Hlaska>}

          <div className="flex flex-col gap-3 sm:flex-row-reverse">
            <button
              type="button"
              onClick={() => void potvrdit()}
              disabled={nacitam}
              className="flex min-h-touch flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {nacitam ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Odesílám…
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Závazně odstoupit od smlouvy
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setKrok('hledani');
                setObjednavka(null);
                setChyba(null);
              }}
              disabled={nacitam}
              className="flex min-h-touch cursor-pointer items-center justify-center gap-2 rounded-full bg-linda-cream px-6 text-xs font-semibold text-linda-espresso shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm disabled:opacity-60 sm:flex-none"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Zpět
            </button>
          </div>
        </section>
      </div>
    );
  }

  /* --- Krok 1: nalezení objednávky ------------------------------------- */
  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu sm:p-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-linda-cognac">
            Krok 1 ze 2
          </p>
          <h2 className="mt-1 font-serif text-2xl text-linda-espresso">Najdeme vaši objednávku</h2>
          <p className="mt-1 text-xs text-linda-espresso/75">
            Přihlašovat se nemusíte. Stačí číslo objednávky a e-mail, který jste u ní použila –
            obojí najdete v potvrzovacím e-mailu.
          </p>
        </div>

        <form onSubmit={(e) => void odeslatHledani(e)} className="space-y-4" noValidate>
          <PoleFormulare
            id="odstoupeni-cislo"
            label="Číslo objednávky"
            required
            value={cislo}
            onChange={setCislo}
            placeholder="2026-00042"
            maxLength={40}
            autoComplete="off"
            disabled={nacitam}
            chyba={chybyPoli.cisloObjednavky}
          />

          <PoleFormulare
            id="odstoupeni-email"
            label="E-mail z objednávky"
            required
            type="email"
            inputMode="email"
            value={email}
            onChange={setEmail}
            placeholder="vas@email.cz"
            maxLength={200}
            autoComplete="email"
            disabled={nacitam}
            chyba={chybyPoli.email}
          />

          {chyba && <Hlaska druh="chyba">{chyba}</Hlaska>}

          <button
            type="submit"
            disabled={nacitam || !cislo.trim() || !email.trim()}
            className="flex min-h-touch w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {nacitam ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Hledám objednávku…
              </>
            ) : (
              'Pokračovat'
            )}
          </button>
        </form>
      </section>

      <section className="space-y-2 rounded-2xl bg-linda-cream p-6 shadow-neuSm">
        <h3 className="flex items-center gap-2 text-xs font-semibold text-linda-espresso">
          <AlertCircle className="h-4 w-4 text-linda-cognac" aria-hidden="true" />
          Nejde vám to?
        </h3>
        <p className="text-xs leading-relaxed text-linda-espresso/75">
          Odstoupit můžete i tak, že nám pošlete{' '}
          <Link
            href="/odstoupeni/formular"
            className="font-semibold text-linda-cognac underline underline-offset-2"
          >
            vyplněný vzorový formulář
          </Link>
          {emailFirmy ? (
            <>
              {' '}
              na{' '}
              <a
                href={`mailto:${emailFirmy}`}
                className="font-semibold text-linda-cognac underline underline-offset-2"
              >
                {emailFirmy}
              </a>
            </>
          ) : null}
          , nebo jakýmkoliv jiným jednoznačným prohlášením. Tenhle formulář je jen nejrychlejší
          cesta, ne jediná.
        </p>
        <p className="flex items-center gap-2 pt-1 text-[11px] text-linda-espresso/70">
          <FileText className="h-3.5 w-3.5 shrink-0 text-linda-cognac" aria-hidden="true" />
          Vzorový formulář podle nařízení vlády č. 363/2013 Sb.
        </p>
      </section>
    </div>
  );
}
