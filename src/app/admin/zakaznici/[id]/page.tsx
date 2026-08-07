import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Mail, Phone } from 'lucide-react';
import { db } from '@/lib/db';
import { STAV_OBJEDNAVKY, formatDatum } from '@/lib/objednavka-popisky';

export const dynamic = 'force-dynamic';

/** Detail zákaznice – vše na jednom místě, jak žádá sekce 6.5. */
export default async function DetailZakaznicePage({ params }: { params: { id: string } }) {
  const zakaznice = await db.user.findUnique({
    where: { id: params.id },
    include: {
      addresses: true,
      orders: {
        orderBy: { createdAt: 'desc' },
        include: { items: { select: { mnozstvi: true } } },
      },
      favorites: { include: { product: { select: { nazev: true, slug: true } } } },
    },
  });

  if (!zakaznice) notFound();

  const zapocitatelne = zakaznice.orders.filter((o) => o.stav !== 'ZRUSENA' && o.stav !== 'VRACENA');
  const utrata = zapocitatelne.reduce((s, o) => s + Number(o.celkovaCena), 0);
  const anonymizovano = zakaznice.anonymizovanoAt !== null;

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      <div className="border-b border-linda-sand pb-6">
        <Link
          href="/admin/zakaznici"
          className="mb-1 flex w-fit items-center gap-1 text-xs font-semibold text-linda-cognac hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Zpět na zákaznice
        </Link>
        <h1 className="font-serif text-3xl text-linda-espresso sm:text-4xl">
          {anonymizovano ? 'Smazaný účet' : (zakaznice.jmeno ?? zakaznice.email)}
        </h1>
        <p className="mt-1 text-xs text-linda-espresso/70">
          Registrace {formatDatum(zakaznice.createdAt)} · {zakaznice.orders.length} objednávek ·
          útrata {utrata.toLocaleString('cs-CZ')} Kč
        </p>
      </div>

      {anonymizovano && (
        <p className="rounded-xl bg-linda-sandLight p-4 text-xs text-linda-espresso/85 shadow-neuInsetSm">
          Zákaznice požádala o smazání účtu. Osobní údaje byly anonymizovány, objednávky zůstávají
          jako účetní doklad bez vazby na konkrétní osobu.
        </p>
      )}

      {!anonymizovano && (
        <section className="space-y-2 rounded-2xl bg-linda-cream p-6 shadow-neu text-xs">
          <h2 className="font-serif text-xl text-linda-espresso">Kontakt</h2>
          <p className="flex items-center gap-2 text-linda-espresso">
            <Mail className="h-3.5 w-3.5 text-linda-cognac" aria-hidden="true" />
            <a href={`mailto:${zakaznice.email}`} className="text-linda-cognac underline">
              {zakaznice.email}
            </a>
          </p>
          {zakaznice.telefon && (
            <p className="flex items-center gap-2 text-linda-espresso">
              <Phone className="h-3.5 w-3.5 text-linda-cognac" aria-hidden="true" />
              {zakaznice.telefon}
            </p>
          )}
          <p className="text-linda-espresso/70">
            Newsletter: {zakaznice.newsletterSouhlas ? 'odebírá' : 'neodebírá'}
          </p>
        </section>
      )}

      <section className="space-y-3 rounded-2xl bg-linda-cream p-6 shadow-neu">
        <h2 className="font-serif text-xl text-linda-espresso">Objednávky</h2>

        {zakaznice.orders.length === 0 ? (
          <p className="text-xs text-linda-espresso/75">Zatím žádná objednávka.</p>
        ) : (
          <ul className="space-y-2">
            {zakaznice.orders.map((o) => {
              const popis = STAV_OBJEDNAVKY[o.stav] ?? { text: o.stav, tridy: 'bg-linda-sandLight' };
              const kusu = o.items.reduce((s, i) => s + i.mnozstvi, 0);

              return (
                <li key={o.id}>
                  <Link
                    href={`/admin/objednavky/${o.id}`}
                    className="flex items-center gap-3 rounded-xl bg-linda-cream p-3 text-xs shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-linda-espresso">{o.cisloObjednavky}</span>
                      <span className="block text-[11px] text-linda-espresso/70">
                        {formatDatum(o.createdAt)} · {kusu} ks
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold text-linda-espresso">
                      {Number(o.celkovaCena).toLocaleString('cs-CZ')} Kč
                    </span>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${popis.tridy}`}>
                      {popis.text}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {!anonymizovano && zakaznice.addresses.length > 0 && (
        <section className="space-y-2 rounded-2xl bg-linda-cream p-6 shadow-neu text-xs">
          <h2 className="font-serif text-xl text-linda-espresso">Uložené adresy</h2>
          {zakaznice.addresses.map((a) => (
            <p key={a.id} className="text-linda-espresso/85">
              {a.jmenoPrijmeni}, {a.ulice}, {a.psc} {a.mesto}
              {a.jeVychozi && <span className="ml-1 text-linda-cognac">(výchozí)</span>}
            </p>
          ))}
        </section>
      )}

      {!anonymizovano && zakaznice.favorites.length > 0 && (
        <section className="space-y-2 rounded-2xl bg-linda-cream p-6 shadow-neu text-xs">
          <h2 className="font-serif text-xl text-linda-espresso">Oblíbené</h2>
          <ul className="flex flex-wrap gap-2">
            {zakaznice.favorites.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/produkt/${f.product.slug}`}
                  className="flex min-h-touch items-center rounded-full bg-linda-sandLight px-3 text-linda-espresso shadow-neuInsetSm"
                >
                  {f.product.nazev}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
