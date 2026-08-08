'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Loader2,
  LogOut,
  MapPin,
  Package,
  RotateCcw,
  ShieldAlert,
  Truck,
  UserRound,
} from 'lucide-react';
import { nacist, poslatJson } from '@/lib/api-klient';
import { NAZEV_DOPRAVY, STAV_OBJEDNAVKY, STAV_PLATBY, formatDatum } from '@/lib/objednavka-popisky';
import { Hlaska } from '@/components/ui/PoleFormulare';
import { UdajeKarta } from '@/components/shop/ucet/UdajeKarta';
import { AdresyKarta } from '@/components/shop/ucet/AdresyKarta';
import { ReklamaceKarta } from '@/components/shop/ucet/ReklamaceKarta';

interface Objednavka {
  id: string;
  cisloObjednavky: string;
  /** Klíč k dokladu v PDF – faktura leží mimo `public/`, servíruje ji API. */
  verejnyToken: string;
  stav: string;
  stavPlatby: string;
  celkovaCena: number;
  zpusobDopravy: string;
  cisloZasilky: string | null;
  createdAt: string;
  lzeStornovat: boolean;
  lzeReklamovat: boolean;
  polozky: Array<{
    id: string;
    nazev: string;
    slug: string;
    velikost: string;
    mnozstvi: number;
    cena: number;
  }>;
}

export interface UzivatelUctu {
  email: string;
  jmeno: string | null;
  telefon: string | null;
  newsletterSouhlas: boolean;
}

const ZALOZKY = [
  { klic: 'objednavky', popis: 'Objednávky', Ikona: Package },
  { klic: 'reklamace', popis: 'Vrácení', Ikona: RotateCcw },
  { klic: 'udaje', popis: 'Údaje', Ikona: UserRound },
  { klic: 'adresy', popis: 'Adresy', Ikona: MapPin },
] as const;

type Zalozka = (typeof ZALOZKY)[number]['klic'];

