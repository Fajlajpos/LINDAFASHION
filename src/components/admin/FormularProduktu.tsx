'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, ImageIcon, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { nacist, poslatFormData, poslatJson } from '@/lib/api-klient';

/**
 * Formulář produktu pro obě situace – zakládání i editaci.
 *
 * Původně byl vypsaný zvlášť na stránce "nový produkt"; jakmile přibyla
 * editace, znamenalo by to dvě kopie, které se časem rozejdou. Rozdíl mezi
 * režimy je jen v tom, kam se posílá a jestli se fotky nahrávají rovnou
 * k produktu, nebo se drží v dočasném úložišti do uložení.
 */

export interface Kategorie {
  id: string;
  nazev: string;
  parent: { nazev: string } | null;
}

export interface VariantaFormular {
  klic: string;
  id?: string;
  velikost: string;
  skladem: number;
  obvodHrudniku: string;
  obvodPasu: string;
  obvodBoku: string;
  delka: string;
}

export interface PocatecniProdukt {
  id: string;
  nazev: string;
  popis: string;
  categoryId: string;
  cena: number;
  cenaPoSleve: number | null;
  znacka: string | null;
  material: string | null;
  udrzba: string | null;
  sku: string | null;
  aktivni: boolean;
  doporuceny: boolean;
  jeDarkovyPoukaz: boolean;
  varianty: VariantaFormular[];
}

interface NahranaFotka {
  token: string;
  puvodniNazev: string;
  velikostBajtu: number;
}

interface Props {
  /** Vyplněné = editace, prázdné = nový produkt. */
  produkt?: PocatecniProdukt;
  /** Editace: fotky se nahrávají rovnou k produktu, tenhle blok se nezobrazuje. */
  skrytNahravaniFotek?: boolean;
}

/**
 * Klíč varianty musí být stabilní mezi vykreslením na serveru a hydratací
 * na klientovi – jinak React nahlásí neshodu a `htmlFor`/`id` se rozejdou,
 * takže kliknutí na popisek pole nezaostří input.
 *
 * Proto prostý čítač, ne Date.now()/Math.random(): počáteční stav formuláře
 * vyjde na obou stranách stejně a nové klíče vznikají až po interakci.
 */
let citacVariant = 0;

export function novaVarianta(jePoukaz: boolean): VariantaFormular {
  citacVariant += 1;
  return {
    klic: `nova-${citacVariant}`,
    velikost: jePoukaz ? '1000 Kč' : 'M (38)',
    skladem: 5,
    obvodHrudniku: '',
    obvodPasu: '',
    obvodBoku: '',
    delka: '',
  };
}

/** Počáteční varianta u nového produktu – pevný klíč, ať hydratace sedí. */
function prvniVarianta(): VariantaFormular {
  return {
    klic: 'vychozi',
    velikost: 'S (36)',
    skladem: 5,
    obvodHrudniku: '',
    obvodPasu: '',
    obvodBoku: '',
    delka: '',
  };
}

const POLE =
  'w-full bg-linda-sandLight shadow-neuInsetSm min-h-touch rounded-xl px-4 py-2.5 text-linda-espresso disabled:opacity-60';

