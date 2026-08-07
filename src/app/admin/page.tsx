import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Package,
  Plus,
  ShoppingBag,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { db } from '@/lib/db';
import { STAV_OBJEDNAVKY, formatDatum } from '@/lib/objednavka-popisky';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Přehled | Administrace LINDA FASHION',
};

/** Kolik kusů už považujeme za docházející zásobu. */
const PRAH_DOCHAZI = 2;

const Dlazdice: React.FC<{
  nadpis: string;
  hodnota: string;
  popis?: string;
  href: string;
  Ikona: typeof Package;
  zvyraznit?: boolean;
}> = ({ nadpis, hodnota, popis, href, Ikona, zvyraznit }) => (
  <Link
    href={href}
    className="flex items-start gap-3 rounded-2xl bg-linda-cream p-5 shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
  >
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
        zvyraznit ? 'bg-linda-cognac text-white shadow-neuDark' : 'bg-linda-cream shadow-neuSm'
      }`}
    >
      <Ikona className={`h-5 w-5 ${zvyraznit ? '' : 'text-linda-cognac'}`} aria-hidden="true" />
    </span>
    <span className="min-w-0">
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-linda-espresso/70">
        {nadpis}
      </span>
      <span className="block text-xl font-semibold text-linda-espresso">{hodnota}</span>
      {popis && <span className="block text-[11px] text-linda-espresso/70">{popis}</span>}
    </span>
  </Link>
);

export default async function AdminDashboardPage() {
  const zacatekMesice = new Date();
  zacatekMesice.setDate(1);
  zacatekMesice.setHours(0, 0, 0, 0);

  const pred30dny = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    novychObjednavek,
    trzbyMesic,
    dochazejiciZasoba,
    cekajiciReklamace,
    novychZakaznic,
    posledniObjednavky,
  ] = await Promise.all([
    db.order.count({ where: { stav: 'NOVA' } }),

    // Do tržeb se nezapočítávají zrušené a vrácené objednávky.
    db.order.aggregate({
      _sum: { celkovaCena: true },
      where: {
        createdAt: { gte: zacatekMesice },
        stav: { notIn: ['ZRUSENA', 'VRACENA'] },
      },
    }),

    db.productVariant.findMany({
      where: { skladem: { lte: PRAH_DOCHAZI }, product: { aktivni: true } },
      orderBy: { skladem: 'asc' },
      take: 8,
      include: { product: { select: { id: true, nazev: true } } },
    }),

    db.reklamace.count({ where: { stav: { in: ['PRIJATA', 'RESI_SE'] } } }),

    db.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: pred30dny } } }),

    db.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        cisloObjednavky: true,
        stav: true,
        celkovaCena: true,
        createdAt: true,
        dodaciJmenoPrijmeni: true,
      },
    }),
  ]);

  const trzby = Number(trzbyMesic._sum.celkovaCena ?? 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-linda-sand pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-serif text-3xl text-linda-espresso sm:text-4xl">Přehled</h1>
          <p className="mt-1 text-xs text-linda-espresso/70">Co se v obchodě právě děje</p>
        </div>

        <Link
          href="/admin/produkty/novy"
          className="flex min-h-touch cursor-pointer items-center gap-1.5 rounded-full bg-linda-cognac px-5 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Přidat produkt
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Dlazdice
          nadpis="Nové objednávky"
          hodnota={String(novychObjednavek)}
          popis={novychObjednavek > 0 ? 'čekají na zpracování' : 'vše vyřízeno'}
          href="/admin/objednavky?stav=NOVA"
          Ikona={ShoppingBag}
          zvyraznit={novychObjednavek > 0}
        />
        <Dlazdice
          nadpis="Tržby tento měsíc"
          hodnota={`${trzby.toLocaleString('cs-CZ')} Kč`}
          popis="bez zrušených a vrácených"
          href="/admin/objednavky"
          Ikona={Banknote}
        />
        <Dlazdice
          nadpis="Reklamace"
          hodnota={String(cekajiciReklamace)}
          popis={cekajiciReklamace > 0 ? 'čeká na vyřízení' : 'nic nevisí'}
          href="/admin/reklamace"
          Ikona={AlertTriangle}
          zvyraznit={cekajiciReklamace > 0}
        />
        <Dlazdice
          nadpis="Nové zákaznice"
          hodnota={String(novychZakaznic)}
          popis="za posledních 30 dní"
          href="/admin/zakaznici"
          Ikona={Users}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Poslední objednávky */}
        <section className="space-y-3 rounded-2xl bg-linda-cream p-6 shadow-neu">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-xl text-linda-espresso">Poslední objednávky</h2>
            <Link
              href="/admin/objednavky"
              className="flex items-center gap-1 text-xs font-semibold text-linda-cognac hover:underline"
            >
              Vše
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>

          {posledniObjednavky.length === 0 ? (
            <p className="text-xs text-linda-espresso/75">Zatím žádná objednávka.</p>
          ) : (
            <ul className="space-y-2">
              {posledniObjednavky.map((o) => {
                const popis = STAV_OBJEDNAVKY[o.stav] ?? { text: o.stav, tridy: 'bg-linda-sandLight' };

                return (
                  <li key={o.id}>
                    <Link
                      href={`/admin/objednavky/${o.id}`}
                      className="flex items-center gap-3 rounded-xl bg-linda-cream p-3 text-xs shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-linda-espresso">{o.cisloObjednavky}</span>
                        <span className="block truncate text-[11px] text-linda-espresso/70">
                          {o.dodaciJmenoPrijmeni} · {formatDatum(o.createdAt)}
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold text-linda-espresso">
                        {Number(o.celkovaCena).toLocaleString('cs-CZ')} Kč
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${popis.tridy}`}
                      >
                        {popis.text}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Docházející sklad */}
        <section className="space-y-3 rounded-2xl bg-linda-cream p-6 shadow-neu">
          <h2 className="flex items-center gap-2 font-serif text-xl text-linda-espresso">
            <TriangleAlert className="h-4 w-4 text-linda-cognac" aria-hidden="true" />
            Dochází skladem
          </h2>

          {dochazejiciZasoba.length === 0 ? (
            <p className="text-xs text-linda-espresso/75">Všechny velikosti máte dostatečně naskladněné.</p>
          ) : (
            <ul className="space-y-2">
              {dochazejiciZasoba.map((v) => (
                <li key={v.id}>
                  <Link
                    href={`/admin/produkty/${v.product.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl bg-linda-cream p-3 text-xs shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
                  >
                    <span className="min-w-0 truncate text-linda-espresso">
                      {v.product.nazev}
                      <span className="text-linda-espresso/70"> · {v.velikost}</span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        v.skladem === 0
                          ? 'bg-linda-sandLight text-red-800 shadow-neuInsetSm'
                          : 'bg-linda-cognac text-white'
                      }`}
                    >
                      {v.skladem === 0 ? 'vyprodáno' : `${v.skladem} ks`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