export function MujUcet({ uzivatel }: { uzivatel: UzivatelUctu }) {
  const router = useRouter();

  const [zalozka, setZalozka] = useState<Zalozka>('objednavky');
  const [objednavky, setObjednavky] = useState<Objednavka[]>([]);
  const [nacitam, setNacitam] = useState(true);
  const [chyba, setChyba] = useState<string | null>(null);
  const [hlaska, setHlaska] = useState<string | null>(null);
  const [stornujeId, setStornujeId] = useState<string | null>(null);

  const nacistObjednavky = useCallback(async () => {
    const vysledek = await nacist<{ objednavky: Objednavka[] }>('/api/objednavky');

    if (vysledek.ok) setObjednavky(vysledek.data.objednavky);
    else setChyba(vysledek.chyba);

    setNacitam(false);
  }, []);

  useEffect(() => {
    void nacistObjednavky();
  }, [nacistObjednavky]);

  const stornovat = async (o: Objednavka) => {
    if (!window.confirm(`Opravdu zrušit objednávku ${o.cisloObjednavky}?`)) return;

    setStornujeId(o.id);
    setChyba(null);
    setHlaska(null);

    const vysledek = await poslatJson<{ zprava: string }>(`/api/objednavky/${o.id}/storno`, undefined);

    if (vysledek.ok) {
      setHlaska(vysledek.data.zprava);
      await nacistObjednavky();
    } else {
      setChyba(vysledek.chyba);
    }

    setStornujeId(null);
  };

  const odhlasit = async () => {
    await poslatJson('/api/auth/odhlaseni', undefined);
    router.push('/');
    router.refresh();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-linda-sand pb-6">
        <div>
          <h1 className="font-serif text-4xl text-linda-espresso">Můj účet</h1>
          <p className="mt-1 text-xs text-linda-espresso/70">
            {uzivatel.jmeno ? `${uzivatel.jmeno} · ` : ''}
            {uzivatel.email}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void odhlasit()}
          className="flex min-h-touch cursor-pointer items-center gap-1.5 rounded-full bg-linda-cream px-5 text-xs font-semibold text-linda-espresso shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          Odhlásit se
        </button>
      </div>

      {/*
        Přepínač sekcí. Vybraná záložka je zapuštěná, ostatní vyvýšené –
        tvar sám říká, která je stisknutá, takže barva nemusí nést význam
        sama. Lišta je vyvýšená karta na zemi, aby prohlubeň měla kam sednout.
      */}
      <div
        role="tablist"
        aria-label="Sekce účtu"
        className="flex flex-wrap gap-2 rounded-2xl bg-linda-cream p-2 shadow-neuSm"
      >
        {ZALOZKY.map(({ klic, popis, Ikona }) => {
          const aktivni = zalozka === klic;

          return (
            <button
              key={klic}
              type="button"
              role="tab"
              id={`zalozka-${klic}`}
              aria-selected={aktivni}
              aria-controls={`panel-${klic}`}
              onClick={() => setZalozka(klic)}
              className={`flex min-h-touch flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold transition-all duration-200 ${
                aktivni
                  ? 'bg-linda-sandLight text-linda-espresso shadow-neuInsetSm'
                  : 'text-linda-espresso/75 hover:bg-linda-sandLight/50 hover:text-linda-cognac'
              }`}
            >
              <Ikona
                className={`h-3.5 w-3.5 ${aktivni ? 'text-linda-cognac' : 'text-linda-espresso/60'}`}
                aria-hidden="true"
              />
              {popis}
            </button>
          );
        })}
      </div>

      {zalozka === 'objednavky' && (
        <div
          role="tabpanel"
          id="panel-objednavky"
          aria-labelledby="zalozka-objednavky"
          className="animate-fadeIn space-y-4"
        >
          {chyba && <Hlaska druh="chyba">{chyba}</Hlaska>}
          {hlaska && <Hlaska druh="uspech">{hlaska}</Hlaska>}

          <h2 className="font-serif text-2xl text-linda-espresso">Moje objednávky</h2>

          {nacitam ? (
            <p className="flex items-center justify-center gap-2 rounded-2xl bg-linda-cream p-10 text-xs text-linda-espresso/75 shadow-neu">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Načítám…
            </p>
          ) : objednavky.length === 0 ? (
            <div className="space-y-3 rounded-2xl bg-linda-cream p-10 text-center shadow-neu">
              <Package className="mx-auto h-8 w-8 text-linda-cognac opacity-60" aria-hidden="true" />
              <p className="text-xs text-linda-espresso/75">Zatím jste u nás nic neobjednali.</p>
              <Link
                href="/produkty"
                className="inline-flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
              >
                Prohlédnout kolekci
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {objednavky.map((o) => {
                const popis = STAV_OBJEDNAVKY[o.stav] ?? { text: o.stav, tridy: 'bg-linda-sandLight' };

                return (
                  <li key={o.id} className="space-y-3 rounded-2xl bg-linda-cream p-6 shadow-neu">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-linda-espresso">{o.cisloObjednavky}</p>
                        <p className="text-[11px] text-linda-espresso/70">
                          {formatDatum(new Date(o.createdAt))} ·{' '}
                          {STAV_PLATBY[o.stavPlatby] ?? o.stavPlatby}
                        </p>
                      </div>

                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${popis.tridy}`}>
                        {popis.text}
                      </span>
                    </div>

                    <ul className="space-y-1 text-xs">
                      {o.polozky.map((p) => (
                        <li key={p.id} className="flex justify-between gap-3">
                          <Link
                            href={`/produkt/${p.slug}`}
                            className="text-linda-espresso hover:text-linda-cognac hover:underline"
                          >
                            {p.nazev}
                            <span className="text-linda-espresso/70">
                              {' '}
                              · {p.velikost} · {p.mnozstvi} ks
                            </span>
                          </Link>
                          <span className="shrink-0 text-linda-espresso">
                            {(p.cena * p.mnozstvi).toLocaleString('cs-CZ')} Kč
                          </span>
                        </li>
                      ))}
                    </ul>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-linda-sand/60 pt-3">
                      <p className="text-xs text-linda-espresso/75">
                        {NAZEV_DOPRAVY[o.zpusobDopravy] ?? o.zpusobDopravy}
                        {o.cisloZasilky && (
                          <span className="ml-1 inline-flex items-center gap-1 font-medium text-linda-espresso">
                            <Truck className="h-3 w-3 text-linda-cognac" aria-hidden="true" />
                            {o.cisloZasilky}
                          </span>
                        )}
                      </p>

                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-semibold text-linda-espresso">
                          {o.celkovaCena.toLocaleString('cs-CZ')} Kč
                        </span>

                        <a
                          href={`/api/faktura/${o.verejnyToken}`}
                          className="flex min-h-touch cursor-pointer items-center gap-1.5 rounded-full bg-linda-cream px-4 text-xs font-semibold text-linda-espresso shadow-neuSm transition-all duration-200 hover:text-linda-cognac hover:shadow-neu active:shadow-neuInsetSm"
                        >
                          <FileText className="h-3.5 w-3.5 text-linda-cognac" aria-hidden="true" />
                          Doklad
                        </a>

                        {/* Vrácení a reklamace řeší vlastní záložka – tady je jen zkratka. */}
                        {o.lzeReklamovat && (
                          <button
                            type="button"
                            onClick={() => setZalozka('reklamace')}
                            className="flex min-h-touch cursor-pointer items-center gap-1.5 rounded-full bg-linda-cream px-4 text-xs font-semibold text-linda-espresso shadow-neuSm transition-all duration-200 hover:text-linda-cognac hover:shadow-neu active:shadow-neuInsetSm"
                          >
                            <RotateCcw className="h-3.5 w-3.5 text-linda-cognac" aria-hidden="true" />
                            Vrátit či reklamovat
                          </button>
                        )}

                        {/* Storno jde jen dokud objednávka leží ve stavu Nová (sekce 5). */}
                        {o.lzeStornovat && (
                          <button
                            type="button"
                            onClick={() => void stornovat(o)}
                            disabled={stornujeId === o.id}
                            aria-busy={stornujeId === o.id}
                            className="flex min-h-touch cursor-pointer items-center gap-1.5 rounded-full bg-linda-cream px-4 text-xs font-semibold text-red-800 shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {stornujeId === o.id ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                                Ruším…
                              </>
                            ) : (
                              'Zrušit objednávku'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {zalozka === 'reklamace' && (
        <div
          role="tabpanel"
          id="panel-reklamace"
          aria-labelledby="zalozka-reklamace"
          className="animate-fadeIn"
        >
          <ReklamaceKarta objednavky={objednavky} objednavkyNacitaji={nacitam} />
        </div>
      )}

      {zalozka === 'udaje' && (
        <div
          role="tabpanel"
          id="panel-udaje"
          aria-labelledby="zalozka-udaje"
          className="animate-fadeIn space-y-6"
        >
          <UdajeKarta profil={uzivatel} />
          <SmazaniUctu />
        </div>
      )}

      {zalozka === 'adresy' && (
        <div
          role="tabpanel"
          id="panel-adresy"
          aria-labelledby="zalozka-adresy"
          className="animate-fadeIn"
        >
          <AdresyKarta />
        </div>
      )}
    </div>
  );
}

/** Smazání účtu podle GDPR (sekce 5). */
function SmazaniUctu() {
  const router = useRouter();

  const [maze, setMaze] = useState(false);
  const [potvrzuje, setPotvrzuje] = useState(false);
  const [heslo, setHeslo] = useState('');
  const [chyba, setChyba] = useState<string | null>(null);

  const smazat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (maze) return;

    setMaze(true);
    setChyba(null);

    const vysledek = await poslatJson<{ presmerovat: string }>('/api/ucet/smazat', { heslo });

    if (vysledek.ok) {
      router.push(vysledek.data.presmerovat);
      router.refresh();
      return;
    }

    setChyba(vysledek.pole?.heslo ?? vysledek.chyba);
    setMaze(false);
  };

  return (
    <section className="space-y-3 rounded-2xl bg-linda-cream p-6 shadow-neu sm:p-8">
      <h2 className="flex items-center gap-2 font-serif text-xl text-linda-espresso">
        <ShieldAlert className="h-4 w-4 text-linda-cognac" aria-hidden="true" />
        Smazání účtu
      </h2>

      <p className="text-xs leading-relaxed text-linda-espresso/85">
        Smažeme vaše osobní údaje, uložené adresy, košík, oblíbené položky, hlídané velikosti
        i zprávy z kontaktního formuláře. Dokončené objednávky musíme podle zákona uchovat jako
        účetní doklad – zůstanou ale bez vazby na vaši osobu.
      </p>

      {chyba && <Hlaska druh="chyba">{chyba}</Hlaska>}

      {potvrzuje ? (
        <form onSubmit={smazat} className="space-y-3">
          <div>
            <label htmlFor="heslo-smazani" className="mb-1 block text-xs font-semibold text-linda-espresso">
              Pro potvrzení zadejte své heslo
            </label>
            <input
              id="heslo-smazani"
              type="password"
              required
              autoComplete="current-password"
              value={heslo}
              disabled={maze}
              onChange={(e) => setHeslo(e.target.value)}
              className="min-h-touch w-full max-w-sm rounded-xl bg-linda-sandLight px-4 text-xs text-linda-espresso shadow-neuInsetSm disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={maze}
              aria-busy={maze}
              className="flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-red-800 px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-red-900 active:shadow-neuSm disabled:cursor-not-allowed disabled:opacity-70"
            >
              {maze ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Mažu…
                </>
              ) : (
                'Ano, smazat můj účet'
              )}
            </button>

            <button
              type="button"
              onClick={() => setPotvrzuje(false)}
              disabled={maze}
              className="flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cream px-6 text-xs font-semibold text-linda-espresso shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm disabled:opacity-60"
            >
              Zpět
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setPotvrzuje(true)}
          className="flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cream px-6 text-xs font-semibold text-red-800 shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
        >
          Smazat účet a osobní údaje
        </button>
      )}
    </section>
  );
}
