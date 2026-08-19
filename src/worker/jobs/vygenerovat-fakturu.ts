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
import { czkNaHalere, prodejniCena } from '../../lib/penize';

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

  const pdf = await vytvoritFakturuPdf({
    cisloObjednavky: objednavka.cisloObjednavky,
    datumVystaveni: objednavka.createdAt,
    dodavatel: {
      nazev: nastaveni?.nazevFirmy || 'LINDA FASHION',
      ico: nastaveni?.icoFirmy ?? null,
      dic: nastaveni?.dicFirmy ?? null,
      adresa: nastaveni?.adresaFirmy ?? null,
      email: nastaveni?.emailFirmy ?? null,
      // Snímek z objednávky, ne dnešní nastavení – doklad se zpětně nemění.
      jePlatceDph: objednavka.jePlatceDph,
      zapisVRejstriku: nastaveni?.zapisVRejstriku ?? null,
    },
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
