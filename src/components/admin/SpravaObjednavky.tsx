'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle, Loader2, Save } from 'lucide-react';
import { poslatJson } from '@/lib/api-klient';
import { STAV_OBJEDNAVKY, STAV_PLATBY } from '@/lib/objednavka-popisky';
import { Vyber } from '@/components/ui/Vyber';

interface Props {
  orderId: string;
  stav: string;
  stavPlatby: string;
  cisloZasilky: string | null;
  polozky: Array<{ id: string; popis: string }>;
}

const STAVY = ['NOVA', 'ZPRACOVAVA_SE', 'EXPEDOVANA', 'DORUCENA', 'ZRUSENA', 'VRACENA'];
const STAVY_PLATBY = ['CEKA_NA_PLATBU', 'ZAPLACENO', 'VRACENO'];

const POLE =
  'w-full bg-linda-sandLight shadow-neuInsetSm min-h-touch rounded-xl px-4 text-xs text-linda-espresso disabled:opacity-60';

/**
 * Změna stavu objednávky a evidence reklamací (sekce 6.4 a 6.10).
 *
 * Zrušení objednávky vrací zboží na sklad, proto se na něj ptáme zvlášť –
 * není to akce, kterou chce majitelka spustit omylem výběrem v seznamu.
 */
export function SpravaObjednavky({ orderId, stav, stavPlatby, cisloZasilky, polozky }: Props) {
  const router = useRouter();

  const [novyStav, setNovyStav] = useState(stav);
  const [novyStavPlatby, setNovyStavPlatby] = useState(stavPlatby);
  const [zasilka, setZasilka] = useState(cisloZasilky ?? '');
  const [uklada, setUklada] = useState(false);
  const [ulozeno, setUlozeno] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);

  // Reklamace / vrácení
  const [typReklamace, setTypReklamace] = useState<'REKLAMACE' | 'VRACENI'>('REKLAMACE');
  const [polozkaId, setPolozkaId] = useState('');
  const [duvod, setDuvod] = useState('');
  const [zakladaReklamaci, setZakladaReklamaci] = useState(false);

  const ulozit = async () => {
    if (uklada) return;

    if (novyStav === 'ZRUSENA' && stav !== 'ZRUSENA') {
      const potvrzeno = window.confirm(
        'Zrušením se zboží vrátí na sklad a slevový kód i poukaz se vrátí do původního stavu. Pokračovat?'
      );
      if (!potvrzeno) return;
    }

    setUklada(true);
    setChyba(null);
    setUlozeno(false);

    const vysledek = await poslatJson(
      `/api/admin/objednavky/${orderId}`,
      { stav: novyStav, stavPlatby: novyStavPlatby, cisloZasilky: zasilka || null },
      'PATCH'
    );

    if (vysledek.ok) {
      setUlozeno(true);
      router.refresh();
      setTimeout(() => setUlozeno(false), 4000);
    } else {
      setChyba(vysledek.chyba);
    }

    setUklada(false);
  };

  const zalozitReklamaci = async (e: React.FormEvent) => {
    e.preventDefault();
    if (zakladaReklamaci) return;

    setZakladaReklamaci(true);
    setChyba(null);

    const vysledek = await poslatJson('/api/admin/reklamace', {
      orderId,
      orderItemId: polozkaId || null,
      typ: typReklamace,
      duvod: duvod || null,
    });

    if (vysledek.ok) {
      setDuvod('');
      setPolozkaId('');
      router.refresh();
    } else {
      setChyba(vysledek.chyba);
    }

    setZakladaReklamaci(false);
  };

  return (
    <div className="space-y-6">
      {chyba && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-linda-sandLight p-3 text-xs font-medium text-red-800 shadow-neuInsetSm"
        >
          <AlertCircle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
          {chyba}
        </p>
      )}

      <section className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu">
        <h2 className="font-serif text-xl text-linda-espresso">Stav objednávky</h2>

        {ulozeno && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-xl bg-linda-sageLight p-3 text-xs font-medium text-linda-sage"
          >
            <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            Uloženo.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="stav" className="mb-1 block text-xs font-semibold text-linda-espresso">
              Stav zpracování
            </label>
            <Vyber
              id="stav"
              hodnota={novyStav}
              disabled={uklada}
              onZmena={setNovyStav}
              trida="w-full"
              moznosti={STAVY.map((s) => ({ hodnota: s, popisek: STAV_OBJEDNAVKY[s]?.text ?? s }))}
            />
          </div>

          <div>
            <label htmlFor="stavPlatby" className="mb-1 block text-xs font-semibold text-linda-espresso">
              Stav platby
            </label>
            <Vyber
              id="stavPlatby"
              hodnota={novyStavPlatby}
              disabled={uklada}
              onZmena={setNovyStavPlatby}
              trida="w-full"
              moznosti={STAVY_PLATBY.map((s) => ({ hodnota: s, popisek: STAV_PLATBY[s] ?? s }))}
            />
          </div>
        </div>

        <div>
          <label htmlFor="zasilka" className="mb-1 block text-xs font-semibold text-linda-espresso">
            Sledovací číslo zásilky
          </label>
          <input
            id="zasilka"
            type="text"
            value={zasilka}
            disabled={uklada}
            onChange={(e) => setZasilka(e.target.value)}
            placeholder="Zadejte při expedici – zákaznice ho uvidí u sebe v účtu"
            className={POLE}
          />
        </div>

        <button
          type="button"
          onClick={() => void ulozit()}
          disabled={uklada}
          aria-busy={uklada}
          className="flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm disabled:cursor-not-allowed disabled:opacity-70"
        >
          {uklada ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Ukládám…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" aria-hidden="true" />
              Uložit změny
            </>
          )}
        </button>
      </section>

      <section className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu">
        <h2 className="font-serif text-xl text-linda-espresso">Zaevidovat reklamaci nebo vrácení</h2>

        <form onSubmit={zalozitReklamaci} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="typReklamace" className="mb-1 block text-xs font-semibold text-linda-espresso">
                Typ
              </label>
              <Vyber
                id="typReklamace"
                hodnota={typReklamace}
                disabled={zakladaReklamaci}
                onZmena={(hodnota) => setTypReklamace(hodnota as 'REKLAMACE' | 'VRACENI')}
                trida="w-full"
                moznosti={[
                  { hodnota: 'REKLAMACE', popisek: 'Reklamace', poznamka: 'Vada zboží' },
                  {
                    hodnota: 'VRACENI',
                    popisek: 'Vrácení',
                    poznamka: 'Odstoupení od smlouvy do 14 dnů',
                  },
                ]}
              />
            </div>

            <div>
              <label htmlFor="polozka" className="mb-1 block text-xs font-semibold text-linda-espresso">
                Které položky se týká
              </label>
              <Vyber
                id="polozka"
                hodnota={polozkaId}
                disabled={zakladaReklamaci}
                onZmena={setPolozkaId}
                trida="w-full"
                moznosti={[
                  { hodnota: '', popisek: 'Celá objednávka' },
                  ...polozky.map((p) => ({ hodnota: p.id, popisek: p.popis })),
                ]}
              />
            </div>
          </div>

          <div>
            <label htmlFor="duvod" className="mb-1 block text-xs font-semibold text-linda-espresso">
              Důvod
            </label>
            <textarea
              id="duvod"
              rows={2}
              value={duvod}
              disabled={zakladaReklamaci}
              onChange={(e) => setDuvod(e.target.value)}
              placeholder="Např. nesedí velikost, vada švu…"
              className={POLE}
            />
          </div>

          <p className="rounded-xl bg-linda-sandLight p-3 text-[11px] text-linda-espresso/75 shadow-neuInsetSm">
            Až vrácení označíte jako uznané, kusy se automaticky vrátí na sklad. U reklamace se
            sklad nemění – vadný kus se zpátky do prodeje nevrací.
          </p>

          <button
            type="submit"
            disabled={zakladaReklamaci}
            aria-busy={zakladaReklamaci}
            className="flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-linda-cream px-6 text-xs font-semibold text-linda-espresso shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm disabled:opacity-70"
          >
            {zakladaReklamaci ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Zakládám…
              </>
            ) : (
              'Zaevidovat'
            )}
          </button>
        </form>
      </section>
    </div>
  );
}
