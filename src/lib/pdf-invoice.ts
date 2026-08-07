/**
 * Generování dokladu k objednávce v PDF (sekce 14 zadání).
 *
 * Běží **jen ve workeru** – tvorba PDF je stejně jako Sharp práce navíc,
 * kterou nemá dělat kontejner obsluhující zákaznice.
 *
 * Písmo: standardní fonty v PDF (Helvetica) používají kódování WinAnsi, ve
 * kterém česká diakritika (ř, š, ž, č, ů) chybí – na faktuře by se z nich
 * staly otazníky. Proto vkládáme DejaVu Sans, který Latin Extended pokrývá.
 *
 * Bez aliasů @/ – kompiluje se do buildu workeru.
 */
import fs from 'fs/promises';
import path from 'path';
import PDFDocument from 'pdfkit';
import { halereNaCzk, type Halere } from './penize';

export interface PolozkaFaktury {
  nazev: string;
  mnozstvi: number;
  cenaZaKusHaleru: Halere;
}

export interface PodkladFaktury {
  cisloObjednavky: string;
  datumVystaveni: Date;

  dodavatel: {
    nazev: string;
    ico: string | null;
    dic: string | null;
    adresa: string | null;
    email: string | null;
    jePlatceDph: boolean;
  };

  odberatel: {
    jmeno: string;
    ulice: string;
    mesto: string;
    psc: string;
    email: string | null;
  };

  polozky: PolozkaFaktury[];
  dopravaHaleru: Halere;
  slevaHaleru: Halere;
  zPoukazuHaleru: Halere;
  celkemHaleru: Halere;
  zpusobPlatby: string;
}

const SLOZKA_FONTU = path.join(process.cwd(), 'assets', 'fonts');

/** Fonty načteme jednou a držíme v paměti – u každé faktury by to bylo zbytečné IO. */
let fontyCache: { bezny: Buffer; tucny: Buffer } | null = null;

async function nacistFonty() {
  if (fontyCache) return fontyCache;

  fontyCache = {
    bezny: await fs.readFile(path.join(SLOZKA_FONTU, 'DejaVuSans.ttf')),
    tucny: await fs.readFile(path.join(SLOZKA_FONTU, 'DejaVuSans-Bold.ttf')),
  };

  return fontyCache;
}

function castka(halere: Halere): string {
  return `${halereNaCzk(halere).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč`;
}

const NAZEV_PLATBY: Record<string, string> = {
  bankovni_prevod: 'Bankovní převod',
  gopay: 'Platební karta',
};