export function FormularProduktu({ produkt, skrytNahravaniFotek = false }: Props) {
  const router = useRouter();
  const jeEditace = Boolean(produkt);

  const [kategorie, setKategorie] = useState<Kategorie[]>([]);
  const [nacitamKategorie, setNacitamKategorie] = useState(true);

  const [form, setForm] = useState({
    nazev: produkt?.nazev ?? '',
    popis: produkt?.popis ?? '',
    categoryId: produkt?.categoryId ?? '',
    cena: produkt ? String(produkt.cena) : '',
    cenaPoSleve: produkt?.cenaPoSleve != null ? String(produkt.cenaPoSleve) : '',
    znacka: produkt?.znacka ?? '',
    material: produkt?.material ?? '',
    udrzba: produkt?.udrzba ?? '',
    sku: produkt?.sku ?? '',
    aktivni: produkt?.aktivni ?? true,
    doporuceny: produkt?.doporuceny ?? false,
    jeDarkovyPoukaz: produkt?.jeDarkovyPoukaz ?? false,
  });

  const [varianty, setVarianty] = useState<VariantaFormular[]>(
    produkt?.varianty.length ? produkt.varianty : [prvniVarianta()]
  );

  const [fotky, setFotky] = useState<NahranaFotka[]>([]);
  const [nahravam, setNahravam] = useState(false);
  const [odesilam, setOdesilam] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [chybyPoli, setChybyPoli] = useState<Record<string, string>>({});

  useEffect(() => {
    let zruseno = false;

    void (async () => {
      const vysledek = await nacist<{ kategorie: Kategorie[] }>('/api/admin/kategorie');
      if (zruseno) return;

      if (vysledek.ok) {
        setKategorie(vysledek.data.kategorie);
        setForm((p) => (p.categoryId ? p : { ...p, categoryId: vysledek.data.kategorie[0]?.id ?? '' }));
      } else {
        setChyba(vysledek.chyba);
      }
      setNacitamKategorie(false);
    })();

    return () => {
      zruseno = true;
    };
  }, []);

  const nahratFotky = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const vybrane = e.target.files;
    if (!vybrane || vybrane.length === 0) return;

    setNahravam(true);
    setChyba(null);

    const data = new FormData();
    for (const soubor of Array.from(vybrane)) data.append('fotky', soubor);

    const vysledek = await poslatFormData<{
      nahrane: NahranaFotka[];
      odmitnute: Array<{ nazev: string; duvod: string }>;
    }>('/api/admin/upload', data);

    if (vysledek.ok) {
      setFotky((p) => [...p, ...vysledek.data.nahrane]);
      if (vysledek.data.odmitnute.length > 0) {
        setChyba(vysledek.data.odmitnute.map((o) => `${o.nazev}: ${o.duvod}`).join(' '));
      }
    } else {
      setChyba(vysledek.chyba);
    }

    setNahravam(false);
    e.target.value = '';
  };

  const ulozit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (odesilam) return;

    setOdesilam(true);
    setChyba(null);
    setChybyPoli({});

    const telo = {
      nazev: form.nazev,
      popis: form.popis,
      categoryId: form.categoryId,
      cena: form.cena,
      cenaPoSleve: form.cenaPoSleve === '' ? null : form.cenaPoSleve,
      znacka: form.znacka || null,
      material: form.material || null,
      udrzba: form.udrzba || null,
      sku: form.sku || null,
      aktivni: form.aktivni,
      doporuceny: form.doporuceny,
      jeDarkovyPoukaz: form.jeDarkovyPoukaz,
      varianty: varianty.map((v) => ({
        ...(v.id ? { id: v.id } : {}),
        velikost: v.velikost,
        skladem: v.skladem,
        miry: form.jeDarkovyPoukaz
          ? null
          : {
              obvodHrudniku: v.obvodHrudniku || null,
              obvodPasu: v.obvodPasu || null,
              obvodBoku: v.obvodBoku || null,
              delka: v.delka || null,
            },
      })),
      fotky: fotky.map((f) => ({ token: f.token, puvodniNazev: f.puvodniNazev })),
    };

    const vysledek = jeEditace
      ? await poslatJson<{ id: string }>(`/api/admin/produkty/${produkt!.id}`, telo, 'PUT')
      : await poslatJson<{ id: string }>('/api/admin/produkty', telo);

    if (!vysledek.ok) {
      setChyba(vysledek.chyba);
      setChybyPoli(vysledek.pole ?? {});
      setOdesilam(false);
      return;
    }

    router.push(`/admin/produkty/${vysledek.data.id}`);
    router.refresh();
  };

  const chybaPole = (klic: string) =>
    chybyPoli[klic] ? (
      <p role="alert" className="mt-1.5 text-[11px] font-medium text-red-800">
        {chybyPoli[klic]}
      </p>
    ) : null;

  return (
    <form onSubmit={ulozit} className="space-y-8">
      {chyba && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-linda-sandLight p-3 text-xs font-medium text-red-800 shadow-neuInsetSm"
        >
          <AlertCircle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
          {chyba}
        </p>
      )}

      <div className="flex items-center justify-between gap-4 rounded-2xl bg-linda-cream p-4 shadow-neu">
        <div>
          <h2 className="text-xs font-semibold text-linda-espresso">Jedná se o dárkový poukaz?</h2>
          <p className="text-[11px] text-linda-espresso/70">
            Pokud aktivujete, skryjí se pole pro míry, materiál a péči. Varianty se použijí jako částky.
          </p>
        </div>
        <input
          type="checkbox"
          aria-label="Produkt je dárkový poukaz"
          checked={form.jeDarkovyPoukaz}
          disabled={odesilam}
          onChange={(e) => setForm({ ...form, jeDarkovyPoukaz: e.target.checked })}
          className="h-5 w-5 cursor-pointer accent-linda-cognac"
        />
      </div>

      <div className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu">
        <h2 className="font-serif text-xl text-linda-espresso">Základní údaje</h2>

        <div className="space-y-4 text-xs">
          <div>
            <label htmlFor="nazev" className="mb-1 block font-semibold text-linda-espresso">
              Název produktu *
            </label>
            <input
              id="nazev"
              type="text"
              required
              disabled={odesilam}
              value={form.nazev}
              onChange={(e) => setForm({ ...form, nazev: e.target.value })}
              placeholder="Např. Hedvábné šaty Bellissima"
              aria-invalid={chybyPoli.nazev ? true : undefined}
              className={POLE}
            />
            {chybaPole('nazev')}
          </div>

          <div>
            <label htmlFor="kategorie" className="mb-1 block font-semibold text-linda-espresso">
              Kategorie *
            </label>
            <select
              id="kategorie"
              required
              disabled={odesilam || nacitamKategorie}
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className={`${POLE} cursor-pointer`}
            >
              {nacitamKategorie && <option value="">Načítám kategorie…</option>}
              {!nacitamKategorie && kategorie.length === 0 && <option value="">Nejdřív založte kategorii</option>}
              {kategorie.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.parent ? `${k.parent.nazev} → ${k.nazev}` : k.nazev}
                </option>
              ))}
            </select>
            {chybaPole('categoryId')}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cena" className="mb-1 block font-semibold text-linda-espresso">
                Cena (Kč) *
              </label>
              <input
                id="cena"
                type="number"
                min="1"
                step="1"
                required
                disabled={odesilam}
                value={form.cena}
                onChange={(e) => setForm({ ...form, cena: e.target.value })}
                placeholder="3490"
                className={POLE}
              />
              {chybaPole('cena')}
            </div>

            <div>
              <label htmlFor="cenaPoSleve" className="mb-1 block font-semibold text-linda-espresso">
                Akční cena (volitelně)
              </label>
              <input
                id="cenaPoSleve"
                type="number"
                min="1"
                step="1"
                disabled={odesilam}
                value={form.cenaPoSleve}
                onChange={(e) => setForm({ ...form, cenaPoSleve: e.target.value })}
                placeholder="2990"
                className={POLE}
              />
              {chybaPole('cenaPoSleve')}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="znacka" className="mb-1 block font-semibold text-linda-espresso">
                Značka / designér
              </label>
              <input
                id="znacka"
                type="text"
                disabled={odesilam}
                value={form.znacka}
                onChange={(e) => setForm({ ...form, znacka: e.target.value })}
                placeholder="Např. Milano Elegance"
                className={POLE}
              />
            </div>

            <div>
              <label htmlFor="sku" className="mb-1 block font-semibold text-linda-espresso">
                SKU (skladové číslo)
              </label>
              <input
                id="sku"
                type="text"
                disabled={odesilam}
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="LF-SAT-001"
                className={POLE}
              />
              {chybaPole('sku')}
            </div>
          </div>

          <div>
            <label htmlFor="popis" className="mb-1 block font-semibold text-linda-espresso">
              Popis produktu *
            </label>
            <textarea
              id="popis"
              rows={4}
              required
              disabled={odesilam}
              value={form.popis}
              onChange={(e) => setForm({ ...form, popis: e.target.value })}
              placeholder="Popis střihu, stylu a vlastností…"
              className={POLE}
            />
            {chybaPole('popis')}
          </div>
        </div>
      </div>

      {!form.jeDarkovyPoukaz && (
        <div className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu">
          <h2 className="font-serif text-xl text-linda-espresso">Materiál &amp; pokyny pro péči</h2>

          <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
            <div>
              <label htmlFor="material" className="mb-1 block font-semibold text-linda-espresso">
                Materiál
              </label>
              <input
                id="material"
                type="text"
                disabled={odesilam}
                value={form.material}
                onChange={(e) => setForm({ ...form, material: e.target.value })}
                placeholder="Např. 100% přírodní italské hedvábí"
                className={POLE}
              />
            </div>

            <div>
              <label htmlFor="udrzba" className="mb-1 block font-semibold text-linda-espresso">
                Údržba a péče
              </label>
              <input
                id="udrzba"
                type="text"
                disabled={odesilam}
                value={form.udrzba}
                onChange={(e) => setForm({ ...form, udrzba: e.target.value })}
                placeholder="Např. šetrné ruční praní na 30 °C"
                className={POLE}
              />
            </div>
          </div>
        </div>
      )}

      {!skrytNahravaniFotek && (
        <div className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu">
          <h2 className="font-serif text-xl text-linda-espresso">Fotografie</h2>

          <div className="space-y-2 rounded-2xl border-2 border-dashed border-linda-sand p-6 text-center">
            {nahravam ? (
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-linda-cognac" aria-hidden="true" />
            ) : (
              <Upload className="mx-auto h-8 w-8 text-linda-cognac opacity-60" aria-hidden="true" />
            )}

            <div className="text-xs">
              <label className="cursor-pointer font-semibold text-linda-cognac hover:underline">
                {nahravam ? 'Nahrávám…' : 'Vyberte fotky k nahrání'}
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  disabled={nahravam || odesilam}
                  onChange={nahratFotky}
                  className="hidden"
                />
              </label>
            </div>

            <p className="text-[10px] text-linda-espresso/70">
              JPEG, PNG, WebP nebo AVIF, nejvýš 15 MB na fotku. Zmenšení a převod do WebP proběhne
              na pozadí po uložení produktu – čekat na to nemusíte.
            </p>
          </div>

          {fotky.length > 0 && (
            <ul className="space-y-2 pt-2 text-xs">
              {fotky.map((fotka) => (
                <li
                  key={fotka.token}
                  className="flex items-center justify-between gap-3 rounded-xl bg-linda-cream p-3 shadow-neuSm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <ImageIcon className="h-4 w-4 shrink-0 text-linda-cognac" aria-hidden="true" />
                    <span className="truncate font-medium text-linda-espresso">{fotka.puvodniNazev}</span>
                    <span className="shrink-0 text-linda-espresso/60">
                      {(fotka.velikostBajtu / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </span>

                  <span className="flex shrink-0 items-center gap-2">
                    <span className="flex items-center gap-1 rounded-full bg-linda-sageLight px-2.5 py-1 text-[10px] font-semibold text-linda-sage">
                      <Check className="h-3 w-3" aria-hidden="true" />
                      Nahráno
                    </span>
                    <button
                      type="button"
                      aria-label={`Odebrat fotku ${fotka.puvodniNazev}`}
                      onClick={() => setFotky((p) => p.filter((f) => f.token !== fotka.token))}
                      className="flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-full bg-linda-cream text-linda-espresso/75 shadow-neuSm transition-all duration-200 hover:text-red-800 active:shadow-neuInsetSm"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-serif text-xl text-linda-espresso">
            {form.jeDarkovyPoukaz ? 'Hodnoty dárkového poukazu' : 'Varianty a míry'}
          </h2>
          <button
            type="button"
            disabled={odesilam}
            onClick={() => setVarianty([...varianty, novaVarianta(form.jeDarkovyPoukaz)])}
            className="flex min-h-touch cursor-pointer items-center gap-1 rounded-lg bg-linda-cream px-3 text-xs font-semibold text-linda-cognac shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Přidat variantu
          </button>
        </div>

        {chybaPole('varianty')}

        <div className="space-y-4">
          {varianty.map((v, index) => (
            <div key={v.klic} className="space-y-3 rounded-xl bg-linda-cream p-4 text-xs shadow-neuSm">
              <div className="flex items-center justify-between gap-4">
                <div className="grid flex-1 grid-cols-2 gap-4">
                  <div>
                    <label htmlFor={`velikost-${v.klic}`} className="mb-1 block font-semibold text-linda-espresso">
                      {form.jeDarkovyPoukaz ? 'Částka poukazu' : 'Velikost'}
                    </label>
                    <input
                      id={`velikost-${v.klic}`}
                      type="text"
                      required
                      disabled={odesilam}
                      value={v.velikost}
                      onChange={(e) =>
                        setVarianty(varianty.map((x, i) => (i === index ? { ...x, velikost: e.target.value } : x)))
                      }
                      className="min-h-touch w-full rounded-lg bg-linda-sandLight px-3 py-2 text-linda-espresso shadow-neuInsetSm"
                    />
                  </div>

                  <div>
                    <label htmlFor={`skladem-${v.klic}`} className="mb-1 block font-semibold text-linda-espresso">
                      Počet kusů skladem
                    </label>
                    <input
                      id={`skladem-${v.klic}`}
                      type="number"
                      min="0"
                      step="1"
                      required
                      disabled={odesilam}
                      value={v.skladem}
                      onChange={(e) =>
                        setVarianty(
                          varianty.map((x, i) => (i === index ? { ...x, skladem: Number(e.target.value) } : x))
                        )
                      }
                      className="min-h-touch w-full rounded-lg bg-linda-sandLight px-3 py-2 text-linda-espresso shadow-neuInsetSm"
                    />
                  </div>
                </div>

                {varianty.length > 1 && (
                  <button
                    type="button"
                    disabled={odesilam}
                    aria-label={`Odebrat variantu ${v.velikost}`}
                    onClick={() => setVarianty(varianty.filter((_, i) => i !== index))}
                    className="flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-full bg-linda-cream text-linda-espresso/75 shadow-neuSm transition-all duration-200 hover:text-red-800 active:shadow-neuInsetSm"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>

              {!form.jeDarkovyPoukaz && (
                <div className="grid grid-cols-2 gap-3 border-t border-linda-sand/40 pt-2 sm:grid-cols-4">
                  {(
                    [
                      ['obvodHrudniku', 'Obvod hrudníku', '88–92 cm'],
                      ['obvodPasu', 'Obvod pasu', '68–72 cm'],
                      ['obvodBoku', 'Obvod boků', '94–98 cm'],
                      ['delka', 'Celková délka', '115 cm'],
                    ] as const
                  ).map(([klic, popisek, priklad]) => (
                    <div key={klic}>
                      <label
                        htmlFor={`${klic}-${v.klic}`}
                        className="block text-[11px] font-medium text-linda-espresso/75"
                      >
                        {popisek}
                      </label>
                      <input
                        id={`${klic}-${v.klic}`}
                        type="text"
                        disabled={odesilam}
                        value={v[klic]}
                        onChange={(e) =>
                          setVarianty(varianty.map((x, i) => (i === index ? { ...x, [klic]: e.target.value } : x)))
                        }
                        placeholder={priklad}
                        className="min-h-touch w-full rounded-lg bg-linda-sandLight px-2.5 py-1.5 text-xs shadow-neuInsetSm"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-2xl bg-linda-cream p-6 text-xs shadow-neu">
        <h2 className="font-serif text-xl text-linda-espresso">Zveřejnění</h2>

        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={form.aktivni}
            disabled={odesilam}
            onChange={(e) => setForm({ ...form, aktivni: e.target.checked })}
            className="h-4 w-4 cursor-pointer accent-linda-cognac"
          />
          <span className="text-linda-espresso/85">
            Zveřejnit v e-shopu (odškrtnuté = koncept, zákaznice ho neuvidí)
          </span>
        </label>

        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={form.doporuceny}
            disabled={odesilam}
            onChange={(e) => setForm({ ...form, doporuceny: e.target.checked })}
            className="h-4 w-4 cursor-pointer accent-linda-cognac"
          />
          <span className="text-linda-espresso/85">Doporučený produkt (zvýrazní se na úvodní stránce)</span>
        </label>
      </div>

      <div className="flex justify-end gap-4">
        <Link
          href="/admin/produkty"
          className="flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cream px-6 text-xs font-semibold text-linda-espresso shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
        >
          Zrušit
        </Link>
        <button
          type="submit"
          disabled={odesilam || nahravam}
          aria-busy={odesilam}
          className="flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-linda-cognac px-8 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm disabled:cursor-not-allowed disabled:opacity-70"
        >
          {odesilam ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Ukládám…
            </>
          ) : jeEditace ? (
            'Uložit změny'
          ) : (
            'Uložit produkt'
          )}
        </button>
      </div>
    </form>
  );
}
