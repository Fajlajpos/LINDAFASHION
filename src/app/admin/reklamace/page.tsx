'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, AlertTriangle, CalendarClock, Loader2 } from 'lucide-react';
import { nacist, poslatJson } from '@/lib/api-klient';
import {
  NAZEV_ZPUSOBU_VYRIZENI,
  STAV_REKLAMACE,
  type ZpusobVyrizeni,
} from '@/lib/objednavka-popisky';
import { DNU_NA_REKLAMACI, stavLhuty, zbyvaDnu } from '@/lib/lhuty';
import { Vyber } from '@/components/ui/Vyber';

interface Reklamace {
  id: string;
  typ: 'REKLAMACE' | 'VRACENI';
  stav: string;
  duvod: string | null;
  pozadovanyZpusob: string | null;
  poznamkaAdmina: string | null;
  datumPrijeti: string;
  datumVyrizeni: string | null;
  lhutaDo: string | null;
  cisloObjednavky: string;
  orderId: string;
  zakaznik: string;
  polozka: string | null;
}

const STAVY = ['PRIJATA', 'RESI_SE', 'VYRIZENA_UZNANA', 'VYRIZENA_ZAMITNUTA'];

/** Vyřízené reklamaci už lhůta neběží – hlídá se jen to, co je otevřené. */
const OTEVRENE = ['PRIJATA', 'RESI_SE'];

/**
 * Štítek se zbývající lhůtou (§ 19 odst. 3 zák. č. 634/1992 Sb.).
 *
 * Marné uplynutí třiceti dnů zakládá zákaznici právo odstoupit od smlouvy,
 * takže tohle není interní připomínka, ale hlídání právního následku. Barvu
 * i práh počítá `stavLhuty()` – kdyby si je stránka určovala sama, „zbývá pět
 * dnů" by ve výpisu a v detailu znamenalo jinou barvu.
 *
 * Zapuštěná plocha (`sandLight` + inset) je záměr: je to údaj ke čtení,
 * ne tlačítko. Význam nenese jen barva, ale i text a ikona – barevně
 * odlišený, ale nepřečtený štítek je k ničemu.
 */
