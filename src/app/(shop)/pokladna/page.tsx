import React from 'react';
import type { Metadata } from 'next';
import { PokladnaFormular, type MoznostDopravy } from '@/components/shop/PokladnaFormular';
import { getSession } from '@/lib/auth';
import { nacistNastaveni, popisDph, zpravaODovolene } from '@/lib/nastaveni';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pokladna | LINDA FASHION',
  robots: { index: false, follow: false },
};

/** Popisy dopravců; ceny se berou z administrace (sekce 6.8). */
const POPISY: Record<string, { nazev: string; popis: string; vyzadujeVydejniMisto: boolean }> = {
  zasilkovna: {
    nazev: 'Zásilkovna – výdejní místo nebo Z-BOX',
    popis: 'Doručení na vybrané výdejní místo nebo do samoobslužného Z-BOXu.',
    vyzadujeVydejniMisto: true,
  },
  ppl: {
    nazev: 'PPL – doručení na adresu',
    popis: 'Kurýr doveze zásilku až k vašim dveřím.',
    vyzadujeVydejniMisto: false,
  },
  ceska_posta: {
    nazev: 'Česká pošta – Balík Do ruky',
    popis: 'Doručení na uvedenou doručovací adresu.',
    vyzadujeVydejniMisto: false,
  },
};

export default async function PokladnaPage() {
  const [session, nastaveni] = await Promise.all([getSession(), nacistNastaveni()]);

  // Nabídneme jen dopravce, kterým majitelka nastavila cenu. Bez ceny
  // nemůžeme objednávku spočítat, takže metoda do pokladny nepatří.
  const ceny: Record<string, number | null> = {
    zasilkovna: nastaveni.cenaDopravyZasilkovna,
    ppl: nastaveni.cenaDopravyPPL,
    ceska_posta: nastaveni.cenaDopravyCeskaPosta,
  };

  const dopravy: MoznostDopravy[] = Object.entries(POPISY)
    .filter(([id]) => ceny[id] != null)
    .map(([id, popis]) => ({ id, cena: ceny[id] as number, ...popis }));

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="border-b border-linda-sand pb-6">
        <h1 className="font-serif text-4xl text-linda-espresso">Pokladna</h1>
      </div>

      <PokladnaFormular
        dopravy={dopravy}
        prahDopravaZdarma={nastaveni.prahDopravaZdarma}
        uzivatel={session ? { email: session.email, jmeno: session.jmeno } : null}
        objednavaniZablokovano={nastaveni.rezimDovolene && nastaveni.zablokovatObjednavky}
        zpravaODovolene={zpravaODovolene(nastaveni)}
        popisDph={popisDph(nastaveni)}
      />
    </div>
  );
}
