import React from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { db } from '@/lib/db';
import { formatDatum } from '@/lib/objednavka-popisky';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Zákazníci | Administrace LINDA FASHION',
};

/**
 * Zákaznická databáze (sekce 6.5).
 *
 * Do útraty se nezapočítávají zrušené a vrácené objednávky – jinak by číslo
 * ukazovalo peníze, které nikdy nedorazily.
 */
export default async function AdminZakazniciPage() {
  const zakaznici = await db.user.findMany({
    where: { role: 'CUSTOMER' },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      orders: {
        select: { celkovaCena: true, createdAt: true, stav: true },
      },
    },
  });

  const prehled = zakaznici.map((z) => {
    const zapocitatelne = z.orders.filter((o) => o.stav !== 'ZRUSENA' && o.stav !== 'VRACENA');
    const utrata = zapocitatelne.reduce((s, o) => s + Number(o.celkovaCena), 0);
    const posledni = z.orders.reduce<Date | null>(
      (nejnovejsi, o) => (!nejnovejsi || o.createdAt > nejnovejsi ? o.createdAt : nejnovejsi),
      null
    );

    return {
      id: z.id,
      email: z.email,
      jmeno: z.jmeno,
      telefon: z.telefon,
      newsletterSouhlas: z.newsletterSouhlas,
      anonymizovano: z.anonymizovanoAt !== null,
      registrace: z.createdAt,
      pocetObjednavek: z.orders.length,
      utrata,
      posledni,
    };
  });

  return (
    <div className="max-w-4xl space-y-8">
      <div className="border-b border-linda-sand pb-6">
        <h1 className="font-serif text-3xl text-linda-espresso sm:text-4xl">Zákaznice</h1>
        <p className="mt-1 text-xs text-linda-espresso/70">
          {prehled.length === 0 ? 'Zatím žádná registrace' : `${prehled.length} registrovaných účtů`}
        </p>
      </div>

      {prehled.length === 0 ? (
        <div className="space-y-2 rounded-2xl bg-linda-cream p-10 text-center shadow-neu">
          <Users className="mx-auto h-8 w-8 text-linda-cognac opacity-60" aria-hidden="true" />
          <p className="text-xs text-linda-espresso/75">
            Zatím se nikdo neregistroval. Objednávat lze i bez účtu, takže i tak vám můžou chodit
            objednávky.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {prehled.map((z) => (
            <li key={z.id}>
              <Link
                href={`/admin/zakaznici/${z.id}`}
                className="flex flex-wrap items-center gap-4 rounded-2xl bg-linda-cream p-4 shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-linda-espresso">
                    {z.anonymizovano ? 'Smazaný účet' : (z.jmeno ?? z.email)}
                  </p>
                  <p className="truncate text-[11px] text-linda-espresso/70">
                    {z.anonymizovano ? 'údaje anonymizovány (GDPR)' : z.email}
                    {' · registrace '}
                    {formatDatum(z.registrace)}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-linda-espresso">
                    {z.utrata.toLocaleString('cs-CZ')} Kč
                  </p>
                  <p className="text-[11px] text-linda-espresso/70">
                    {z.pocetObjednavek} objednávek
                    {z.posledni && ` · naposledy ${formatDatum(z.posledni)}`}
                  </p>
                </div>

                {z.newsletterSouhlas && !z.anonymizovano && (
                  <span className="shrink-0 rounded-full bg-linda-sageLight px-2.5 py-1 text-[10px] font-semibold text-linda-sage">
                    newsletter
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
