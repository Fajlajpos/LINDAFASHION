import React from 'react';
import Link from 'next/link';
import { Package, Truck } from 'lucide-react';
import { db } from '@/lib/db';
import { STAV_OBJEDNAVKY, STAV_PLATBY, formatDatum } from '@/lib/objednavka-popisky';
import { Strankovani, cisloStranky } from '@/components/ui/Strankovani';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Objednávky | Administrace LINDA FASHION',
};

/**
 * Stavy, na které se dá filtrovat. Slouží zároveň jako povolený seznam pro
 * `?stav=` – hodnota z adresy šla dřív do Prismy přímo přetypovaná, takže
 * `?stav=cokoliv` skončilo výjimkou nad neznámou hodnotou enumu, tedy 500
 * a chybovou hranicí místo prázdného seznamu.
 */
const STAVY_FILTRU = [
  'NOVA',
  'ZPRACOVAVA_SE',
  'EXPEDOVANA',
  'DORUCENA',
  'VRACENA',
  'ZRUSENA',
] as const;

type StavFiltru = (typeof STAVY_FILTRU)[number];

/** Popisky filtru. `VRACENA` tu dřív chyběla – vrácené objednávky se nedaly vypsat. */
const POPISKY_FILTRU: Record<StavFiltru, string> = {
  NOVA: 'Nové',
  ZPRACOVAVA_SE: 'Zpracovávají se',
  EXPEDOVANA: 'Expedované',
  DORUCENA: 'Doručené',
  VRACENA: 'Vrácené',
  ZRUSENA: 'Zrušené',
};

function platnyStav(hodnota: string | undefined): StavFiltru | null {
  return hodnota && (STAVY_FILTRU as readonly string[]).includes(hodnota)
    ? (hodnota as StavFiltru)
    : null;
}

/** Dřív se vypisovalo prvních 100 a na zbytek se nedalo dostat vůbec. */
const NA_STRANKU = 25;

interface Props {
  searchParams: { stav?: string; stranka?: string };
}

export default async function AdminObjednavkyPage({ searchParams }: Props) {
  const stav = platnyStav(searchParams.stav);
  const stranka = cisloStranky(searchParams.stranka);

  const kde: Prisma.OrderWhereInput = stav ? { stav } : {};

  const [objednavky, pocty] = await Promise.all([
    db.order.findMany({
      where: kde,
      orderBy: { createdAt: 'desc' },
      skip: (stranka - 1) * NA_STRANKU,
      take: NA_STRANKU,
      include: {
        items: { select: { mnozstvi: true } },
        _count: { select: { reklamace: true } },
      },
    }),
    db.order.groupBy({ by: ['stav'], _count: true }),
  ]);

  const pocetPodleStavu = new Map(pocty.map((p) => [String(p.stav), p._count]));
  const celkem = pocty.reduce((s, p) => s + p._count, 0);

  // Počet ve filtru už máme z `groupBy`, další dotaz do databáze není potřeba.
  const celkemVeFiltru = stav ? (pocetPodleStavu.get(stav) ?? 0) : celkem;
  const stranek = Math.ceil(celkemVeFiltru / NA_STRANKU);

  const odkazStranky = (cislo: number) => {
    const parametry = new URLSearchParams();
    if (stav) parametry.set('stav', stav);
    if (cislo > 1) parametry.set('stranka', String(cislo));

    const dotaz = parametry.toString();
    return `/admin/objednavky${dotaz ? `?${dotaz}` : ''}`;
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-linda-sand pb-6">
        <h1 className="font-serif text-3xl text-linda-espresso sm:text-4xl">Objednávky</h1>
        <p className="mt-1 text-xs text-linda-espresso/70">
          {celkem === 0 ? 'Zatím žádná objednávka' : `Celkem ${celkem} objednávek`}
        </p>
      </div>

      {/* Filtr stavů – aktivní je zamáčknutý, ostatní leží v rovině. */}
      <nav aria-label="Filtr objednávek">
        <ul className="flex flex-wrap gap-2">
          {(['vse', ...STAVY_FILTRU] as const).map((klic) => {
            /* Porovnáváme s ověřenou hodnotou, ne se surovým parametrem:
               při `?stav=cokoliv` se vypisuje vše, takže se musí zamáčknout „Vše“. */
            const jeAktivni = (stav ?? 'vse') === klic;
            const pocet = klic === 'vse' ? celkem : (pocetPodleStavu.get(klic) ?? 0);

            return (
              <li key={klic}>
                <Link
                  href={klic === 'vse' ? '/admin/objednavky' : `/admin/objednavky?stav=${klic}`}
                  aria-current={jeAktivni ? 'page' : undefined}
                  className={`flex min-h-touch cursor-pointer items-center rounded-full px-4 text-xs font-semibold transition-all duration-200 ${
                    jeAktivni
                      ? 'bg-linda-cognac text-white shadow-neuOnDarkInset'
                      : 'bg-linda-cream text-linda-espresso shadow-neuSm hover:shadow-neu active:shadow-neuInsetSm'
                  }`}
                >
                  {klic === 'vse' ? 'Vše' : POPISKY_FILTRU[klic]} ({pocet})
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {objednavky.length === 0 ? (
        <div className="space-y-2 rounded-2xl bg-linda-cream p-10 text-center shadow-neu">
          <Package className="mx-auto h-8 w-8 text-linda-cognac opacity-60" aria-hidden="true" />
          <p className="text-xs text-linda-espresso/75">
            {celkemVeFiltru > 0
              ? 'Na této stránce už nic není.'
              : stav
                ? 'V tomto stavu není žádná objednávka.'
                : 'Zatím sem nedorazila žádná objednávka.'}
          </p>
          {celkemVeFiltru > 0 && (
            <Link href={odkazStranky(1)} className="text-xs font-semibold text-linda-cognac underline">
              Zpět na první stránku
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {objednavky.map((o) => {
            const stavPopis = STAV_OBJEDNAVKY[o.stav] ?? { text: o.stav, tridy: 'bg-linda-sandLight' };
            const kusu = o.items.reduce((s, i) => s + i.mnozstvi, 0);

            return (
              <li key={o.id}>
                <Link
                  href={`/admin/objednavky/${o.id}`}
                  className="flex flex-wrap items-center gap-4 rounded-2xl bg-linda-cream p-4 shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-semibold text-linda-espresso">
                      {o.cisloObjednavky}
                      {o._count.reklamace > 0 && (
                        <span className="rounded-full bg-linda-sandLight px-2 py-0.5 text-[10px] font-semibold text-red-800 shadow-neuInsetSm">
                          reklamace
                        </span>
                      )}
                    </p>
                    <p className="truncate text-[11px] text-linda-espresso/70">
                      {o.dodaciJmenoPrijmeni} · {formatDatum(o.createdAt)} · {kusu} ks
                      {o.cisloZasilky && ` · ${o.cisloZasilky}`}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-linda-espresso">
                      {Number(o.celkovaCena).toLocaleString('cs-CZ')} Kč
                    </p>
                    <p className="flex items-center justify-end gap-1 text-[11px] text-linda-espresso/70">
                      {o.stavPlatby === 'ZAPLACENO' && (
                        <Truck className="h-3 w-3 text-linda-sage" aria-hidden="true" />
                      )}
                      {STAV_PLATBY[o.stavPlatby] ?? o.stavPlatby}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${stavPopis.tridy}`}
                  >
                    {stavPopis.text}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Strankovani
        stranka={stranka}
        stranek={stranek}
        odkaz={odkazStranky}
        popisek="Stránkování objednávek"
      />
    </div>
  );
}
