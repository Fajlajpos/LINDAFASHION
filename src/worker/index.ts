/**
 * Vstupní bod `worker` kontejneru (sekce 3 zadání).
 *
 * Stejný kód i image jako `web`, jen jiný spouštěcí příkaz. Zpracovává na
 * pozadí to, co by jinak zdržovalo zákaznice: kompresi fotek Sharpem, později
 * transakční e-maily, PDF faktury a přegenerování produktového feedu.
 *
 * Pozn. k pg-boss: `schedule()` bere (název, cron, data, options) – NE handler.
 * Naplánovaná úloha proto musí mít vedle sebe i `work()` se stejným názvem,
 * jinak se do fronty jen zapisuje a nikdo ji nevyzvedne.
 */
import {
  getQueueBoss,
  publishJob,
  zastavitFrontu,
  FRONTY,
  type UlohaZpracovatObrazek,
} from '../lib/queue';
import { zajistitSlozky } from '../lib/uloziste';
import { zalozitAdminaPokudChybi } from '../lib/admin-bootstrap';
import { db } from '../lib/db';
import { zpracovatObrazekUloha } from './jobs/zpracovat-obrazek';
import { uklidUlozisteUloha } from './jobs/uklid-uloziste';
import { odeslatEmailUloha, type UlohaEmail } from './jobs/odeslat-email';
import { vygenerovatFakturuUloha, type UlohaFaktura } from './jobs/vygenerovat-fakturu';
import { vygenerovatPoukazyUloha, type UlohaPoukazy } from './jobs/vygenerovat-poukazy';
import { uklidResetTokenu } from '../lib/reset-hesla';
import { popisVysledku, spustitRetenci } from '../lib/retence';
import { zavritTransport } from './emaily/transport';

const FRONTA_UKLID = 'uklid-uloziste';
const FRONTA_OPUSTENE_KOSIKY = 'opustene-kosiky';
const FRONTA_NIZKY_SKLAD = 'nizky-sklad-upozorneni';
const FRONTA_HLIDANI_SKLADU = 'hlidani-skladu';
const FRONTA_RETENCE = 'retence-osobnich-udaju';

