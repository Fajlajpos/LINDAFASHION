/**
 * Úloha: doklad k objednávce v PDF (sekce 14 zadání).
 *
 * Ukládá se do `storage/faktury/`, ne do `public/` – faktura obsahuje osobní
 * údaje a nesmí být dostupná komukoliv, kdo uhodne název souboru.
 */
import fs from 'fs/promises';
import path from 'path';
import { db } from '../../lib/db';
import { vytvoritFakturuPdf, type PolozkaFaktury } from '../../lib/pdf-invoice';
import { czkNaHalere } from '../../lib/penize';
import { precistSnimekDodavatele, snimekDodavatele } from '../../lib/dodavatel';

export interface UlohaFaktura {
  orderId: string;
}

export const SLOZKA_FAKTUR = path.join(process.cwd(), 'storage', 'faktury');

export async function vygenerovatFakturuUloha(data: UlohaFaktura): Promise<void> {
  const objednavka = await db.order.findUnique({
    where: { id: data.orderId },
    include: {
      user: { select: { email: true } },
      items: { include: { variant: { include: { product: true } } } },
    },
  });

  if (!objednavka) {
    console.warn(`[faktura] Objednávka ${data.orderId} už neexistuje.`);
    return;
  }

  const nastaveni = await db.settings.findUnique({ where: { id: 1 } });

  const polozky: PolozkaFaktury[] = objednavka.items.map((i) => ({
    nazev: `${i.variant.product.nazev} (${i.variant.velikost})`,
    mnozstvi: i.mnozstvi,
    cenaZaKusHaleru: czkNaHalere(i.cenaVDobeNakupu),
  }));

  /*
   * Rozpis se čte z objednávky, nedopočítává se.
   *
   * Dřív se sleva odvozovala z *aktuálního* `procentoSlevy` slevového kódu
   * a doprava byla zbytek do celkové ceny. Stačilo, aby majitelka u kódu
   * procento upravila, a faktura pro dávno uzavřenou objednávku vyšla jinak –
   * rozdíl se přitom tiše schoval do dopravy, protože ta se počítala jako
   * `celkem - (položky - sleva)`. Doklad se zpětně měnit nesmí.
   */
  const celkem = czkNaHalere(objednavka.celkovaCena);
  const zPoukazu = objednavka.castkaZGiftCard === null ? 0 : czkNaHalere(objednavka.castkaZGiftCard);
  const sleva = czkNaHalere(objednavka.slevaCastka);
  const doprava = czkNaHalere(objednavka.cenaDopravy);

  /*
   * --- Dodavatel: snímek z objednávky, ne dnešní nastavení ---
   *
   * Doklad se přegeneruje pokaždé, když se objednávka označí jako zaplacená.
   * Dřív si při tom sáhl do aktuálního `Settings`, takže po přestěhování nebo
   * změně IČO vyšla loňská faktura s dnešní hlavičkou – u `jePlatceDph` se ta
   * past hlídala, u identifikace dodavatele se na ni zapomnělo.
   *
   * `Settings` zbývá jako záloha pro objednávky založené dřív, než sloupec
   * existoval. Dopisovat jim snímek zpětně by znamenalo vymyslet si, co na
   * tehdejším dokladu stálo.
   */
  const dodavatel =
    precistSnimekDodavatele(objednavka.dodavatelSnapshot) ??
    (nastaveni ? snimekDodavatele(nastaveni) : null);

  /*
   * --- Platební údaje ---
   *
   * U nezaplaceného převodu patří na doklad číslo účtu a variabilní symbol.
   * Chyběly tam: byly jen na potvrzovací stránce, takže zákaznice, která
   * zavřela okno, neměla podle čeho zaplatit. Faktura je to, co jí zůstane.
   *
   * U zaplacené objednávky se nevytisknou – vyzývat k platbě něco, co je
   * uhrazené, je návod k druhé platbě.
   */
  const cekaNaPlatbu = objednavka.stavPlatby !== 'ZAPLACENO';
  const prevodem = objednavka.zpusobPlatby === 'bankovni_prevod';

  const pdf = await vytvoritFakturuPdf({
    cisloObjednavky: objednavka.cisloObjednavky,
    datumVystaveni: objednavka.createdAt,
    dodavatel: {
      nazev: dodavatel?.nazev || 'LINDA FASHION',
      ico: dodavatel?.ico ?? null,
      dic: dodavatel?.dic ?? null,
      adresa: dodavatel?.adresa ?? null,
      email: dodavatel?.email ?? null,
      // Snímek z objednávky, ne dnešní nastavení – doklad se zpětně nemění.
      jePlatceDph: objednavka.jePlatceDph,
      zapisVRejstriku: dodavatel?.zapisVRejstriku ?? null,
    },
    platebniUdaje:
      cekaNaPlatbu && prevodem
        ? {
            cisloUctu: process.env.BANK_ACCOUNT_NUMBER?.trim() || null,
            iban: process.env.BANK_IBAN?.trim() || null,
            // Stejný postup jako na potvrzovací stránce – jen číslice.
            variabilniSymbol: objednavka.cisloObjednavky.replace(/\D/g, ''),
            kUhradeHaleru: celkem - zPoukazu,
          }
        : null,
    odberatel: {
      jmeno: objednavka.dodaciJmenoPrijmeni,
      ulice: objednavka.dodaciUlice,
      mesto: objednavka.dodaciMesto,
      psc: objednavka.dodaciPsc,
      // Objednávka bez registrace nemá `user` – kontakt drží sama objednávka.
      email: objednavka.email ?? objednavka.user?.email ?? null,
    },
    polozky,
    dopravaHaleru: doprava,
    slevaHaleru: sleva,
    zPoukazuHaleru: zPoukazu,
    celkemHaleru: celkem,
    zpusobPlatby: objednavka.zpusobPlatby,
    sazbaDph: objednavka.sazbaDph,
    dphHaleru: objednavka.dphHaleru,
  });

  await fs.mkdir(SLOZKA_FAKTUR, { recursive: true });

  const soubor = path.join(SLOZKA_FAKTUR, `${objednavka.cisloObjednavky}.pdf`);
  await fs.writeFile(soubor, pdf);

  console.log(`[faktura] ${objednavka.cisloObjednavky} vygenerována (${Math.round(pdf.length / 1024)} kB).`);
}
