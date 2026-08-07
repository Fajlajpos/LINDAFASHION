import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { MujUcet } from '@/components/shop/MujUcet';
import { overitUzivatele } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Můj účet | LINDA FASHION',
  robots: { index: false, follow: false },
};

export default async function MujUcetPage() {
  // Middleware sem nepřihlášeného nepustí; kontrolujeme i tady, a proti
  // databázi – účet mohl být mezitím smazaný nebo relace zneplatněná.
  const uzivatel = await overitUzivatele();
  if (!uzivatel) redirect('/prihlaseni?dalsi=/muj-ucet');

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <MujUcet email={uzivatel.email} jmeno={uzivatel.jmeno} />
    </div>
  );
}
