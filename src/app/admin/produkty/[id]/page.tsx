import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { db } from '@/lib/db';
import { FormularProduktu, type VariantaFormular } from '@/components/admin/FormularProduktu';
import { SpravaFotek, type AdminFotka } from '@/components/admin/SpravaFotek';
import { SmazatProdukt } from '@/components/admin/SmazatProdukt';

export const dynamic = 'force-dynamic';

interface Miry {
  obvodHrudniku?: string | null;
  obvodPasu?: string | null;
  obvodBoku?: string | null;
  delka?: string | null;
}

export default async function DetailProduktuPage({ params }: { params: { id: string } }) {
  const produkt = await db.product.findUnique({
    where: { id: params.id },
    include: {
      variants: { orderBy: { velikost: 'asc' } },
      images: { orderBy: { poradi: 'asc' } },
    },
  });

  if (!produkt) notFound();

  // Produkt, který se objevuje v objednávce, se nesmí fyzicky mazat –
  // rozbila by se historie (sekce 6.2). Tlačítko "Smazat" se pak vůbec nezobrazí.
  const vObjednavkach = await db.orderItem.count({
    where: { variant: { productId: produkt.id } },
  });

  const varianty: VariantaFormular[] = produkt.variants.map((v) => {
    const miry = (v.miry ?? {}) as Miry;
    return {
      klic: v.id,
      id: v.id,
      velikost: v.velikost,
      skladem: v.skladem,
      obvodHrudniku: miry.obvodHrudniku ?? '',
      obvodPasu: miry.obvodPasu ?? '',
      obvodBoku: miry.obvodBoku ?? '',
      delka: miry.delka ?? '',
    };
  });

  const fotky: AdminFotka[] = produkt.images.map((o) => ({
    id: o.id,
    url: o.url,
    urlMedium: o.urlMedium,
    urlThumb: o.urlThumb,
    sirka: o.sirka,
    vyska: o.vyska,
    altText: o.altText,
    poradi: o.poradi,
    jeHlavni: o.jeHlavni,
    stavZpracovani: o.stavZpracovani,
    chybaDuvod: o.chybaDuvod,
    createdAt: o.createdAt.toISOString(),
    zpracovaniOd: o.zpracovaniOd?.toISOString() ?? null,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-linda-sand pb-6">
        <div>
          <Link
            href="/admin/produkty"
            className="mb-1 flex w-fit items-center gap-1 text-xs font-semibold text-linda-cognac hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Zpět na seznam produktů
          </Link>
          <h1 className="font-serif text-3xl text-linda-espresso sm:text-4xl">{produkt.nazev}</h1>
          <p className="mt-1 text-xs text-linda-espresso/70">
            {produkt.aktivni ? 'Zveřejněno v e-shopu' : 'Koncept – zákaznice produkt nevidí'}
            {vObjednavkach > 0 && ` · v ${vObjednavkach} objednávkách`}
          </p>
        </div>

        {produkt.aktivni && (
          <Link
            href={`/produkt/${produkt.slug}`}
            target="_blank"
            className="flex min-h-touch items-center gap-1.5 rounded-full bg-linda-cream px-4 text-xs font-semibold text-linda-cognac shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
          >
            Zobrazit v e-shopu
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>

      {/* Fotky mají vlastní panel – nahrávají se rovnou k produktu a jejich
          stav zpracování se průběžně obnovuje (sekce 9). */}
      <SpravaFotek productId={produkt.id} pocatecniFotky={fotky} />

      <FormularProduktu
        skrytNahravaniFotek
        produkt={{
          id: produkt.id,
          nazev: produkt.nazev,
          popis: produkt.popis,
          categoryId: produkt.categoryId,
          cena: Number(produkt.cena),
          cenaPoSleve: produkt.cenaPoSleve === null ? null : Number(produkt.cenaPoSleve),
          znacka: produkt.znacka,
          material: produkt.material,
          udrzba: produkt.udrzba,
          sku: produkt.sku,
          aktivni: produkt.aktivni,
          doporuceny: produkt.doporuceny,
          jeDarkovyPoukaz: produkt.jeDarkovyPoukaz,
          varianty,
        }}
      />

      {vObjednavkach === 0 ? (
        <SmazatProdukt productId={produkt.id} nazev={produkt.nazev} />
      ) : (
        <p className="rounded-2xl bg-linda-sandLight p-4 text-xs text-linda-espresso/75 shadow-neuInsetSm">
          Tento produkt je součástí objednávek, proto ho nelze smazat – rozbila by se historie
          objednávek. Pokud ho už neprodáváte, odškrtněte výše „Zveřejnit v e-shopu“.
        </p>
      )}
    </div>
  );
}
