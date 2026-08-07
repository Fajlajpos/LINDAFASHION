import React from 'react';
import Link from 'next/link';
import { Package, Truck } from 'lucide-react';
import { db } from '@/lib/db';
import { STAV_OBJEDNAVKY, STAV_PLATBY, formatDatum } from '@/lib/objednavka-popisky';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Objednávky | Administrace LINDA FASHION',
};

const FILTRY = [
  { klic: 'vse', popisek: 'Vše' },
  { klic: 'NOVA', popisek: 'Nové' },
  { klic: 'ZPRACOVAVA_SE', popisek: 'Zpracovávají se' },
  { klic: 'EXPEDOVANA', popisek: 'Expedované' },
  { klic: 'DORUCENA', popisek: 'Doručené' },
  { klic: 'ZRUSENA', popisek: 'Zrušené' },
];

interface Props {
  searchParams: { stav?: string };
}

export default async function AdminObjednavkyPage({ searchParams }: Props) {
  const stav = searchParams.stav && searchParams.stav !== 'vse' ? searchParams.stav : null;

  const kde: Prisma.OrderWhereInput = stav ? { stav: stav as Prisma.EnumOrderStatusFilter['equals'] } : {};

  const [objednavky, pocty] = await Promise.all([
    db.order.findMany({
      where: kde,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        items: { select: { mnozstvi: true } },
        _count: { select: { reklamace: true } },
      },
    }),
    db.order.groupBy({ by: ['stav'], _count: true }),
  ]);

  const pocetPodleStavu = new Map(pocty.map((p) => [String(p.stav), p._count]));
  const celkem = pocty.reduce((s, p) => s + p._count, 0);

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
          {FILTRY.map((f) => {
            const jeAktivni = (searchParams.stav ?? 'vse') === f.klic;
            const pocet = f.klic === 'vse' ? celkem : (pocetPodleStavu.get(f.klic) ?? 0);

            return (
              <li key={f.klic}>
                <Link
                  href={f.klic === 'vse' ? '/admin/objednavky' : `/admin/objednavky?stav=${f.klic}`}
                  aria-current={jeAktivni ? 'page' : undefined}
                  className={`flex min-h-touch cursor-pointer items-center rounded-full px-4 text-xs font-semibold transition-all duration-200 ${
                    jeAktivni
                      ? 'bg-linda-cognac text-white shadow-neuOnDarkInset'
                      : 'bg-linda-cream text-linda-espresso shadow-neuSm hover:shadow-neu active:shadow-neuInsetSm'
                  }`}
                >
                  {f.popisek} ({pocet})
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
            {stav ? 'V tomto stavu není žádná objednávka.' : 'Zatím sem nedorazila žádná objednávka.'}
          </p>
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
    </div>
  );
}