async function spustitWorker() {
  console.log('🚀 Spouštím worker LINDA FASHION…');

  await zajistitSlozky();

  // Na čerstvé databázi zajistí, že je kam se přihlásit do administrace.
  await zalozitAdminaPokudChybi();

  const boss = await getQueueBoss();

  // --- Zpracování fotek Sharpem (sekce 9) ---------------------------------
  // teamSize 2 = nejvýš dvě fotky naráz. Sharp je náročný na CPU a paměť,
  // víc paralelních úloh by na malém VPS jen soutěžilo o stejné jádro.
  await boss.work<UlohaZpracovatObrazek>(
    FRONTY.ZPRACOVAT_OBRAZEK,
    { teamSize: 2, teamConcurrency: 1 },
    async (job) => {
      await zpracovatObrazekUloha(job.data);
    }
  );

  // --- Transakční e-maily -------------------------------------------------
  // Bez SMTP se zpráva jen zaloguje; fronta ale musí mít obsluhu, jinak by se
  // úlohy hromadily v databázi a nikdo by je nikdy nevyzvedl.
  await boss.work<UlohaEmail>(FRONTY.ODESLAT_EMAIL, async (job) => {
    await odeslatEmailUloha(job.data);
  });

  // --- Doklad k objednávce (sekce 14) -------------------------------------
  await boss.work<UlohaFaktura>(FRONTY.VYGENEROVAT_FAKTURU, async (job) => {
    await vygenerovatFakturuUloha(job.data);
  });

  // --- Dárkové poukazy koupené jako zboží (sekce 6.11) --------------------
  await boss.work<UlohaPoukazy>(FRONTY.VYGENEROVAT_POUKAZY, async (job) => {
    await vygenerovatPoukazyUloha(job.data);
  });

  // --- Úklid úložiště -----------------------------------------------------
  await boss.work(FRONTA_UKLID, async () => {
    await uklidUlozisteUloha();

    const smazano = await uklidResetTokenu();
    if (smazano > 0) console.log(`[úklid] Smazáno ${smazano} prošlých tokenů pro obnovu hesla.`);
  });
  await boss.schedule(FRONTA_UKLID, '*/15 * * * *');

  // --- Opuštěné košíky (sekce 14) -----------------------------------------
  await boss.work(FRONTA_OPUSTENE_KOSIKY, async () => {
    const hranice = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const kosiky = await db.cart.findMany({
      where: {
        updatedAt: { lte: hranice },
        pripomenutoAt: null,
        items: { some: {} },
      },
      include: { user: { select: { email: true } } },
      take: 200,
    });

    for (const kosik of kosiky) {
      if (!kosik.user?.email) continue;

      await publishJob(FRONTY.ODESLAT_EMAIL, {
        typ: 'opusteny-kosik',
        to: kosik.user.email,
        subject: 'Zapomněli jste u nás košík – LINDA FASHION',
        data: {},
      });

      // Značka se zapisuje hned po zařazení do fronty, ne po doručení.
      // Připomínka poslaná dvakrát je horší než neposlaná, a když odeslání
      // selže, pg-boss si ho zopakuje sám nad toutéž úlohou.
      await db.cart.update({
        where: { id: kosik.id },
        data: { pripomenutoAt: new Date() },
      });
    }

    if (kosiky.length > 0) {
      console.log(`[košíky] Zařazeno ${kosiky.length} připomínek opuštěného košíku.`);
    }
  });
  await boss.schedule(FRONTA_OPUSTENE_KOSIKY, '0 */4 * * *');

  // --- Docházející sklad (sekce 14) ---------------------------------------
  await boss.work(FRONTA_NIZKY_SKLAD, async () => {
    const dochazi = await db.productVariant.findMany({
      where: { skladem: { lte: 2, gt: 0 } },
      include: {
        product: { select: { nazev: true } },
        cartItems: {
          where: { upozornenoNaSklad: false },
          include: { cart: { include: { user: { select: { email: true } } } } },
        },
      },
      take: 200,
    });

    for (const varianta of dochazi) {
      for (const polozka of varianta.cartItems) {
        if (!polozka.cart.user?.email) continue;

        const nazev = `${varianta.product.nazev} (${varianta.velikost})`;

        await publishJob(FRONTY.ODESLAT_EMAIL, {
          typ: 'dochazejici-sklad',
          to: polozka.cart.user.email,
          subject: `${nazev} dochází – LINDA FASHION`,
          data: { nazev },
        });

        await db.cartItem.update({
          where: { id: polozka.id },
          data: { upozornenoNaSklad: true },
        });
      }
    }

    // Jakmile se sklad doplní nad práh, příznak se vrátí zpět – ať při
    // dalším poklesu přijde upozornění znovu (sekce 14).
    await db.cartItem.updateMany({
      where: { upozornenoNaSklad: true, variant: { skladem: { gt: 2 } } },
      data: { upozornenoNaSklad: false },
    });
    await db.favorite.updateMany({
      where: { upozornenoNaSklad: true, product: { variants: { some: { skladem: { gt: 2 } } } } },
      data: { upozornenoNaSklad: false },
    });
  });
  await boss.schedule(FRONTA_NIZKY_SKLAD, '0 */2 * * *');

  // --- Hlídání dostupnosti (sekce 14) -------------------------------------
  // Zákaznice si u vyprodané velikosti nechala poslat zprávu, až bude zpátky.
  await boss.work(FRONTA_HLIDANI_SKLADU, async () => {
    const hlidani = await db.stockNotification.findMany({
      where: { vyrizeno: false, variant: { skladem: { gt: 0 }, product: { aktivni: true } } },
      include: {
        variant: { include: { product: { select: { nazev: true, slug: true } } } },
      },
      take: 500,
    });

    for (const zaznam of hlidani) {
      const nazev = `${zaznam.variant.product.nazev} (${zaznam.variant.velikost})`;

      await publishJob(FRONTY.ODESLAT_EMAIL, {
        typ: 'skladem-znovu',
        to: zaznam.email,
        subject: `${nazev} je zase skladem – LINDA FASHION`,
        data: { slug: zaznam.variant.product.slug, nazev },
      });

      // Označíme hned po zařazení do fronty. Případné opakované odeslání
      // řeší pg-boss sám; přeposlat zprávu dvakrát je horší než neposlat.
      await db.stockNotification.update({
        where: { id: zaznam.id },
        data: { vyrizeno: true },
      });
    }

    if (hlidani.length > 0) {
      console.log(`[sklad] Odesláno ${hlidani.length} upozornění na naskladnění.`);
    }
  });
  await boss.schedule(FRONTA_HLIDANI_SKLADU, '*/30 * * * *');

  // --- Retence osobních údajů (čl. 5 odst. 1 písm. e GDPR) ----------------
  //
  // Jednou denně ve 3:20. Ne častěji: nic z toho nehoří na minuty a mazání
  // sahá na tabulky, do kterých se přes den píše. Ne v celou hodinu, ať se
  // to nesejde s jinou noční úlohou v kontejneru.
  //
  // Chyba se zaloguje a úloha spadne, aby ji pg-boss zopakoval. Tichý
  // `catch` by z retence udělal to, čím byla dosud – nic, o čem se neví.
  await boss.work(FRONTA_RETENCE, async () => {
    const vysledek = await spustitRetenci();
    console.log(`[retence] Smazáno: ${popisVysledku(vysledek)}.`);
  });
  await boss.schedule(FRONTA_RETENCE, '20 3 * * *');

  // Jedno kolo úklidu hned po startu – posbírá, co zbylo z minulého běhu.
  await uklidUlozisteUloha();

  console.log('✅ Worker poslouchá na frontách:');
  console.log(`   • ${FRONTY.ZPRACOVAT_OBRAZEK} (Sharp komprese fotek)`);
  console.log(`   • ${FRONTY.VYGENEROVAT_FAKTURU} (PDF doklad k objednávce)`);
  console.log(`   • ${FRONTY.VYGENEROVAT_POUKAZY} (dárkové poukazy po zaplacení)`);
  console.log(`   • ${FRONTY.ODESLAT_EMAIL} (transakční e-maily)`);
  console.log(`   • ${FRONTA_UKLID} (každých 15 minut)`);
  console.log(`   • ${FRONTA_OPUSTENE_KOSIKY} (každé 4 hodiny)`);
  console.log(`   • ${FRONTA_NIZKY_SKLAD} (každé 2 hodiny)`);
  console.log(`   • ${FRONTA_HLIDANI_SKLADU} (každých 30 minut)`);
  console.log(`   • ${FRONTA_RETENCE} (denně ve 3:20)`);
}

async function ukoncit(signal: string) {
  console.log(`\n${signal} – ukončuji worker…`);
  try {
    await zastavitFrontu();
    await zavritTransport();
    await db.$disconnect();
  } finally {
    process.exit(0);
  }
}

process.on('SIGTERM', () => void ukoncit('SIGTERM'));
process.on('SIGINT', () => void ukoncit('SIGINT'));

spustitWorker().catch((err) => {
  console.error('❌ Worker se nepodařilo spustit:', err);
  process.exit(1);
});
