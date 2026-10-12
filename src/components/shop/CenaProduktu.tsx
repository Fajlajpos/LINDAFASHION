import React from 'react';
import {
  czkNaHalere,
  formatovatCenu,
  formatovatProcentoSlevy,
  popisNejnizsiCeny,
  slevaKZobrazeni,
  type ZobrazenaSleva,
} from '@/lib/penize';

/**
 * Cena produktu včetně slevy – jeden vzhled pro kartu, detail i košík.
 *
 * Dřív měl každý z nich vlastní kopii a rozcházely se: karta a detail
 * přeškrtávaly `Product.cena`, košík navíc bez věty o nejnižší ceně za 30 dnů.
 * Co se jako sleva smí ukázat, teď rozhoduje jen `slevaKZobrazeni` (§ 12a).
 *
 * ## Proč takhle (a bez barev)
 *
 * Výhodnost nese typografie, ne červená:
 * - **kotva první** – přeškrtnutá předchozí cena stojí nad novou, menší a lehčí,
 *   oko ji přečte dřív a nová cena se s ní porovná;
 * - **kontrast váhy** – zlevněná cena je tučná a o stupeň větší než cena
 *   nezlevněného kousku, takže karta v mřížce vystoupí sama;
 * - **úspora v korunách** – u oblečení za stovky a tisíce působí „Ušetříte
 *   700 Kč" silněji než procento (pravidlo stovky); procento nese štítek.
 *
 * Přeškrtnutá cena je `/70`, ne `/60`: na krému i písku dává 5,5 : 1, `/60`
 * padala na 4,1 : 1 – pod hranici čitelnosti, a to u údaje, který zákon chce.
 *
 * Bez `'use client'` – nemá stav, takže ji vykreslí serverová i klientská
 * komponenta.
 */

type Velikost = 'karta' | 'detail' | 'kosik';

interface Props {
  /** Základní cena v Kč (`Product.cena`). */
  cena: number;
  /** Cena po slevě v Kč, jestli je vyplněná. Platí se vždycky tahle. */
  cenaPoSleve?: number | null;
  /** Reference za 30 dnů v haléřích – bez ní se sleva neoznamuje. */
  nejnizsiCena30DniHaleru?: number | null;
  velikost: Velikost;
  /** Karta má štítek na fotce, u ceny by byl podruhé. */
  bezStitku?: boolean;
}

const STYL: Record<
  Velikost,
  { puvodni: string; cena: string; cenaBezSlevy: string; uspora: string; reference: string; mezera: string }
> = {
  karta: {
    puvodni: 'text-sm',
    cena: 'text-xl font-bold',
    cenaBezSlevy: 'text-lg font-semibold',
    uspora: 'text-xs',
    reference: 'mt-1 text-[10px] leading-tight text-linda-espresso/70',
    mezera: 'gap-x-2',
  },
  detail: {
    puvodni: 'text-base',
    cena: 'text-3xl font-bold',
    cenaBezSlevy: 'text-2xl font-semibold',
    uspora: 'text-sm',
    reference: 'mt-2 text-[11px] font-medium text-linda-espresso/85',
    mezera: 'gap-x-3',
  },
  kosik: {
    puvodni: 'text-xs',
    cena: 'text-base font-bold',
    cenaBezSlevy: 'text-sm font-semibold',
    uspora: 'text-xs',
    reference: 'mt-0.5 text-[11px] leading-tight text-linda-espresso/70',
    mezera: 'gap-x-2',
  },
};

/**
 * Štítek „−20 %" – červený (`linda-sleva`), ať se sleva pozná na první pohled.
 * Byl espresso; majitel webu chtěl červenou. Zbytek cenového bloku zůstává
 * bez barvy – tučná cena a „Ušetříte" stačí.
 */
export function StitekSlevy({
  procento,
  className = '',
}: {
  procento: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full bg-linda-sleva px-2.5 py-1 text-xs font-bold tracking-wide text-white ${className}`}
    >
      <span className="sr-only">Sleva </span>
      {formatovatProcentoSlevy(procento)}
    </span>
  );
}

/** Pro volající, kteří potřebují vědět, jestli sleva je (štítek na fotce, souhrn košíku). */
export function slevaProduktu(
  cena: number,
  cenaPoSleve: number | null | undefined,
  nejnizsiCena30DniHaleru: number | null | undefined
): ZobrazenaSleva | null {
  return slevaKZobrazeni(czkNaHalere(cenaPoSleve ?? cena), nejnizsiCena30DniHaleru ?? null);
}

export function CenaProduktu({
  cena,
  cenaPoSleve = null,
  nejnizsiCena30DniHaleru = null,
  velikost,
  bezStitku = false,
}: Props) {
  const styl = STYL[velikost];
  // Platí se `cenaPoSleve`, i když se sleva oznámit nesmí (chybí reference) –
  // pak se jen neukáže jako sleva.
  const aktualni = czkNaHalere(cenaPoSleve ?? cena);
  const sleva = slevaKZobrazeni(aktualni, nejnizsiCena30DniHaleru);

  if (!sleva) {
    return (
      <span className={`${styl.cenaBezSlevy} text-linda-espresso`}>{formatovatCenu(aktualni)}</span>
    );
  }

  return (
    <div>
      <span className={`block ${styl.puvodni} text-linda-espresso/70 line-through`}>
        <span className="sr-only">Předchozí cena </span>
        {formatovatCenu(sleva.puvodniHaleru)}
      </span>

      <div className={`flex flex-wrap items-center ${styl.mezera} gap-y-1`}>
        <span className={`${styl.cena} tabular-nums text-linda-espresso`}>
          <span className="sr-only">Nyní </span>
          {formatovatCenu(sleva.aktualniHaleru)}
        </span>
        {!bezStitku && <StitekSlevy procento={sleva.procento} />}
      </div>

      <p className={`mt-0.5 ${styl.uspora} font-semibold text-linda-espresso`}>
        Ušetříte {formatovatCenu(sleva.usporaHaleru)}
      </p>

      {/* § 12a – u každého oznámení slevy, hned u ceny. */}
      <p className={styl.reference}>{popisNejnizsiCeny(sleva.puvodniHaleru)}</p>
    </div>
  );
}
