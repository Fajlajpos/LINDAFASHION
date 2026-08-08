'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Gift,
  Loader2,
  ShoppingBag,
  Tag,
  Trash2,
} from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { poslatJson } from '@/lib/api-klient';
import { czkNaHalere, halereNaCzk, spocitatObjednavku } from '@/lib/penize';
import { nacistKody, ulozitKody } from '@/lib/ulozene-kody';

interface Props {
  /** Z administrace; `null` znamená, že doprava zdarma není nastavená. */
  prahDopravaZdarma: number | null;
  /** Věta o DPH podle toho, zda je e-shop plátcem (sekce 11). */
  popisDph: string;
}

/**
 * Obsah košíku.
 *
 * Čte ze sdíleného kontextu, ne z vlastního stavu – dřív tahle stránka
 * renderovala dva natvrdo napsané produkty, takže zákaznice viděla něco
 * úplně jiného, než co si vložila, a v pokladně pak zase to správné.
 *
 * Kódy se ověřují proti stejnému endpointu jako v pokladně a přenášejí se
 * tam přes `sessionStorage`, aby je nebylo nutné zadávat dvakrát.
 */
export function KosikObsah({ prahDopravaZdarma, popisDph }: Props) {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    odebranePolozky,
    potvrditOdebrani,
    synchronizuje,
  } = useCart();

  const [kodVstup, setKodVstup] = useState('');
  const [poukazVstup, setPoukazVstup] = useState('');
  const [sleva, setSleva] = useState<{ kod: string; procentoSlevy: number } | null>(null);
  const [poukaz, setPoukaz] = useState<{ kod: string; zustatek: number } | null>(null);
  const [overuje, setOveruje] = useState(false);

  const [chybaSlevy, setChybaSlevy] = useState<string | null>(null);
  const [chybaPoukazu, setChybaPoukazu] = useState<string | null>(null);

  // Kódy uplatněné dřív v téhle návštěvě (třeba před přihlášením).
  useEffect(() => {
    const ulozene = nacistKody();
    setSleva(ulozene.sleva);
    setPoukaz(ulozene.poukaz);
  }, []);

  useEffect(() => {
    ulozitKody({ sleva, poukaz });
  }, [sleva, poukaz]);

  /** Stejná matematika v haléřích jako na serveru – dopravu doplní pokladna. */
  const rozpis = useMemo(() => {
    const polozky = cart.map((p) => ({
      cenaZaKus: czkNaHalere(p.cenaPoSleve ?? p.cena),
      mnozstvi: p.mnozstvi,
    }));

    return spocitatObjednavku({
      polozky,
      procentoSlevy: sleva?.procentoSlevy ?? 0,
      zustatekPoukazu: poukaz ? czkNaHalere(poukaz.zustatek) : 0,
    });
  }, [cart, sleva, poukaz]);

  const poSleveKc = halereNaCzk(rozpis.mezisoucet - rozpis.sleva);
  const doDopravyZdarma = prahDopravaZdarma === null ? 0 : Math.max(0, prahDopravaZdarma - poSleveKc);
  const postup =
    prahDopravaZdarma === null || prahDopravaZdarma === 0
      ? 100
      : Math.min(100, Math.round((poSleveKc / prahDopravaZdarma) * 100));

  const overitKod = async (typ: 'slevovy-kod' | 'darkovy-poukaz') => {
    const kod = typ === 'slevovy-kod' ? kodVstup : poukazVstup;
    if (!kod.trim() || overuje) return;

    setOveruje(true);
    setChybaSlevy(null);
    setChybaPoukazu(null);

    const vysledek = await poslatJson<{ kod: string; procentoSlevy?: number; zustatek?: number }>(
      '/api/pokladna/overit-kod',
      { typ, kod }
    );

    if (vysledek.ok) {
      if (typ === 'slevovy-kod') {
        setSleva({ kod: vysledek.data.kod, procentoSlevy: vysledek.data.procentoSlevy ?? 0 });
        setKodVstup('');
      } else {
        setPoukaz({ kod: vysledek.data.kod, zustatek: vysledek.data.zustatek ?? 0 });
        setPoukazVstup('');
      }
    } else if (typ === 'slevovy-kod') {
      setChybaSlevy(vysledek.pole?.slevovyKod ?? vysledek.chyba);
    } else {
      setChybaPoukazu(vysledek.pole?.darkovyPoukaz ?? vysledek.chyba);
    }

    setOveruje(false);
  };

  /* Než doběhne první ověření u serveru, prázdný košík ještě nemusí být
     prázdný – hlásit to hned by bylo matoucí. */
  if (cart.length === 0 && synchronizuje) {
    return (
      <p className="flex items-center justify-center gap-2 py-16 text-xs text-linda-espresso/70">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Načítám košík…
      </p>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="space-y-6">
        <ZpravaOOdebrani polozky={odebranePolozky} potvrdit={potvrditOdebrani} />

        <div className="mx-auto max-w-md space-y-4 rounded-2xl bg-linda-cream p-8 py-16 text-center shadow-neu">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-linda-sandLight shadow-neuInset">
            <ShoppingBag className="h-9 w-9 text-linda-cognac" aria-hidden="true" />
          </span>
          <h2 className="font-serif text-2xl text-linda-espresso">Váš košík je prázdný</h2>
          <p className="text-xs text-linda-espresso/70">
            Prohlédněte si naši novou kolekci italského oblečení.
          </p>
          <Link
            href="/produkty"
            className="inline-flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
          >
            Prohlédnout kolekce
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-8">
        <ZpravaOOdebrani polozky={odebranePolozky} potvrdit={potvrditOdebrani} />

        {prahDopravaZdarma !== null && (
          <div className="space-y-2 rounded-2xl bg-linda-cream p-4 shadow-neu">
            <div className="flex justify-between gap-3 text-xs font-medium text-linda-espresso">
              {doDopravyZdarma > 0 ? (
                <span>
                  Nakupte ještě za{' '}
                  <strong className="text-linda-cognac">
                    {doDopravyZdarma.toLocaleString('cs-CZ')} Kč
                  </strong>{' '}
                  a máte dopravu zdarma.
                </span>
              ) : (
                <span className="flex items-center gap-1 font-semibold text-linda-sage">
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Máte nárok na dopravu zdarma.
                </span>
              )}
              <span className="shrink-0 tabular-nums">{postup} %</span>
            </div>

            {/* Ukazatel je vyfrézovaný žlábek, výplň v něm leží – stejný
                jazyk jako vstupní pole. */}
            <div
              role="progressbar"
              aria-valuenow={postup}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Postup k dopravě zdarma"
              className="h-2.5 w-full overflow-hidden rounded-full bg-linda-sandLight shadow-neuInsetSm"
            >
              <div
                className="h-full rounded-full bg-linda-cognac transition-all duration-500"
                style={{ width: `${postup}%` }}
              />
            </div>
          </div>
        )}

        <ul className="divide-y divide-linda-sand/40 rounded-2xl bg-linda-cream shadow-neu">
          {cart.map((polozka) => {
            const cena = polozka.cenaPoSleve ?? polozka.cena;

            return (
              <li
                key={polozka.variantId}
                className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center"
              >
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-linda-sandLight shadow-neuInsetSm">
                    {polozka.obrazekUrl && (
                      <Image
                        src={polozka.obrazekUrl}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    )}
                  </div>

                  <div className="space-y-1">
                    <Link
                      href={`/produkt/${polozka.slug}`}
                      className="font-serif text-xl text-linda-espresso transition-colors hover:text-linda-cognac"
                    >
                      {polozka.nazev}
                    </Link>
                    <div className="text-xs text-linda-espresso/70">
                      Velikost: {polozka.velikost}
                      {polozka.barva && ` · ${polozka.barva}`}
                    </div>
                    <div className="flex items-baseline gap-2 text-sm font-semibold text-linda-cognac">
                      {cena.toLocaleString('cs-CZ')} Kč
                      {polozka.cenaPoSleve != null && (
                        <span className="text-xs font-normal text-linda-espresso/60 line-through">
                          {polozka.cena.toLocaleString('cs-CZ')} Kč
                        </span>
                      )}
                    </div>
                    {/* Stejná hranice jako na detailu produktu a ve workeru
                        (`skladem <= 2`) – tři různá čísla pro „dochází“ by
                        znamenala, že si košík a detail odporují. */}
                    {polozka.skladem <= 2 && (
                      <p className="text-[11px] font-medium text-linda-cognac">
                        Skladem poslední {polozka.skladem} ks
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Počítadlo je žlábek, tlačítka v něm vystupují. */}
                  <div className="flex items-center gap-1 rounded-xl bg-linda-sandLight p-1 shadow-neuInsetSm">
                    <button
                      type="button"
                      onClick={() => updateQuantity(polozka.variantId, polozka.mnozstvi - 1)}
                      aria-label={`Ubrat kus – ${polozka.nazev}`}
                      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg bg-linda-cream text-sm font-bold text-linda-espresso shadow-neuSm transition-all duration-200 hover:text-linda-cognac active:shadow-neuInsetSm"
                    >
                      &minus;
                    </button>
                    <span
                      aria-live="polite"
                      className="w-8 text-center text-xs font-semibold tabular-nums text-linda-espresso"
                    >
                      {polozka.mnozstvi}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(polozka.variantId, polozka.mnozstvi + 1)}
                      disabled={polozka.mnozstvi >= polozka.skladem}
                      aria-label={`Přidat kus – ${polozka.nazev}`}
                      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg bg-linda-cream text-sm font-bold text-linda-espresso shadow-neuSm transition-all duration-200 hover:text-linda-cognac active:shadow-neuInsetSm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFromCart(polozka.variantId)}
                    aria-label={`Odebrat z košíku – ${polozka.nazev}`}
                    className="flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-full bg-linda-cream text-linda-espresso/70 shadow-neuSm transition-all duration-200 hover:text-linda-cognac active:shadow-neuInsetSm"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Kódy */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PoleKodu
            id="slevovy-kod"
            popisek="Slevový kód"
            ikona={<Tag className="h-3.5 w-3.5 text-linda-cognac" aria-hidden="true" />}
            placeholder="Např. VITEJTE10"
            hodnota={kodVstup}
            zmena={setKodVstup}
            odeslat={() => void overitKod('slevovy-kod')}
            overuje={overuje}
            chyba={chybaSlevy}
            uplatneno={sleva && `Kód ${sleva.kod} · sleva ${sleva.procentoSlevy} %`}
            zrusit={() => setSleva(null)}
            tmave
          />

          <PoleKodu
            id="darkovy-poukaz"
            popisek="Dárkový poukaz"
            ikona={<Gift className="h-3.5 w-3.5 text-linda-cognac" aria-hidden="true" />}
            placeholder="Kód z poukazu"
            hodnota={poukazVstup}
            zmena={setPoukazVstup}
            odeslat={() => void overitKod('darkovy-poukaz')}
            overuje={overuje}
            chyba={chybaPoukazu}
            uplatneno={
              poukaz && `Poukaz ${poukaz.kod} · zbývá ${poukaz.zustatek.toLocaleString('cs-CZ')} Kč`
            }
            zrusit={() => setPoukaz(null)}
          />
        </div>
      </div>

      {/* Shrnutí */}
      <div className="lg:col-span-4">
        <div className="sticky top-24 space-y-6 rounded-2xl bg-linda-cream p-6 shadow-neuLg">
          <h2 className="border-b border-linda-sand/60 pb-3 font-serif text-2xl text-linda-espresso">
            Shrnutí objednávky
          </h2>

          <dl className="space-y-3 text-xs text-linda-espresso/80">
            <div className="flex justify-between">
              <dt>Mezisoučet</dt>
              <dd className="font-medium text-linda-espresso">
                {halereNaCzk(rozpis.mezisoucet).toLocaleString('cs-CZ')} Kč
              </dd>
            </div>

            {rozpis.sleva > 0 && (
              <div className="flex justify-between font-medium text-linda-sage">
                <dt>Sleva ({sleva?.procentoSlevy} %)</dt>
                <dd>−{halereNaCzk(rozpis.sleva).toLocaleString('cs-CZ')} Kč</dd>
              </div>
            )}

            {rozpis.zPoukazu > 0 && (
              <div className="flex justify-between font-medium text-linda-sage">
                <dt>Dárkový poukaz</dt>
                <dd>−{halereNaCzk(rozpis.zPoukazu).toLocaleString('cs-CZ')} Kč</dd>
              </div>
            )}

            <div className="flex justify-between">
              <dt>Doprava</dt>
              <dd>{doDopravyZdarma === 0 && prahDopravaZdarma !== null ? 'Zdarma' : 'Vyberete v dalším kroku'}</dd>
            </div>

            {/* Součet sedí v prohlubni – nejdůležitější číslo stránky má
                vlastní plochu, ne jen tučnější řez. */}
            <div className="mt-4 flex items-baseline justify-between rounded-xl bg-linda-sandLight px-4 py-3 text-base font-semibold text-linda-espresso shadow-neuInsetSm">
              <dt>Zatím k úhradě</dt>
              <dd className="font-serif text-2xl text-linda-cognac">
                {halereNaCzk(rozpis.kUhrade).toLocaleString('cs-CZ')} Kč
              </dd>
            </div>
          </dl>

          <p className="text-[11px] text-linda-espresso/70">
            Konečnou částku uvidíte v pokladně, jakmile vyberete dopravu. {popisDph}
          </p>

          <Link
            href="/pokladna"
            className="flex min-h-touch w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-linda-cognac py-4 text-xs font-semibold uppercase tracking-wider text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
          >
            Pokračovat k pokladně
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Co server z košíku odebral nebo upravil, se musí dozvědět zákaznice. */
const ZpravaOOdebrani: React.FC<{
  polozky: Array<{ nazev: string; duvod: string }>;
  potvrdit: () => void;
}> = ({ polozky, potvrdit }) => {
  if (polozky.length === 0) return null;

  return (
    <div
      role="status"
      className="space-y-2 rounded-xl bg-linda-sandLight p-4 text-xs text-linda-espresso shadow-neuInsetSm"
    >
      <p className="flex items-center gap-2 font-semibold">
        <AlertCircle className="h-4 w-4 shrink-0 text-linda-cognac" aria-hidden="true" />
        Košík jsme museli upravit
      </p>
      <ul className="space-y-1 pl-6">
        {polozky.map((p, i) => (
          <li key={`${p.nazev}-${i}`} className="list-disc">
            <strong>{p.nazev}</strong> – {p.duvod}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={potvrdit}
        className="min-h-touch cursor-pointer text-[11px] font-semibold text-linda-cognac underline"
      >
        Rozumím
      </button>
    </div>
  );
};

const PoleKodu: React.FC<{
  id: string;
  popisek: string;
  ikona: React.ReactNode;
  placeholder: string;
  hodnota: string;
  zmena: (v: string) => void;
  odeslat: () => void;
  overuje: boolean;
  chyba: string | null;
  uplatneno: string | null | false;
  zrusit: () => void;
  tmave?: boolean;
}> = ({
  id,
  popisek,
  ikona,
  placeholder,
  hodnota,
  zmena,
  odeslat,
  overuje,
  chyba,
  uplatneno,
  zrusit,
  tmave,
}) => (
  <div className="space-y-2 rounded-2xl bg-linda-cream p-4 shadow-neu">
    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-linda-espresso">
      {ikona}
      {popisek}
    </p>

    {uplatneno ? (
      /* Stejný zápis jako uplatněný kód v pokladně – jinak by se tentýž stav
         na dvou obrazovkách hlásil dvěma různými barvami. */
      <p className="flex items-center justify-between gap-2 rounded-xl bg-linda-sageLight p-3 text-xs font-medium text-linda-sage">
        <span className="flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {uplatneno}
        </span>
        <button
          type="button"
          onClick={zrusit}
          className="min-h-touch shrink-0 cursor-pointer underline"
        >
          Odebrat
        </button>
      </p>
    ) : (
      <>
        <div className="flex gap-2">
          <input
            id={id}
            type="text"
            value={hodnota}
            onChange={(e) => zmena(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                odeslat();
              }
            }}
            placeholder={placeholder}
            aria-label={popisek}
            aria-invalid={chyba ? true : undefined}
            aria-describedby={chyba ? `${id}-chyba` : undefined}
            className="min-h-touch flex-1 rounded-xl bg-linda-sandLight px-3 text-xs uppercase text-linda-espresso shadow-neuInsetSm transition-shadow placeholder:normal-case placeholder:text-linda-espresso/60"
          />
          <button
            type="button"
            onClick={odeslat}
            disabled={overuje}
            aria-busy={overuje}
            className={`flex min-h-touch shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-4 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 active:shadow-neuSm disabled:cursor-not-allowed disabled:opacity-60 ${
              tmave ? 'bg-linda-espresso hover:bg-linda-cognac' : 'bg-linda-cognac hover:bg-linda-cognacHover'
            }`}
          >
            {/* Spinner se přidává vedle popisku, nenahrazuje ho – jinak
                tlačítko během ověřování poskočí na jinou šířku. */}
            {overuje && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            Použít
          </button>
        </div>

        {chyba && (
          <p id={`${id}-chyba`} role="alert" className="text-xs font-medium text-red-800">
            {chyba}
          </p>
        )}
      </>
    )}
  </div>
);
