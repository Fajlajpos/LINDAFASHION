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
    /**
     * Údaj o zápisu ve veřejném či živnostenském rejstříku.
     *
     * § 435 o. z.: patří na každou obchodní listinu, tedy i na fakturu.
     * Chybějící údaj na dokladu není kosmetika – je to nedostatek, který
     * se vytýká při kontrole.
     */
    zapisVRejstriku: string | null;
  };

  odberatel: {
    jmeno: string;
    ulice: string;
    mesto: string;
    psc: string;
    email: string | null;
  };

  /**
   * Údaje k úhradě. `null` u zaplacené objednávky i u platby kartou.
   *
   * Doklad je jediná věc, kterou zákaznice po nákupu jistě má; číslo účtu
   * a variabilní symbol na něm chyběly, takže kdo zavřel potvrzovací stránku,
   * neměl podle čeho zaplatit. Vyzývat k platbě u už uhrazené objednávky je
   * ale návod k platbě druhé – proto se blok tiskne jen tehdy, když se opravdu
   * čeká na peníze.
   */
  platebniUdaje: {
    cisloUctu: string | null;
    iban: string | null;
    variabilniSymbol: string;
    kUhradeHaleru: Halere;
  } | null;

  polozky: PolozkaFaktury[];
  dopravaHaleru: Halere;
  slevaHaleru: Halere;
  zPoukazuHaleru: Halere;
  celkemHaleru: Halere;
  zpusobPlatby: string;

  /**
   * --- Rozpis DPH, § 29 zák. č. 235/2004 Sb. ---
   *
   * Daňový doklad plátce musí obsahovat sazbu, základ daně a výši daně.
   * Bez toho to není daňový doklad, jen stvrzenka – a odběratel z ní nemůže
   * uplatnit odpočet.
   *
   * Obojí je **snímek z objednávky** (`Order.sazbaDph`, `Order.dphHaleru`),
   * ne dnešní nastavení: kdyby se e-shop stal plátcem později, přepočítaly by
   * se podle aktuálního přepínače i loňské doklady. Neplátce má nulu a rozpis
   * se na doklad vůbec nevytiskne – uvádět DPH bez registrace se nesmí.
   */
  sazbaDph: number;
  dphHaleru: Halere;
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

/**
 * Adresa formuláře pro odstoupení, bez schématu (`lindafashion.cz/odstoupeni`).
 *
 * V patičce stála natvrdo, takže po změně domény by doklad posílal zákaznici
 * jinam, než kde web běží. `APP_URL` je tentýž zdroj, ze kterého skládají
 * odkazy e-maily i strukturovaná data.
 */
function adresaOdstoupeni(): string {
  const zaklad = (process.env.APP_URL || 'https://lindafashion.cz').replace(/\/+$/, '');
  return `${zaklad.replace(/^https?:\/\//, '')}/odstoupeni`;
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
    // § 435 o. z. – zápis v rejstříku patří na obchodní listiny.
    podklad.dodavatel.zapisVRejstriku,
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

  /*
   * Rozpis daně u plátce. Ceny v e-shopu jsou včetně DPH, takže se základ
   * počítá **shora**: základ = celkem − daň. Násobit celkovou částku sazbou
   * je klasická záměna, která u 21 % přehodí daň o pětinu nahoru.
   *
   * Vytiskne se jen plátci a jen s nenulovou daní – u neplátce by to byl
   * údaj, který na doklad nepatří.
   */
  if (podklad.dodavatel.jePlatceDph && podklad.dphHaleru > 0) {
    radek('Základ daně', castka(podklad.celkemHaleru - podklad.dphHaleru));
    radek(`DPH ${podklad.sazbaDph} %`, castka(podklad.dphHaleru));
  }

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

  /*
   * --- Údaje k úhradě ---
   *
   * Blok vlevo, pod položkami, ne vpravo pod souhrnem: souhrn se čte jako
   * uzavřený výpočet a přilepený návod k platbě by v něm vypadal jako další
   * řádek částky. Tiskne se jen u nezaplaceného převodu (viz `platebniUdaje`).
   *
   * `y` se počítá od spodní hrany souhrnu, aby se blok nepřekryl s dlouhou
   * objednávkou; patička sedí na pevných 760, takže je kam růst.
   */
  const platba = podklad.platebniUdaje;

  if (platba && (platba.cisloUctu || platba.iban)) {
    const yPlatba = Math.max(y + 24, 560);

    doc.font('tucny').fontSize(10).fillColor(ESPRESSO).text('Údaje k úhradě', 50, yPlatba);

    const radky: Array<[string, string]> = [];
    if (platba.cisloUctu) radky.push(['Číslo účtu', platba.cisloUctu]);
    if (platba.iban) radky.push(['IBAN', platba.iban]);
    radky.push(['Variabilní symbol', platba.variabilniSymbol]);
    radky.push(['Částka k úhradě', castka(platba.kUhradeHaleru)]);

    let yRadek = yPlatba + 18;

    for (const [popisek, hodnota] of radky) {
      doc.font('bezny').fontSize(9).fillColor(SEDA).text(popisek, 50, yRadek, { width: 120 });
      doc.font('bezny').fontSize(9).fillColor(ESPRESSO).text(hodnota, 175, yRadek, { width: 200 });
      yRadek += 14;
    }
  }

  // --- Patička s poučením (u zásilkového prodeje povinné, sekce 11) ---
  doc
    .font('bezny')
    .fontSize(8)
    .fillColor(SEDA)
    .text(
      /* Odkaz musí vést tam, kde formulář opravdu je. Věta roky posílala
         zákaznici do obchodních podmínek „pro vzorový formulář", který v nich
         nebyl – nesplněná povinnost schovaná v poučení o jejím splnění. */
      'Od kupní smlouvy lze odstoupit do 14 dnů od převzetí zboží bez udání důvodu, ' +
        // Doména se bere z `APP_URL`, ne natvrdo: odkaz musí vést tam, kde web
        // opravdu běží, jinak posílá zákaznici na cizí nebo neexistující adresu.
        `a to i bez přihlášení na ${adresaOdstoupeni()}. ` +
        'Tamtéž najdete poučení i vzorový formulář podle nařízení vlády č. 363/2013 Sb. ' +
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
