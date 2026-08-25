import React from 'react';
import type { Metadata } from 'next';
import { PokladnaFormular, type MoznostDopravy } from '@/components/shop/PokladnaFormular';
import { jeNastaveno } from '@/lib/gopay';
import { overitUzivatele } from '@/lib/auth';
import { nacistAdresy } from '@/lib/adresy';
import { nacistNastaveni, popisDodaciLhuty, popisDph, zpravaODovolene } from '@/lib/nastaveni';
import { dostupneDopravy } from '@/lib/shipping';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pokladna | LINDA FASHION',
  robots: { index: false, follow: false },
};

export default async function PokladnaPage() {
  /*
   * Ověření proti databázi, ne jen podle tokenu: z účtu se tu předvyplňuje
   * doručovací adresa, takže nesmí jít o účet, který mezitím zmizel nebo byl
   * odhlášen ze všech zařízení.
   */
  const [uzivatel, nastaveni] = await Promise.all([overitUzivatele(), nacistNastaveni()]);

  // Výchozí doručovací adresa z účtu (sekce 7). Do téhle chvíle se pokladna
  // ptala na adresu při každém nákupu znovu, přestože ji zákaznice měla uloženou.
  const adresy = uzivatel ? await nacistAdresy(uzivatel.id) : [];
  const vychoziAdresa = adresy.find((a) => a.typ === 'DODACI' && a.jeVychozi) ?? null;

  // Nabídneme jen dopravce, kterým majitelka nastavila cenu. Bez ceny
  // nemůžeme objednávku spočítat, takže metoda do pokladny nepatří.
  // Seznam i popisy jsou sdílené se stránkou „Doprava a platba" – dvě kopie
  // se rozešly v názvech dopravců a informační stránka slibovala jiné ceny,
  // než pokladna účtovala.
  const dopravy: MoznostDopravy[] = dostupneDopravy(nastaveni);

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="border-b border-linda-sand pb-6">
        <h1 className="font-serif text-4xl text-linda-espresso">Pokladna</h1>
      </div>

      <PokladnaFormular
        dopravy={dopravy}
        prahDopravaZdarma={nastaveni.prahDopravaZdarma}
        uzivatel={
          uzivatel
            ? { email: uzivatel.email, jmeno: uzivatel.jmeno, telefon: uzivatel.telefon }
            : null
        }
        vychoziAdresa={vychoziAdresa}
        objednavaniZablokovano={nastaveni.rezimDovolene && nastaveni.zablokovatObjednavky}
        zpravaODovolene={zpravaODovolene(nastaveni)}
        popisDph={popisDph(nastaveni)}
        dodaciLhuta={popisDodaciLhuty(nastaveni)}
        platbaKartouDostupna={jeNastaveno()}
      />
    </div>
  );
}
