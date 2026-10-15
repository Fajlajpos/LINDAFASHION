import React from 'react';
import type { Metadata } from 'next';
import { PokladnaProvider, type DataPokladny } from '@/lib/pokladna-kontext';
import { AktivniKrok } from '@/components/shop/pokladna/AktivniKrok';
import { jeNastaveno } from '@/lib/gopay';
import { klicWidgetu } from '@/lib/packeta';
import { overitUzivatele } from '@/lib/auth';
import { nacistAdresy } from '@/lib/adresy';
import { nacistNastaveni, popisDodaciLhuty, popisDph, zpravaODovolene } from '@/lib/nastaveni';
import { nacistZneni } from '@/lib/pravni-dokumenty';
import { dostupneDopravy } from '@/lib/shipping';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Společný rám kroků 2–4 pokladny.
 *
 * Data se načtou jednou tady, ne v každém kroku: layout se při přechodu mezi
 * kroky nepřemontuje, takže i `PokladnaProvider` se stavem rozpracované
 * objednávky přežije cestu tam i zpátky. Potvrzení objednávky leží mimo tuhle
 * skupinu schválně – krokovač ani rozpracovaný stav tam nepatří.
 */
export default async function LayoutKrokuPokladny({ children }: { children: React.ReactNode }) {
  /*
   * Ověření proti databázi, ne jen podle tokenu: z účtu se tu předvyplňuje
   * doručovací adresa, takže nesmí jít o účet, který mezitím zmizel nebo byl
   * odhlášen ze všech zařízení.
   */
  const [uzivatel, nastaveni, podminky] = await Promise.all([
    overitUzivatele(),
    nacistNastaveni(),
    nacistZneni('obchodni-podminky'),
  ]);

  const adresy = uzivatel ? await nacistAdresy(uzivatel.id) : [];
  const vychozi = adresy.find((a) => a.typ === 'DODACI' && a.jeVychozi) ?? null;

  const data: DataPokladny = {
    // Jen dopravci s cenou z administrace – seznam i popisy sdílí se stránkou
    // „Doprava a platba", aby web nesliboval jiné ceny, než pokladna účtuje.
    dopravy: dostupneDopravy(nastaveni),
    prahDopravaZdarma: nastaveni.prahDopravaZdarma,
    uzivatel: uzivatel
      ? { email: uzivatel.email, jmeno: uzivatel.jmeno, telefon: uzivatel.telefon }
      : null,
    vychoziAdresa: vychozi
      ? {
          jmenoPrijmeni: vychozi.jmenoPrijmeni,
          ulice: vychozi.ulice,
          mesto: vychozi.mesto,
          psc: vychozi.psc,
          telefon: vychozi.telefon,
        }
      : null,
    objednavaniZablokovano: nastaveni.rezimDovolene && nastaveni.zablokovatObjednavky,
    zpravaODovolene: zpravaODovolene(nastaveni),
    popisDph: popisDph(nastaveni),
    dodaciLhuta: popisDodaciLhuty(nastaveni),
    platbaKartouDostupna: jeNastaveno(),
    packetaKlicWidgetu: klicWidgetu(),
    /*
     * Odkaz na znění, se kterým zákaznice právě souhlasí. Verze v adrese jen
     * tehdy, když je znění uložené – záložní text z kódu žádnou dohledatelnou
     * verzi nemá.
     */
    odkazPodminky: podminky.zDatabaze
      ? `/obchodni-podminky?verze=${encodeURIComponent(podminky.verze)}`
      : '/obchodni-podminky',
    prodavajici: {
      nazev: nastaveni.nazevFirmy,
      ico: nastaveni.icoFirmy,
      adresa: nastaveni.adresaFirmy,
    },
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <div className="space-y-5 border-b border-linda-sand pb-6">
        <AktivniKrok />
      </div>

      <PokladnaProvider data={data}>{children}</PokladnaProvider>
    </div>
  );
}
