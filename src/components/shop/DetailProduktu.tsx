'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  AlertCircle,
  Check,
  Gift,
  Heart,
  Ruler,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
} from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { useFavorites } from '@/lib/favorites-context';
import type { ProduktDetail } from '@/lib/katalog';

/** Popisky měr – klíče z Json pole na čitelný český text. */
const POPISKY_MER: Record<string, string> = {
  obvodHrudniku: 'Obvod hrudníku',
  obvodPasu: 'Obvod pasu',
  obvodBoku: 'Obvod boků',
  delka: 'Celková délka',
  rukav: 'Délka rukávu',
};

interface Props {
  produkt: ProduktDetail;
  /** Objednávání je vypnuté režimem dovolené (sekce 6.7). */
  objednavaniZablokovano?: boolean;
}

export function DetailProduktu({ produkt, objednavaniZablokovano = false }: Props) {
  // Předvybereme první variantu, která je skladem – zákaznice tak nezačíná
  // na vyprodané velikosti s neaktivním tlačítkem.
  const vychoziVarianta = produkt.varianty.find((v) => v.skladem > 0) ?? produkt.varianty[0];

  const [vybranaId, setVybranaId] = useState<string | undefined>(vychoziVarianta?.id);
  const [aktivniFotka, setAktivniFotka] = useState(0);
  const [pridano, setPridano] = useState(false);
  const [prubvodceOtevren, setPrubvodceOtevren] = useState(false);

  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();

  const varianta = produkt.varianty.find((v) => v.id === vybranaId) ?? vychoziVarianta;
  const jeOblibeny = isFavorite(produkt.slug);
  const aktualniCena = produkt.cenaPoSleve ?? produkt.cena;
  const maFotky = produkt.fotky.length > 0;

  const pridatDoKosiku = () => {
    if (!varianta || varianta.skladem === 0) return;

    addToCart({
      variantId: varianta.id,
      productId: produkt.id,
      nazev: produkt.nazev,
      slug: produkt.slug,
      velikost: varianta.velikost,
      barva: varianta.barva,
      cena: produkt.cena,
      cenaPoSleve: produkt.cenaPoSleve,
      mnozstvi: 1,
      obrazekUrl: produkt.fotky[0]?.url ?? null,
      skladem: varianta.skladem,
    });

    setPridano(true);
    setTimeout(() => setPridano(false), 3000);
  };

  const miry = varianta?.miry
    ? Object.entries(varianta.miry).filter(([, hodnota]) => hodnota)
    : [];

  return (
    <>
      <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12">
        {/* Galerie */}
        <div className="space-y-4 lg:col-span-7">
          <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-linda-sandLight shadow-neuInset">
            {maFotky ? (
              <Image
                src={produkt.fotky[aktivniFotka].url}
                alt={produkt.fotky[aktivniFotka].alt ?? produkt.nazev}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 58vw"
                className="object-cover"
              />
            ) : (
              /* Fotka zatím chybí – místo ní značková výplň, ne rozbitý
                 obrázek. Zadání zakazuje AI-generované náhražky. */
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-linda-cream shadow-neu">
                  {produkt.jeDarkovyPoukaz ? (
                    <Gift className="h-12 w-12 stroke-[1.5] text-linda-cognac" aria-hidden="true" />
                  ) : (
                    <Sparkles className="h-12 w-12 stroke-[1.5] text-linda-cognac" aria-hidden="true" />
                  )}
                </div>
                <span className="font-serif text-3xl text-linda-espresso">LINDA FASHION</span>
                <span className="mt-1 text-xs font-medium uppercase tracking-widest text-linda-cognac">
                  Moda Italiana &bull; Pečlivě vybráno v Itálii
                </span>
              </div>
            )}
          </div>

          {produkt.fotky.length > 1 && (
            <ul className="grid grid-cols-5 gap-3">
              {produkt.fotky.map((fotka, index) => (
                <li key={fotka.id}>
                  <button
                    type="button"
                    onClick={() => setAktivniFotka(index)}
                    aria-label={`Zobrazit fotografii ${index + 1} z ${produkt.fotky.length}`}
                    aria-current={index === aktivniFotka ? 'true' : undefined}
                    className={`relative aspect-square w-full cursor-pointer overflow-hidden rounded-xl transition-all duration-200 ${
                      index === aktivniFotka
                        ? 'bg-linda-sandLight shadow-neuInsetSm'
                        : 'bg-linda-cream shadow-neuSm hover:shadow-neu'
                    }`}
                  >
                    <Image
                      src={fotka.url}
                      alt=""
                      fill
                      sizes="120px"
                      className={`object-cover transition-opacity duration-200 ${
                        index === aktivniFotka ? 'opacity-100' : 'opacity-80'
                      }`}
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Údaje a akce */}
        <div className="space-y-8 lg:col-span-5">
          <div>
            {produkt.znacka && (
              <span className="mb-1 block text-xs font-semibold uppercase tracking-widest text-linda-cognac">
                {produkt.znacka}
              </span>
            )}
            <h1 className="font-serif text-3xl leading-tight text-linda-espresso sm:text-4xl">
              {produkt.nazev}
            </h1>

            <div className="mt-4 flex flex-wrap items-baseline gap-3">
              <span className="text-2xl font-semibold text-linda-espresso">
                {aktualniCena.toLocaleString('cs-CZ')} Kč
              </span>

              {produkt.cenaPoSleve !== null && (
                <span className="text-sm text-linda-espresso/60 line-through">
                  {produkt.cena.toLocaleString('cs-CZ')} Kč
                </span>
              )}

              {produkt.sklademCelkem > 0 ? (
                <span className="rounded-full bg-linda-sageLight px-2.5 py-1 text-xs font-medium text-linda-sage">
                  Skladem &bull; ihned k odeslání
                </span>
              ) : (
                <span className="rounded-full bg-linda-sandLight px-2.5 py-1 text-xs font-medium text-linda-espresso/75 shadow-neuInsetSm">
                  Momentálně vyprodáno
                </span>
              )}
            </div>
          </div>

          <p className="whitespace-pre-line text-sm font-light leading-relaxed text-linda-espresso/85">
            {produkt.popis}
          </p>

          {/* Výběr varianty */}
          {produkt.varianty.length > 0 && (
            <div className="space-y-3 border-t border-linda-sand/60 pt-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-linda-espresso">
                  {produkt.jeDarkovyPoukaz ? 'Zvolte hodnotu poukazu:' : 'Zvolte velikost:'}
                </span>

                {!produkt.jeDarkovyPoukaz && (
                  <button
                    type="button"
                    onClick={() => setPrubvodceOtevren(true)}
                    className="flex min-h-touch cursor-pointer items-center gap-1 rounded-full px-1 text-xs font-medium text-linda-cognac transition-colors hover:text-linda-cognacHover hover:underline"
                  >
                    <Ruler className="h-3.5 w-3.5" aria-hidden="true" />
                    Tabulka mír a průvodce
                  </button>
                )}
              </div>

              {/* Zvolená velikost je zamáčknutá do plochy, ostatní vystupují.
                  Vyprodaná je prohlubeň a stav nese i přeškrtnutí, ne jen barva. */}
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {produkt.varianty.map((v) => {
                  const vyprodano = v.skladem === 0;
                  const vybrana = v.id === varianta?.id;

                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVybranaId(v.id)}
                      aria-pressed={vybrana}
                      className={`min-h-touch cursor-pointer rounded-xl px-2 py-3 text-center text-xs font-medium transition-all duration-200 ${
                        vybrana
                          ? 'bg-linda-cognac text-white shadow-neuOnDarkInset'
                          : vyprodano
                            ? 'bg-linda-sandLight text-linda-espresso/60 line-through shadow-neuInsetSm'
                            : 'bg-linda-cream text-linda-espresso shadow-neuSm hover:shadow-neu'
                      }`}
                    >
                      {v.velikost}
                      {v.skladem > 0 && v.skladem <= 2 && (
                        <span className="block text-[9px] font-normal text-linda-cognac">
                          Poslední kousky!
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Míry – u dárkového poukazu nedávají smysl (sekce 6.2) */}
          {!produkt.jeDarkovyPoukaz && miry.length > 0 && varianta && (
            <div className="space-y-2 rounded-2xl bg-linda-sandLight p-4 text-xs shadow-neuInsetSm">
              <h2 className="font-semibold uppercase tracking-wider text-linda-espresso">
                Přesné míry pro velikost {varianta.velikost}
              </h2>
              <dl className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                {miry.map(([klic, hodnota]) => (
                  <div key={klic} className="flex justify-between border-b border-linda-sand/40 py-1">
                    <dt className="text-linda-espresso/80">{POPISKY_MER[klic] ?? klic}:</dt>
                    <dd className="font-medium text-linda-cognac">{String(hodnota)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {(produkt.material || produkt.udrzba) && (
            <div className="space-y-1 text-xs text-linda-espresso/85">
              <h2 className="font-semibold uppercase tracking-wider text-linda-espresso">
                Materiál a péče
              </h2>
              {produkt.material && <p>Materiál: {produkt.material}</p>}
              {produkt.udrzba && <p>Péče: {produkt.udrzba}</p>}
            </div>
          )}

          {/* Akce */}
          <div className="space-y-3 border-t border-linda-sand/60 pt-4">
            {objednavaniZablokovano ? (
              <p className="rounded-2xl bg-linda-sandLight p-4 text-center text-xs font-medium text-linda-espresso/85 shadow-neuInsetSm">
                Objednávky jsou po dobu naší nepřítomnosti pozastavené. Kousek si zatím můžete uložit
                mezi oblíbené.
              </p>
            ) : varianta && varianta.skladem > 0 ? (
              <button
                type="button"
                onClick={pridatDoKosiku}
                className="flex min-h-touch w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-linda-cognac py-4 text-sm font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
              >
                {pridano ? (
                  <>
                    <Check className="h-5 w-5" aria-hidden="true" />
                    Přidáno do košíku
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                    Přidat do košíku
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-3 rounded-2xl bg-linda-sandLight p-4 text-center shadow-neuInsetSm">
                <p className="flex items-center justify-center gap-1 text-xs font-semibold text-linda-cognac">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  Tato velikost je momentálně vyprodaná
                </p>
                {/* TODO: napojit na `POST /api/hlidani-skladu` (StockNotification). */}
                <button
                  type="button"
                  disabled
                  title="Hlídání dostupnosti připravujeme"
                  className="min-h-touch cursor-not-allowed rounded-full bg-linda-espresso px-4 text-xs font-medium text-white opacity-60 shadow-neuDark"
                >
                  Upozornit, až bude skladem
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                toggleFavorite({
                  slug: produkt.slug,
                  nazev: produkt.nazev,
                  cena: produkt.cena,
                  cenaPoSleve: produkt.cenaPoSleve,
                  znacka: produkt.znacka,
                  kategorieNazev: produkt.kategorieNazev,
                  obrazekUrl: produkt.fotky[0]?.url ?? null,
                  jeDarkovyPoukaz: produkt.jeDarkovyPoukaz,
                })
              }
              aria-pressed={jeOblibeny}
              className={`flex min-h-touch w-full cursor-pointer items-center justify-center gap-2 rounded-full py-3 text-xs font-semibold transition-all duration-200 ${
                jeOblibeny
                  ? 'bg-linda-sandLight text-linda-cognac shadow-neuInsetSm'
                  : 'bg-linda-cream text-linda-espresso shadow-neuSm hover:text-linda-cognac hover:shadow-neu'
              }`}
            >
              <Heart
                className={`h-4 w-4 ${jeOblibeny ? 'fill-linda-cognac text-linda-cognac' : ''}`}
                aria-hidden="true"
              />
              {jeOblibeny ? 'Uloženo v oblíbených' : 'Uložit mezi oblíbené'}
            </button>
          </div>

          <ul className="grid grid-cols-3 gap-2 border-t border-linda-sand/40 pt-4 text-center text-[10px] text-linda-espresso/75">
            {[
              { Ikona: Truck, text: 'Doručení do 2 dnů' },
              { Ikona: RotateCcw, text: '14 dní na vyzkoušení' },
              { Ikona: ShieldCheck, text: 'Bezpečná platba' },
            ].map(({ Ikona, text }) => (
              <li key={text} className="flex flex-col items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-linda-cream shadow-neuSm">
                  <Ikona className="h-5 w-5 text-linda-cognac" aria-hidden="true" />
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Průvodce velikostmi */}
      {prubvodceOtevren && (
        <div className="animate-fadeIn fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pruvodce-nadpis"
            className="relative w-full max-w-md space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neuLg"
          >
            <h2 id="pruvodce-nadpis" className="font-serif text-2xl text-linda-espresso">
              Průvodce velikostmi a jak se měřit
            </h2>
            <p className="text-xs leading-relaxed text-linda-espresso/85">
              Italské velikosti odpovídají evropskému číslování. Vždy se měřte krejčovským metrem
              přímo na těle, bez přitažení:
            </p>
            <ul className="list-disc space-y-1.5 pl-4 text-xs text-linda-espresso/80">
              <li>
                <strong>Hrudník:</strong> přes nejplnější místo prsou
              </li>
              <li>
                <strong>Pas:</strong> v nejužším místě nad pupíkem
              </li>
              <li>
                <strong>Boky:</strong> přes nejširší část hýždí
              </li>
            </ul>
            <button
              type="button"
              onClick={() => setPrubvodceOtevren(false)}
              className="min-h-touch w-full cursor-pointer rounded-full bg-linda-cognac text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
            >
              Rozumím
            </button>
          </div>
        </div>
      )}
    </>
  );
}
