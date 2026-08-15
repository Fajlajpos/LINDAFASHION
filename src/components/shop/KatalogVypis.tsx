import React from 'react';
import Link from 'next/link';
import { Filter, SlidersHorizontal, Sparkles } from 'lucide-react';
import { ProductCard } from '@/components/shop/ProductCard';
import { RazeniKatalogu } from '@/components/shop/RazeniKatalogu';
import { Strankovani } from '@/components/ui/Strankovani';
import { nacistKategorie, nacistProdukty, type Razeni } from '@/lib/katalog';

interface Props {
  /** Slug kategorie – z cesty `/produkty/[kategorie]`, nebo z filtru. */
  kategorie?: string | null;
  hledat?: string | null;
  razeni?: Razeni;
  stranka?: number;
  /** Základ odkazů na filtry a stránkování. */
  zakladniCesta?: string;
}

const RAZENI_POVOLENE: Razeni[] = ['nejnovejsi', 'cena-vzestupne', 'cena-sestupne', 'nazev'];

export function jeRazeni(hodnota?: string | null): Razeni {
  return RAZENI_POVOLENE.includes(hodnota as Razeni) ? (hodnota as Razeni) : 'nejnovejsi';
}

function tvarPoctu(pocet: number, jedna: string, dva: string, pet: string): string {
  if (pocet === 1) return jedna;
  if (pocet >= 2 && pocet <= 4) return dva;
  return pet;
}

/**
 * Výpis katalogu s filtrem kategorií, řazením a stránkováním.
 *
 * Sdílí ho `/produkty` i `/produkty/[kategorie]` – jinak by se dvě kopie
 * stejného výpisu časem rozešly.
 */
export async function KatalogVypis({
  kategorie = null,
  hledat = null,
  razeni = 'nejnovejsi',
  stranka = 1,
  zakladniCesta = '/produkty',
}: Props) {
  const [vysledek, kategorie2] = await Promise.all([
    nacistProdukty({ kategorie, hledat, razeni, stranka }),
    nacistKategorie(),
  ]);

  const { produkty, celkem, stranek, volnaShoda } = vysledek;

  // V bočním panelu ukazujeme jen kategorie, ve kterých něco je – prázdná
  // kategorie vede na prázdnou stránku a jen mate.
  const viditelne = kategorie2.filter((k) => k.pocetProduktu > 0);
  const celkemVsech = kategorie2.reduce((s, k) => s + (k.parentSlug ? 0 : k.pocetProduktu), 0);

  const odkazSFiltrem = (slug: string | null) => (slug ? `/produkty/${slug}` : '/produkty');

  const odkazStranky = (cislo: number) => {
    const parametry = new URLSearchParams();
    if (hledat) parametry.set('hledat', hledat);
    if (razeni !== 'nejnovejsi') parametry.set('razeni', razeni);
    if (cislo > 1) parametry.set('stranka', String(cislo));

    const dotaz = parametry.toString();
    return dotaz ? `${zakladniCesta}?${dotaz}` : zakladniCesta;
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
      <aside className="space-y-6">
        <div className="space-y-6 rounded-2xl bg-linda-cream p-6 shadow-neu">
          <div className="flex items-center gap-2 border-b border-linda-sand/60 pb-3">
            <SlidersHorizontal className="h-4 w-4 text-linda-cognac" aria-hidden="true" />
            <h2 className="font-serif text-xl text-linda-espresso">Kategorie</h2>
          </div>

          {/* Aktivní filtr je zamáčknutý do panelu (prohlubeň), neaktivní
              leží v rovině a při hoveru se lehce nadzvedne. Stav tak nese
              i tvar, ne jen barva. */}
          <ul className="space-y-2 text-sm">
            <li>
              <Link
                href="/produkty"
                aria-current={!kategorie ? 'page' : undefined}
                className={`flex min-h-touch cursor-pointer items-center rounded-lg px-3 transition-all duration-200 ${
                  !kategorie
                    ? 'bg-linda-cognac font-medium text-white shadow-neuOnDarkInset'
                    : 'text-linda-espresso hover:shadow-neuSm'
                }`}
              >
                Všechny produkty ({celkemVsech})
              </Link>
            </li>

            {viditelne.map((k) => (
              <li key={k.slug} className={k.parentSlug ? 'ml-3' : undefined}>
                <Link
                  href={odkazSFiltrem(k.slug)}
                  aria-current={kategorie === k.slug ? 'page' : undefined}
                  className={`flex min-h-touch cursor-pointer items-center rounded-lg px-3 transition-all duration-200 ${
                    kategorie === k.slug
                      ? 'bg-linda-cognac font-medium text-white shadow-neuOnDarkInset'
                      : 'text-linda-espresso hover:shadow-neuSm'
                  }`}
                >
                  {k.nazev} ({k.pocetProduktu})
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="space-y-6 lg:col-span-3">
        {/* Uvolněné hledání se musí přiznat.
            Bez téhle věty vypadá výpis jako běžný výsledek a zákaznice se
            marně ptá, proč mezi „kašmírovými šaty" leží svetr – přitom sedí
            na „kašmír". */}
        {volnaShoda && (
          <p className="flex items-start gap-2 rounded-xl bg-linda-sandLight p-4 text-xs text-linda-espresso/80 shadow-neuInsetSm">
            <Sparkles className="mt-px h-4 w-4 shrink-0 text-linda-cognac" aria-hidden="true" />
            <span>
              Na všechna zadaná slova jsme nic nenašli. Níž jsou kousky, které odpovídají aspoň
              části dotazu.
            </span>
          </p>
        )}

        {/* Informační lišta – ne ovládací prvek, proto prohlubeň místo karty. */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-linda-sandLight p-4 text-xs text-linda-espresso/75 shadow-neuInsetSm">
          <span>
            {celkem === 0
              ? 'Zatím tu nic není'
              : `Nalezeno ${celkem} ${tvarPoctu(celkem, 'model', 'modely', 'modelů')}`}
          </span>
          {celkem > 0 && <RazeniKatalogu aktualni={razeni} />}
        </div>

        {produkty.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {produkty.map((p) => (
                <ProductCard key={p.id} {...p} />
              ))}
            </div>

            {/* Dřív se vypisovalo každé číslo stránky – při stovce stran je to
                sto odkazů, kterými se odečítač obrazovky musí prokousat. */}
            <Strankovani
              stranka={stranka}
              stranek={stranek}
              odkaz={odkazStranky}
              popisek="Stránkování katalogu"
            />
          </>
        ) : (
          <div className="space-y-4 rounded-2xl bg-linda-cream p-8 py-16 text-center shadow-neu">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-linda-sandLight shadow-neuInset">
              <Filter className="h-7 w-7 text-linda-cognac" aria-hidden="true" />
            </span>
            <h2 className="font-serif text-2xl text-linda-espresso">
              {hledat ? 'Nic jsme nenašli' : 'V této kategorii zatím nic není'}
            </h2>
            <p className="mx-auto max-w-sm text-xs text-linda-espresso/75">
              {hledat
                ? 'Zkuste jiné slovo nebo se podívejte na celou kolekci.'
                : 'Chystáme sem nové kousky. Mrkněte zatím na zbytek kolekce.'}
            </p>
            <Link
              href="/produkty"
              className="inline-flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
            >
              Zobrazit celou kolekci
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
