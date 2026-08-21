'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, FolderTree, Loader2, Plus, Trash2 } from 'lucide-react';
import { nacist, poslatJson } from '@/lib/api-klient';
import { Vyber } from '@/components/ui/Vyber';

interface Kategorie {
  id: string;
  nazev: string;
  slug: string;
  poradi: number;
  parentId: string | null;
  parent: { id: string; nazev: string } | null;
  _count: { products: number; children: number };
}

export default function AdminKategoriePage() {
  const [kategorie, setKategorie] = useState<Kategorie[]>([]);
  const [nacitam, setNacitam] = useState(true);
  const [chyba, setChyba] = useState<string | null>(null);
  const [chybyPoli, setChybyPoli] = useState<Record<string, string>>({});

  const [novyNazev, setNovyNazev] = useState('');
  const [novyRodic, setNovyRodic] = useState('');
  const [pridavam, setPridavam] = useState(false);
  const [mazuId, setMazuId] = useState<string | null>(null);

  const nacistKategorie = useCallback(async () => {
    const vysledek = await nacist<{ kategorie: Kategorie[] }>('/api/admin/kategorie');

    if (vysledek.ok) {
      setKategorie(vysledek.data.kategorie);
      setChyba(null);
    } else {
      setChyba(vysledek.chyba);
    }
    setNacitam(false);
  }, []);

  useEffect(() => {
    void nacistKategorie();
  }, [nacistKategorie]);

  const pridat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pridavam) return;

    setPridavam(true);
    setChyba(null);
    setChybyPoli({});

    const vysledek = await poslatJson('/api/admin/kategorie', {
      nazev: novyNazev,
      parentId: novyRodic || null,
    });

    if (vysledek.ok) {
      setNovyNazev('');
      setNovyRodic('');
      await nacistKategorie();
    } else {
      setChyba(vysledek.chyba);
      setChybyPoli(vysledek.pole ?? {});
    }

    setPridavam(false);
  };

  const smazat = async (kat: Kategorie) => {
    if (!window.confirm(`Opravdu smazat kategorii „${kat.nazev}“?`)) return;

    setMazuId(kat.id);
    setChyba(null);

    const vysledek = await poslatJson(`/api/admin/kategorie/${kat.id}`, undefined, 'DELETE');

    if (vysledek.ok) {
      await nacistKategorie();
    } else {
      setChyba(vysledek.chyba);
    }

    setMazuId(null);
  };

  // Kořenové kategorie první, pod nimi jejich potomci – ať je strom čitelný.
  const serazene = [
    ...kategorie.filter((k) => !k.parentId),
    ...kategorie.filter((k) => k.parentId),
  ];

  return (
    <div className="max-w-4xl space-y-8">
      <div className="border-b border-linda-sand pb-6">
        <h1 className="font-serif text-3xl text-linda-espresso sm:text-4xl">Správa kategorií</h1>
        <p className="mt-1 text-xs text-linda-espresso/70">
          Kategorie a vnořené podkategorie pro zařazení zboží
        </p>
      </div>

      {chyba && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-linda-sandLight p-3 text-xs font-medium text-red-800 shadow-neuInsetSm"
        >
          <AlertCircle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
          {chyba}
        </p>
      )}

      <form onSubmit={pridat} className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu">
        <h2 className="font-serif text-xl text-linda-espresso">Nová kategorie</h2>

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <label htmlFor="novy-nazev" className="mb-1 block text-xs font-semibold text-linda-espresso">
              Název *
            </label>
            <input
              id="novy-nazev"
              type="text"
              required
              disabled={pridavam}
              value={novyNazev}
              onChange={(e) => setNovyNazev(e.target.value)}
              placeholder="Např. Kalhoty a sukně"
              aria-invalid={chybyPoli.nazev ? true : undefined}
              className="min-h-touch w-full rounded-xl bg-linda-sandLight px-4 py-2.5 text-xs text-linda-espresso shadow-neuInsetSm disabled:opacity-60"
            />
            {chybyPoli.nazev && (
              <p role="alert" className="mt-1.5 text-[11px] font-medium text-red-800">
                {chybyPoli.nazev}
              </p>
            )}
          </div>

          <div className="sm:w-56">
            <label htmlFor="novy-rodic" className="mb-1 block text-xs font-semibold text-linda-espresso">
              Nadřazená kategorie
            </label>
            <Vyber
              id="novy-rodic"
              disabled={pridavam}
              hodnota={novyRodic}
              onZmena={setNovyRodic}
              trida="w-full"
              moznosti={[
                { hodnota: '', popisek: 'Žádná (hlavní kategorie)' },
                ...kategorie
                  .filter((k) => !k.parentId)
                  .map((k) => ({ hodnota: k.id, popisek: k.nazev })),
              ]}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={pridavam}
          aria-busy={pridavam}
          className="flex min-h-touch cursor-pointer items-center gap-1.5 rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pridavam ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Přidávám…
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Přidat kategorii
            </>
          )}
        </button>
      </form>

      {nacitam ? (
        <p className="flex items-center justify-center gap-2 rounded-2xl bg-linda-cream p-10 text-xs text-linda-espresso/75 shadow-neu">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Načítám kategorie…
        </p>
      ) : serazene.length === 0 ? (
        <div className="space-y-2 rounded-2xl bg-linda-cream p-10 text-center shadow-neu">
          <FolderTree className="mx-auto h-8 w-8 text-linda-cognac opacity-60" aria-hidden="true" />
          <p className="text-xs text-linda-espresso/75">
            Zatím tu není žádná kategorie. Založte první – bez ní nejde přidat produkt.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {serazene.map((kat) => (
            <li
              key={kat.id}
              className={`flex items-center gap-4 rounded-2xl bg-linda-cream p-4 shadow-neuSm ${kat.parentId ? 'ml-6' : ''}`}
            >
              <FolderTree
                className={`h-4 w-4 shrink-0 ${kat.parentId ? 'text-linda-espresso/40' : 'text-linda-cognac'}`}
                aria-hidden="true"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-linda-espresso">
                  {kat.parent && <span className="text-linda-espresso/60">{kat.parent.nazev} → </span>}
                  {kat.nazev}
                </p>
                <p className="truncate text-[11px] text-linda-espresso/70">
                  /{kat.slug} · {kat._count.products}{' '}
                  {kat._count.products === 1 ? 'produkt' : kat._count.products < 5 ? 'produkty' : 'produktů'}
                  {kat._count.children > 0 && ` · ${kat._count.children} podkategorií`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => void smazat(kat)}
                disabled={mazuId === kat.id}
                aria-label={`Smazat kategorii ${kat.nazev}`}
                className="flex min-h-touch min-w-touch shrink-0 cursor-pointer items-center justify-center rounded-full bg-linda-cream text-linda-espresso/75 shadow-neuSm transition-all duration-200 hover:text-red-800 active:shadow-neuInsetSm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {mazuId === kat.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
