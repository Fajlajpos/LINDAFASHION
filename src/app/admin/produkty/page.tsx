import Link from 'next/link';
import Image from 'next/image';
import { AlertCircle, Gift, ImageOff, Loader2, Plus, Sparkles } from 'lucide-react';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Správa produktů | Administrace LINDA FASHION',
};

export default async function AdminProduktyPage() {
  const produkty = await db.product.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      category: { select: { nazev: true } },
      variants: { select: { skladem: true } },
      images: {
        orderBy: { poradi: 'asc' },
        select: { urlThumb: true, altText: true, jeHlavni: true, stavZpracovani: true },
      },
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-linda-sand pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-serif text-3xl text-linda-espresso sm:text-4xl">Správa produktů</h1>
          <p className="mt-1 text-xs text-linda-espresso/70">
            {produkty.length === 0
              ? 'Zatím tu není žádný produkt'
              : `${produkty.length} ${produkty.length === 1 ? 'produkt' : produkty.length < 5 ? 'produkty' : 'produktů'} v katalogu`}
          </p>
        </div>

        <Link
          href="/admin/produkty/novy"
          className="flex min-h-touch cursor-pointer items-center gap-1.5 rounded-full bg-linda-cognac px-5 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Přidat nový produkt
        </Link>
      </div>

      {produkty.length === 0 ? (
        <div className="space-y-3 rounded-2xl bg-linda-cream p-10 text-center shadow-neu">
          <Sparkles className="mx-auto h-8 w-8 text-linda-cognac opacity-60" aria-hidden="true" />
          <h2 className="font-serif text-xl text-linda-espresso">Katalog je zatím prázdný</h2>
          <p className="mx-auto max-w-md text-xs text-linda-espresso/75">
            Přidejte první kousek. Fotky stačí nahrát v původní velikosti – zmenšení
            a převod do WebP proběhne na pozadí.
          </p>
          <Link
            href="/admin/produkty/novy"
            className="mx-auto flex w-fit min-h-touch cursor-pointer items-center gap-1.5 rounded-full bg-linda-cognac px-5 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Přidat první produkt
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {produkty.map((produkt) => {
            const sklad = produkt.variants.reduce((s, v) => s + v.skladem, 0);
            const hlavni = produkt.images.find((o) => o.jeHlavni) ?? produkt.images[0];
            const zpracovavaSe = produkt.images.some(
              (o) => o.stavZpracovani === 'CEKA' || o.stavZpracovani === 'ZPRACOVAVA_SE'
            );

            return (
              <li key={produkt.id}>
                <Link
                  href={`/admin/produkty/${produkt.id}`}
                  className="flex cursor-pointer items-center gap-4 rounded-2xl bg-linda-cream p-4 shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-linda-sandLight shadow-neuInsetSm">
                    {hlavni?.urlThumb ? (
                      <Image
                        src={hlavni.urlThumb}
                        alt={hlavni.altText ?? produkt.nazev}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center">
                        {zpracovavaSe ? (
                          <Loader2 className="h-5 w-5 animate-spin text-linda-cognac" aria-hidden="true" />
                        ) : (
                          <ImageOff className="h-5 w-5 text-linda-espresso/40" aria-hidden="true" />
                        )}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-linda-espresso">
                      {produkt.jeDarkovyPoukaz && (
                        <Gift className="h-3.5 w-3.5 shrink-0 text-linda-cognac" aria-hidden="true" />
                      )}
                      {produkt.nazev}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-linda-espresso/70">
                      {produkt.category.nazev}
                      {produkt.sku && ` · ${produkt.sku}`}
                      {zpracovavaSe && ' · fotky se zpracovávají'}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-linda-espresso">
                      {Number(produkt.cenaPoSleve ?? produkt.cena).toLocaleString('cs-CZ')} Kč
                    </p>
                    <p
                      className={`mt-0.5 flex items-center justify-end gap-1 text-[11px] ${
                        sklad === 0 ? 'font-semibold text-red-800' : 'text-linda-espresso/70'
                      }`}
                    >
                      {sklad === 0 && <AlertCircle className="h-3 w-3" aria-hidden="true" />}
                      {sklad === 0 ? 'Vyprodáno' : `${sklad} ks skladem`}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      produkt.aktivni
                        ? 'bg-linda-sageLight text-linda-sage'
                        : 'bg-linda-sandLight text-linda-espresso/75 shadow-neuInsetSm'
                    }`}
                  >
                    {produkt.aktivni ? 'Zveřejněno' : 'Koncept'}
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