/** Vrátí hotové PDF jako buffer. Uložení řeší volající. */
export async function vytvoritFakturuPdf(podklad: PodkladFaktury): Promise<Buffer> {
  const fonty = await nacistFonty();

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const casti: Buffer[] = [];

  doc.on('data', (kus: Buffer) => casti.push(kus));

  doc.registerFont('bezny', fonty.bezny);
  doc.registerFont('tucny', fonty.tucny);
  doc.font('bezny');

  const ESPRESSO = '#2B2019';
  const COGNAC = '#7A4B32';
  const SEDA = '#6B5D52';

  // --- Hlavička ---
  doc.font('tucny').fontSize(20).fillColor(ESPRESSO).text('LINDA FASHION', 50, 50);
  doc.font('bezny').fontSize(9).fillColor(COGNAC).text('MODA ITALIANA', 50, 74);

  doc
    .font('tucny')
    .fontSize(14)
    .fillColor(ESPRESSO)
    .text(`Doklad č. ${podklad.cisloObjednavky}`, 50, 50, { align: 'right' });

  doc
    .font('bezny')
    .fontSize(9)
    .fillColor(SEDA)
    .text(`Vystaveno ${podklad.datumVystaveni.toLocaleDateString('cs-CZ')}`, 50, 70, {
      align: 'right',
    });

  doc.moveTo(50, 100).lineTo(545, 100).strokeColor(COGNAC).lineWidth(1).stroke();

  // --- Dodavatel / odběratel ---
  let y = 120;

  doc.font('tucny').fontSize(9).fillColor(ESPRESSO).text('DODAVATEL', 50, y);
  doc.font('tucny').text('ODBĚRATEL', 320, y);

  y += 16;
  doc.font('bezny').fontSize(10).fillColor(ESPRESSO);

  const dodavatelRadky = [
    podklad.dodavatel.nazev,
    podklad.dodavatel.adresa,
    podklad.dodavatel.ico ? `IČO: ${podklad.dodavatel.ico}` : null,
    podklad.dodavatel.dic ? `DIČ: ${podklad.dodavatel.dic}` : null,
    podklad.dodavatel.email,
    // Neplátce DPH to musí na dokladu uvést (sekce 11).
    podklad.dodavatel.jePlatceDph ? null : 'Neplátce DPH',
  ].filter(Boolean) as string[];

  const odberatelRadky = [
    podklad.odberatel.jmeno,
    podklad.odberatel.ulice,
    `${podklad.odberatel.psc} ${podklad.odberatel.mesto}`,
    podklad.odberatel.email,
  ].filter(Boolean) as string[];

  const maxRadku = Math.max(dodavatelRadky.length, odberatelRadky.length);

  for (let i = 0; i < maxRadku; i++) {
    if (dodavatelRadky[i]) doc.text(dodavatelRadky[i], 50, y + i * 14, { width: 250 });
    if (odberatelRadky[i]) doc.text(odberatelRadky[i], 320, y + i * 14, { width: 225 });
  }

  y += maxRadku * 14 + 30;

  // --- Položky ---
  doc.font('tucny').fontSize(9).fillColor(SEDA);
  doc.text('POLOŽKA', 50, y);
  doc.text('KS', 350, y, { width: 40, align: 'right' });
  doc.text('CENA/KS', 395, y, { width: 70, align: 'right' });
  doc.text('CELKEM', 470, y, { width: 75, align: 'right' });

  y += 14;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#E4D9C8').lineWidth(0.5).stroke();
  y += 10;

  doc.font('bezny').fontSize(10).fillColor(ESPRESSO);

  for (const polozka of podklad.polozky) {
    // Nová stránka, kdyby se objednávka nevešla.
    if (y > 700) {
      doc.addPage();
      y = 50;
    }

    doc.text(polozka.nazev, 50, y, { width: 290 });
    doc.text(String(polozka.mnozstvi), 350, y, { width: 40, align: 'right' });
    doc.text(castka(polozka.cenaZaKusHaleru), 395, y, { width: 70, align: 'right' });
    doc.text(castka(polozka.cenaZaKusHaleru * polozka.mnozstvi), 470, y, { width: 75, align: 'right' });

    y += Math.max(16, doc.heightOfString(polozka.nazev, { width: 290 }) + 4);
  }

  y += 6;
  doc.moveTo(320, y).lineTo(545, y).strokeColor('#E4D9C8').lineWidth(0.5).stroke();
  y += 10;

  // --- Souhrn ---
  // Sloupec s částkou je schválně širší než u položek – tučné „6 282,00 Kč“
  // se do 75 bodů nevejde a lámalo se na dva řádky.
  const radek = (popisek: string, hodnota: string, tucne = false) => {
    doc.font(tucne ? 'tucny' : 'bezny').fontSize(tucne ? 12 : 10);
    doc.fillColor(tucne ? ESPRESSO : SEDA);
    doc.text(popisek, 320, y, { width: 100 });
    doc.fillColor(ESPRESSO).text(hodnota, 425, y, { width: 120, align: 'right' });
    y += tucne ? 22 : 16;
  };

  if (podklad.slevaHaleru > 0) radek('Sleva', `−${castka(podklad.slevaHaleru)}`);
  radek('Doprava', podklad.dopravaHaleru === 0 ? 'Zdarma' : castka(podklad.dopravaHaleru));
  if (podklad.zPoukazuHaleru > 0) radek('Uhrazeno poukazem', `−${castka(podklad.zPoukazuHaleru)}`);

  radek('Celkem', castka(podklad.celkemHaleru), true);

  y += 10;
  doc
    .font('bezny')
    .fontSize(9)
    .fillColor(SEDA)
    .text(`Způsob platby: ${NAZEV_PLATBY[podklad.zpusobPlatby] ?? podklad.zpusobPlatby}`, 320, y, {
      width: 225,
      align: 'right',
    });

  // --- Patička s poučením (u zásilkového prodeje povinné, sekce 11) ---
  doc
    .font('bezny')
    .fontSize(8)
    .fillColor(SEDA)
    .text(
      'Od kupní smlouvy lze odstoupit do 14 dnů od převzetí zboží bez udání důvodu. ' +
        'Postup, lhůty i vzorový formulář najdete v obchodních podmínkách na lindafashion.cz. ' +
        'Reklamace se řídí reklamačním řádem a občanským zákoníkem.',
      50,
      760,
      { width: 495, align: 'center' }
    );

  doc.end();

  return new Promise<Buffer>((splnit, odmitnout) => {
    doc.on('end', () => splnit(Buffer.concat(casti)));
    doc.on('error', odmitnout);
  });
}
