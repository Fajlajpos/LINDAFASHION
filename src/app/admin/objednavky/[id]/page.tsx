import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, User } from 'lucide-react';
import { db } from '@/lib/db';
import { SpravaObjednavky } from '@/components/admin/SpravaObjednavky';
import {
  NAZEV_DOPRAVY,
  NAZEV_PLATBY,
  STAV_OBJEDNAVKY,
  STAV_PLATBY,
  STAV_REKLAMACE,
  formatDatumCas,
} from '@/lib/objednavka-popisky';

export const dynamic = 'force-dynamic';

export default async function DetailObjednavkyPage({ params }: { params: { id: string } }) {
  const objednavka = await db.order.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, email: true, jmeno: true } },
      discountCode: { select: { kod: true, procentoSlevy: true } },
      giftCard: { select: { kod: true } },
      items: {
        include: {
          variant: { include: { product: { select: { nazev: true, slug: true } } } },
        },
      },
      reklamace: {
        orderBy: { datumPrijeti: 'desc' },
        include: { orderItem: { include: { variant: { include: { product: true } } } } },
      },
    },
  });

  if (!objednavka) notFound();

  const stavPopis = STAV_OBJEDNAVKY[objednavka.stav] ?? {
    text: objednavka.stav,
    tridy: 'bg-linda-sandLight',
  };

  const zPoukazu = objednavka.castkaZGiftCard === null ? 0 : Number(objednavka.castkaZGiftCard);

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-linda-sand pb-6">
        <div>
          <Link
            href="/admin/objednavky"
            className="mb-1 flex w-fit items-center gap-1 text-xs font-semibold text-linda-cognac hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Zpět na objednávky
          </Link>
          <h1 className="font-serif text-3xl text-linda-espresso sm:text-4xl">
            {objednavka.cisloObjednavky}
          </h1>
          <p className="mt-1 text-xs text-linda-espresso/70">
            {formatDatumCas(objednavka.createdAt)} · {STAV_PLATBY[objednavka.stavPlatby] ?? objednavka.stavPlatby}
            {objednavka.zrusil && ` · zrušila ${objednavka.zrusil === 'ADMIN' ? 'administrace' : 'zákaznice'}`}
          </p>
        </div>

        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${stavPopis.tridy}`}>
          {stavPopis.text}
        </span>
      </div>

      {/* Zákaznice a doručení */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section className="space-y-2 rounded-2xl bg-linda-cream p-6 shadow-neu">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-linda-espresso">
            <User className="h-3.5 w-3.5 text-linda-cognac" aria-hidden="true" />
            Zákaznice
          </h2>
          <p className="text-sm text-linda-espresso">{objednavka.dodaciJmenoPrijmeni}</p>
          {objednavka.user ? (
            <Link
              href={`/admin/zakaznici/${objednavka.user.id}`}
              className="block text-xs text-linda-cognac underline"
            >
              {objednavka.user.email}
            </Link>
          ) : (
            <p className="text-xs text-linda-espresso/70">Objednávka bez registrace</p>
          )}
          {objednavka.dodaciTelefon && (
            <p className="text-xs text-linda-espresso/70">{objednavka.dodaciTelefon}</p>
          )}
        </section>

        <section className="space-y-2 rounded-2xl bg-linda-cream p-6 shadow-neu">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-linda-espresso">
            <MapPin className="h-3.5 w-3.5 text-linda-cognac" aria-hidden="true" />
            Doručení
          </h2>
          <p className="text-sm text-linda-espresso">
            {NAZEV_DOPRAVY[objednavka.zpusobDopravy] ?? objednavka.zpusobDopravy}
          </p>
          {objednavka.vydejniMistoNazev && (
            <p className="text-xs text-linda-espresso/70">{objednavka.vydejniMistoNazev}</p>
          )}
          <p className="text-xs text-linda-espresso/70">
            {objednavka.dodaciUlice}, {objednavka.dodaciPsc} {objednavka.dodaciMesto}
          </p>
          <p className="text-xs text-linda-espresso/70">
            {NAZEV_PLATBY[objednavka.zpusobPlatby] ?? objednavka.zpusobPlatby}
          </p>
        </section>
      </div>

      {/* Položky */}
      <section className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu">
        <h2 className="font-serif text-xl text-linda-espresso">Položky</h2>

        <ul className="space-y-2 text-xs">
          {objednavka.items.map((polozka) => (
            <li key={polozka.id} className="flex justify-between gap-3 border-b border-linda-sand/40 py-2">
              <Link
                href={`/produkt/${polozka.variant.product.slug}`}
                className="text-linda-espresso hover:text-linda-cognac hover:underline"
              >
                {polozka.variant.product.nazev}
                <span className="text-linda-espresso/70">
                  {' '}
                  · {polozka.variant.velikost} · {polozka.mnozstvi} ks
                </span>
              </Link>
              <span className="shrink-0 font-semibold text-linda-espresso">
                {(Number(polozka.cenaVDobeNakupu) * polozka.mnozstvi).toLocaleString('cs-CZ')} Kč
              </span>
            </li>
          ))}
        </ul>

        <dl className="space-y-1 text-xs">
          {objednavka.discountCode && (
            <div className="flex justify-between text-linda-sage">
              <dt>
                Slevový kód {objednavka.discountCode.kod} (−{objednavka.discountCode.procentoSlevy} %)
              </dt>
              <dd>uplatněn</dd>
            </div>
          )}
          {zPoukazu > 0 && (
            <div className="flex justify-between text-linda-sage">
              <dt>Uhrazeno poukazem {objednavka.giftCard?.kod}</dt>
              <dd>−{zPoukazu.toLocaleString('cs-CZ')} Kč</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-linda-sand/60 pt-2 text-sm font-semibold text-linda-espresso">
            <dt>Celkem</dt>
            <dd>{Number(objednavka.celkovaCena).toLocaleString('cs-CZ')} Kč</dd>
          </div>
        </dl>

        {objednavka.poznamka && (
          <p className="rounded-xl bg-linda-sandLight p-3 text-xs text-linda-espresso/85 shadow-neuInsetSm">
            <strong>Poznámka zákaznice:</strong> {objednavka.poznamka}
          </p>
        )}
      </section>

      {/* Reklamace u této objednávky (sekce 6.10) */}
      {objednavka.reklamace.length > 0 && (
        <section className="space-y-3 rounded-2xl bg-linda-cream p-6 shadow-neu">
          <h2 className="font-serif text-xl text-linda-espresso">Reklamace a vrácení</h2>

          <ul className="space-y-2">
            {objednavka.reklamace.map((r) => {
              const popis = STAV_REKLAMACE[r.stav] ?? { text: r.stav, tridy: 'bg-linda-sandLight' };

              return (
                <li key={r.id} className="flex items-center gap-3 rounded-xl bg-linda-cream p-3 shadow-neuSm">
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="font-semibold text-linda-espresso">
                      {r.typ === 'VRACENI' ? 'Vrácení' : 'Reklamace'}
                      {r.orderItem && ` · ${r.orderItem.variant.product.nazev}`}
                    </p>
                    {r.duvod && <p className="text-linda-espresso/70">{r.duvod}</p>}
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${popis.tridy}`}>
                    {popis.text}
                  </span>
                </li>
              );
            })}
          </ul>

          <Link href="/admin/reklamace" className="block text-xs font-semibold text-linda-cognac underline">
            Spravovat v přehledu reklamací
          </Link>
        </section>
      )}

      <SpravaObjednavky
        orderId={objednavka.id}
        stav={objednavka.stav}
        stavPlatby={objednavka.stavPlatby}
        cisloZasilky={objednavka.cisloZasilky}
        polozky={objednavka.items.map((i) => ({
          id: i.id,
          popis: `${i.variant.product.nazev} (${i.variant.velikost}) · ${i.mnozstvi} ks`,
        }))}
      />
    </div>
  );
}