function StitekLhuty({ lhutaDo, stav }: { lhutaDo: string | null; stav: string }) {
  if (!lhutaDo || !OTEVRENE.includes(stav)) return null;

  const konec = new Date(lhutaDo);
  const nalehavost = stavLhuty(konec);
  if (nalehavost === null) return null;

  const zbyva = zbyvaDnu(konec);

  const podle = {
    po_terminu: {
      tridy: 'bg-red-50 text-red-800 shadow-neuInsetSm',
      text: `Po termínu o ${Math.abs(zbyva)} d.`,
    },
    blizi_se: {
      tridy: 'bg-linda-sandLight text-linda-cognac shadow-neuInsetSm',
      text: zbyva === 0 ? 'Termín je dnes' : `Zbývá ${zbyva} d.`,
    },
    v_poradku: {
      tridy: 'bg-linda-sandLight text-linda-espresso/75 shadow-neuInsetSm',
      text: `Zbývá ${zbyva} d.`,
    },
  }[nalehavost];

  /* Datum konce lhůty bylo jen v `title`, tedy dostupné pouze najetím myší.
     Na telefonu se `title` nezobrazí vůbec – a tohle je zákonná lhůta podle
     § 19 odst. 3 zák. č. 634/1992 Sb., ne doplňková informace. Píšeme ho
     proto natvrdo vedle počtu dnů; `title` zůstává jako celá věta. */
  const datumKonce = konec.toLocaleDateString('cs-CZ', { timeZone: 'Europe/Prague' });

  return (
    <span
      title={`Zákonná lhůta ${DNU_NA_REKLAMACI} dnů končí ${datumKonce}`}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${podle.tridy}`}
    >
      <CalendarClock className="h-3 w-3" aria-hidden="true" />
      {podle.text}
      <span className="font-normal opacity-80">({datumKonce})</span>
    </span>
  );
}

/**
 * Přehled reklamací a vrácení (sekce 6.10).
 *
 * Uznané vrácení vrací kusy na sklad – server to udělá sám, tady jen
 * upozorníme, že se to stalo.
 */
export default function AdminReklamacePage() {
  const [reklamace, setReklamace] = useState<Reklamace[]>([]);
  /** Kolik jich je celkem – server posílá nejvýš 200 nevyřízených napřed. */
  const [celkem, setCelkem] = useState(0);
  const [nacitam, setNacitam] = useState(true);
  const [chyba, setChyba] = useState<string | null>(null);
  const [meniId, setMeniId] = useState<string | null>(null);
  const [hlaska, setHlaska] = useState<string | null>(null);
  /** Rozepsané vyjádření ke každé reklamaci – odejde zákaznici s vyřízením. */
  const [poznamky, setPoznamky] = useState<Record<string, string>>({});
  const [chybyPoznamek, setChybyPoznamek] = useState<Record<string, string>>({});

  const nacistData = useCallback(async () => {
    const vysledek = await nacist<{ reklamace: Reklamace[]; celkem: number }>(
      '/api/admin/reklamace'
    );

    if (vysledek.ok) {
      setReklamace(vysledek.data.reklamace);
      setCelkem(vysledek.data.celkem);
      setPoznamky(Object.fromEntries(vysledek.data.reklamace.map((r) => [r.id, r.poznamkaAdmina ?? ''])));
    } else {
      setChyba(vysledek.chyba);
    }

    setNacitam(false);
  }, []);

  useEffect(() => {
    void nacistData();
  }, [nacistData]);

  const zmenitStav = async (r: Reklamace, novyStav: string) => {
    const poznamka = (poznamky[r.id] ?? '').trim();

    // Stejné pravidlo jako na serveru – hláška hned u pole, ne až po odeslání.
    if (novyStav === 'VYRIZENA_ZAMITNUTA' && !poznamka) {
      setChybyPoznamek((c) => ({
        ...c,
        [r.id]: 'Zamítnutí je potřeba odůvodnit – zákaznice odůvodnění dostane e-mailem.',
      }));
      document.getElementById(`poznamka-${r.id}`)?.focus();
      return;
    }
    setChybyPoznamek((c) => ({ ...c, [r.id]: '' }));

    if (novyStav === 'VYRIZENA_UZNANA' && r.typ === 'VRACENI') {
      const potvrzeno = window.confirm(
        'Uznáním vrácení se kusy automaticky vrátí na sklad. Pokračovat?'
      );
      if (!potvrzeno) return;
    }

    setMeniId(r.id);
    setChyba(null);
    setHlaska(null);

    const vysledek = await poslatJson<{ vracenoNaSklad: boolean }>(
      `/api/admin/reklamace/${r.id}`,
      { stav: novyStav, poznamkaAdmina: poznamka || null },
      'PATCH'
    );

    if (vysledek.ok) {
      if (vysledek.data.vracenoNaSklad) setHlaska('Kusy byly vráceny na sklad.');
      await nacistData();
    } else if (vysledek.pole?.poznamkaAdmina) {
      const zprava = vysledek.pole.poznamkaAdmina;
      setChybyPoznamek((c) => ({ ...c, [r.id]: zprava }));
    } else {
      setChyba(vysledek.chyba);
    }

    setMeniId(null);
  };

  /*
   * Kolik otevřených reklamací je po termínu nebo se k němu blíží. Počítá se
   * z načteného seznamu, ne dotazem navíc: nevyřízené jsou v odpovědi vždy
   * nahoře, takže se do limitu 200 vejdou celé, i když se seznam ořízne.
   */
  const hlidane = reklamace.filter(
    (r) => r.lhutaDo && OTEVRENE.includes(r.stav)
  );
  const poTerminu = hlidane.filter((r) => stavLhuty(new Date(r.lhutaDo!)) === 'po_terminu').length;
  const bliziSe = hlidane.filter((r) => stavLhuty(new Date(r.lhutaDo!)) === 'blizi_se').length;

  return (
    <div className="max-w-4xl space-y-8">
      <div className="border-b border-linda-sand pb-6">
        <h1 className="font-serif text-3xl text-linda-espresso sm:text-4xl">Reklamace a vrácení</h1>
        <p className="mt-1 text-xs text-linda-espresso/70">
          Nové záznamy se zakládají v detailu konkrétní objednávky
        </p>
      </div>

      {/* Výstraha ke lhůtě stojí nad seznamem, ne jen u jednotlivých řádků:
          marné uplynutí 30 dnů (§ 19 odst. 3 zák. č. 634/1992 Sb.) dává
          zákaznici právo odstoupit od smlouvy, a to se nemá zjišťovat
          rolováním. */}
      {(poTerminu > 0 || bliziSe > 0) && (
        <p
          role="status"
          className={`flex items-start gap-2 rounded-xl p-3 text-xs font-medium shadow-neuInsetSm ${
            poTerminu > 0 ? 'bg-red-50 text-red-800' : 'bg-linda-sandLight text-linda-cognac'
          }`}
        >
          <CalendarClock className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {poTerminu > 0 && (
              <>
                <strong>
                  {poTerminu === 1
                    ? '1 reklamace je po zákonné lhůtě'
                    : `${poTerminu} reklamací je po zákonné lhůtě`}
                </strong>
                . Zákaznice má právo odstoupit od smlouvy.{' '}
              </>
            )}
            {bliziSe > 0 && (
              <>
                {bliziSe === 1 ? 'U 1 reklamace' : `U ${bliziSe} reklamací`} končí{' '}
                {DNU_NA_REKLAMACI}denní lhůta do pěti dnů.
              </>
            )}
          </span>
        </p>
      )}

      {chyba && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-linda-sandLight p-3 text-xs font-medium text-red-800 shadow-neuInsetSm"
        >
          <AlertCircle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
          {chyba}
        </p>
      )}

      {hlaska && (
        <p
          role="status"
          className="rounded-xl bg-linda-sageLight p-3 text-xs font-medium text-linda-sage"
        >
          {hlaska}
        </p>
      )}

      {nacitam ? (
        <p className="flex items-center justify-center gap-2 rounded-2xl bg-linda-cream p-10 text-xs text-linda-espresso/75 shadow-neu">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Načítám…
        </p>
      ) : reklamace.length === 0 ? (
        <div className="space-y-2 rounded-2xl bg-linda-cream p-10 text-center shadow-neu">
          <AlertTriangle className="mx-auto h-8 w-8 text-linda-cognac opacity-60" aria-hidden="true" />
          <p className="text-xs text-linda-espresso/75">
            Zatím žádná reklamace ani vrácení. To je dobrá zpráva.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {celkem > reklamace.length && (
            <li className="rounded-xl bg-linda-sandLight p-3 text-[11px] text-linda-espresso/75 shadow-neuInsetSm">
              Zobrazeno {reklamace.length} z {celkem}. Nevyřízené jsou vždy nahoře, ořízl se tedy
              jen nejstarší vyřízený konec seznamu.
            </li>
          )}

          {reklamace.map((r) => {
            const popis = STAV_REKLAMACE[r.stav] ?? { text: r.stav, tridy: 'bg-linda-sandLight' };

            return (
              <li key={r.id} className="space-y-3 rounded-2xl bg-linda-cream p-4 shadow-neuSm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-linda-espresso">
                      {r.typ === 'VRACENI' ? 'Vrácení' : 'Reklamace'} ·{' '}
                      <Link
                        href={`/admin/objednavky/${r.orderId}`}
                        className="inline-block py-2 text-linda-cognac underline"
                      >
                        {r.cisloObjednavky}
                      </Link>
                    </p>
                    <p className="text-[11px] text-linda-espresso/70">
                      {r.zakaznik}
                      {r.polozka && ` · ${r.polozka}`}
                      {!r.polozka && ' · celá objednávka'}
                    </p>
                    {r.duvod && <p className="mt-1 text-xs text-linda-espresso/85">{r.duvod}</p>}
                    {r.pozadovanyZpusob && (
                      <p className="mt-1 text-xs text-linda-espresso/85">
                        <span className="font-semibold">Požaduje:</span>{' '}
                        {NAZEV_ZPUSOBU_VYRIZENI[r.pozadovanyZpusob as ZpusobVyrizeni] ?? r.pozadovanyZpusob}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <StitekLhuty lhutaDo={r.lhutaDo} stav={r.stav} />
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${popis.tridy}`}>
                      {popis.text}
                    </span>
                  </div>
                </div>

                {/* Vyjádření pro zákaznici. Po vyřízení už jen ke čtení – odešlo
                    jí e-mailem a vyřízená reklamace se znovu nevyřizuje. */}
                {OTEVRENE.includes(r.stav) ? (
                  <div>
                    <label
                      htmlFor={`poznamka-${r.id}`}
                      className="mb-1 block text-[11px] font-semibold text-linda-espresso"
                    >
                      Vyjádření pro zákaznici (u zamítnutí povinné)
                    </label>
                    <textarea
                      id={`poznamka-${r.id}`}
                      rows={2}
                      maxLength={2000}
                      disabled={meniId === r.id}
                      value={poznamky[r.id] ?? ''}
                      onChange={(e) => {
                        const hodnota = e.target.value;
                        setPoznamky((p) => ({ ...p, [r.id]: hodnota }));
                        if (chybyPoznamek[r.id]) setChybyPoznamek((c) => ({ ...c, [r.id]: '' }));
                      }}
                      aria-invalid={chybyPoznamek[r.id] ? true : undefined}
                      aria-describedby={`poznamka-${r.id}-napoveda`}
                      placeholder="Např. Šaty vyměníme za nový kus. / Vada vznikla praním v rozporu s visačkou."
                      className="w-full rounded-xl bg-linda-sandLight px-4 py-3 text-xs text-linda-espresso shadow-neuInsetSm placeholder:text-linda-espresso/60 disabled:opacity-60"
                    />
                    <p
                      id={`poznamka-${r.id}-napoveda`}
                      role={chybyPoznamek[r.id] ? 'alert' : undefined}
                      className={`mt-1 text-[11px] ${
                        chybyPoznamek[r.id] ? 'font-medium text-red-800' : 'text-linda-espresso/70'
                      }`}
                    >
                      {chybyPoznamek[r.id] || 'Pošle se zákaznici v e-mailu o vyřízení.'}
                    </p>
                  </div>
                ) : (
                  r.poznamkaAdmina && (
                    <p className="text-xs text-linda-espresso/85">
                      <span className="font-semibold">
                        {r.stav === 'VYRIZENA_ZAMITNUTA' ? 'Odůvodnění:' : 'Vyjádření:'}
                      </span>{' '}
                      {r.poznamkaAdmina}
                    </p>
                  )
                )}

                <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                  <label htmlFor={`stav-${r.id}`} className="text-[11px] font-semibold text-linda-espresso">
                    Změnit stav:
                  </label>
                  <Vyber
                    id={`stav-${r.id}`}
                    hodnota={r.stav}
                    disabled={meniId === r.id}
                    onZmena={(hodnota) => void zmenitStav(r, hodnota)}
                    trida="w-full sm:w-56"
                    moznosti={STAVY.map((s) => ({
                      hodnota: s,
                      popisek: STAV_REKLAMACE[s]?.text ?? s,
                    }))}
                  />
                  {meniId === r.id && (
                    <Loader2 className="h-4 w-4 animate-spin text-linda-cognac" aria-hidden="true" />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
