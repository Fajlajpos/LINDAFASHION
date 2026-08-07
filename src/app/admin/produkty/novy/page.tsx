import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { FormularProduktu } from '@/components/admin/FormularProduktu';

export const metadata = {
  title: 'Přidat nový produkt | Administrace LINDA FASHION',
};

export default function NovyProduktPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      <div className="border-b border-linda-sand pb-6">
        <Link
          href="/admin/produkty"
          className="mb-1 flex w-fit items-center gap-1 text-xs font-semibold text-linda-cognac hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Zpět na seznam produktů
        </Link>
        <h1 className="font-serif text-3xl text-linda-espresso sm:text-4xl">Přidat nový produkt</h1>
      </div>

      <FormularProduktu />
    </div>
  );
}
