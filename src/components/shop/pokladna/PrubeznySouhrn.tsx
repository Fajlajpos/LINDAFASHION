'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Tag } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { usePokladna } from '@/lib/pokladna-kontext';
import { usePrilepenyPanel } from '@/lib/prilepeny-panel';
import { czkNaHalere, halereNaCzk, spocitatObjednavku } from '@/lib/penize';
import { nacistKody, type UlozeneKody } from '@/lib/ulozene-kody';
import { NAZEV_PLATBY } from '@/lib/objednavka-popisky';

const kc = (halere: number) => `${halereNaCzk(halere).toLocaleString('cs-CZ')} Kč`;

/**
 * Postranní souhrn v krocích „Údaje" a „Doprava a platba".
 *
 * Počítá prohlížeč – stejnou funkcí v haléřích jako server, ale z cen
 * v košíku. Je to průběžný přehled; závazná částka se načte ze serveru až
 * ve shrnutí, těsně před tlačítkem, a s ní se objednávka odesílá.
 *
 * Kódy se tu jen ukazují. Zadávají se v košíku, jako u většiny obchodů –
 * pokladna je tak o pole kratší a kód se nezadává na dvou místech.
 */
export function PrubeznySouhrn({ bezDopravy = false }: {
  /**
   * Doprava ještě není zvolená (krok Údaje před prvním výběrem). Předvybraný
   * dopravce by jinak v součtu vypadal jako hotová volba.
   */
  bezDopravy?: boolean;
}) {
  const { cart } = useCart();
  const { data, koncept, vybranaDoprava } = usePokladna();
  const souhrn = usePrilepenyPanel<HTMLDivElement>();

  const [kody, setKody] = useState<UlozeneKody>({ sleva: null, poukaz: null });
  useEffect(() => setKody(nacistKody()), []);

  const rozpis = useMemo(() => {
    const polozky = cart.map((p) => ({
      cenaZaKus: czkNaHalere(p.cenaPoSleve ?? p.cena),
      mnozstvi: p.mnozstvi,
    }));
    const procentoSlevy = kody.sleva?.procentoSlevy ?? 0;

    const zboziPoSleve = spocitatObjednavku({ polozky, procentoSlevy });
    const zdarma =
      data.prahDopravaZdarma !== null &&
      halereNaCzk(zboziPoSleve.mezisoucet - zboziPoSleve.sleva) >= data.prahDopravaZdarma;

    return spocitatObjednavku({
      polozky,
      procentoSlevy,
      doprava: zdarma || bezDopravy ? 0 : czkNaHalere(vybranaDoprava?.cena ?? 0),
      zustatekPoukazu: kody.poukaz ? czkNaHalere(kody.poukaz.zustatek) : 0,
    });
  }, [cart, kody, vybranaDoprava, data.prahDopravaZdarma, bezDopravy]);

  return (
    <aside aria-label="Souhrn objednávky" className="lg:col-span-5">
      {/* Bod přilepení počítá `usePrilepenyPanel` – viz ten soubor. Přilepení
          až od `lg`: pod ním je souhrn běžný blok pod formulářem. */}
      <div
        ref={souhrn.ref}
        style={{ top: souhrn.top }}
        className="space-y-5 rounded-2xl bg-linda-cream p-6 shadow-neu lg:sticky"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-serif text-2xl text-linda-espresso">Váš nákup</h2>
          <Link
            href="/kosik"
            className="min-h-touch shrink-0 cursor-pointer content-center text-[11px] font-semibold text-linda-cognac underline-offset-2 hover:underline"
          >
            Upravit košík
          </Link>
        </div>

        <ul className="space-y-3">
          {cart.map((p) => (
            <li key={p.variantId} className="flex items-center gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-linda-sandLight shadow-neuInsetSm">
                {p.obrazekUrl && <Image src={p.obrazekUrl} alt="" fill sizes="56px" className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-linda-espresso">{p.nazev}</p>
                <p className="text-[11px] text-linda-espresso/70">
                  {p.velikost}
                  {p.barva && ` · ${p.barva}`} · {p.mnozstvi} ks
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-linda-espresso">
                {((p.cenaPoSleve ?? p.cena) * p.mnozstvi).toLocaleString('cs-CZ')} Kč
              </span>
            </li>
          ))}
        </ul>

        {(kody.sleva || kody.poukaz) && (
          <ul className="space-y-1.5 border-t border-linda-sand/60 pt-4 text-[11px] font-medium text-linda-sage">
            {kody.sleva && (
              <li className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                Kód {kody.sleva.kod} · −{kody.sleva.procentoSlevy} %
              </li>
            )}
            {kody.poukaz && (
              <li className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                Poukaz {kody.poukaz.kod}
              </li>
            )}
          </ul>
        )}

        <dl className="space-y-2 border-t border-linda-sand/60 pt-4 text-xs">
          <div className="flex justify-between">
            <dt className="text-linda-espresso/75">Mezisoučet</dt>
            <dd className="text-linda-espresso">{kc(rozpis.mezisoucet)}</dd>
          </div>

          {rozpis.sleva > 0 && (
            <div className="flex justify-between text-linda-sage">
              <dt>Sleva</dt>
              <dd>−{kc(rozpis.sleva)}</dd>
            </div>
          )}

          {bezDopravy ? (
            <div className="flex justify-between gap-3">
              <dt className="text-linda-espresso/75">Doprava a platba</dt>
              <dd className="text-right text-linda-espresso/75">Vyberete v dalším kroku</dd>
            </div>
          ) : (
            <>
              <div className="flex justify-between gap-3">
                <dt className="text-linda-espresso/75">
                  Doprava{vybranaDoprava ? ` – ${vybranaDoprava.nazev}` : ''}
                </dt>
                <dd className={rozpis.doprava === 0 ? 'text-linda-sage' : 'text-linda-espresso'}>
                  {rozpis.doprava === 0 ? 'Zdarma' : kc(rozpis.doprava)}
                </dd>
              </div>

              <div className="flex justify-between gap-3">
                <dt className="text-linda-espresso/75">Platba</dt>
                <dd className="text-right text-linda-espresso">
                  {NAZEV_PLATBY[koncept.zpusobPlatby] ?? koncept.zpusobPlatby}
                </dd>
              </div>
            </>
          )}

          {rozpis.zPoukazu > 0 && (
            <div className="flex justify-between text-linda-sage">
              <dt>Uhrazeno poukazem</dt>
              <dd>−{kc(rozpis.zPoukazu)}</dd>
            </div>
          )}

          <div className="flex justify-between border-t border-linda-sand/60 pt-2 text-base font-semibold text-linda-espresso">
            <dt>{bezDopravy ? 'Zatím k úhradě' : 'K úhradě'}</dt>
            <dd>{kc(rozpis.kUhrade)}</dd>
          </div>
        </dl>

        <p className="text-[11px] text-linda-espresso/70">{data.popisDph}</p>
      </div>
    </aside>
  );
}
