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
import { getQueueBoss, zastavitFrontu, FRONTY, type UlohaZpracovatObrazek } from '../lib/queue';
import { zajistitSlozky } from '../lib/uloziste';
import { zalozitAdminaPokudChybi } from '../lib/admin-bootstrap';
import { db } from '../lib/db';
import { zpracovatObrazekUloha } from './jobs/zpracovat-obrazek';
import { uklidUlozisteUloha } from './jobs/uklid-uloziste';

const FRONTA_UKLID = 'uklid-uloziste';
const FRONTA_OPUSTENE_KOSIKY = 'opustene-kosiky';
const FRONTA_NIZKY_SKLAD = 'nizky-sklad-upozorneni';

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

  // --- Úklid úložiště -----------------------------------------------------
  await boss.work(FRONTA_UKLID, async () => {
    await uklidUlozisteUloha();
  });
  await boss.schedule(FRONTA_UKLID, '*/15 * * * *');

  // --- Opuštěné košíky (sekce 14) -----------------------------------------
  // Zatím jen označí košík jako připomenutý; odeslání e-mailu se doplní,
  // až budou k dispozici SMTP přístupy (sekce 8, 16).
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

      // TODO(e-mail): až budou SMTP klíče, zařadit sem úlohu ODESLAT_EMAIL.
      console.log(`[košíky] Připomínka pro ${kosik.user.email} (zatím bez odeslání – chybí SMTP).`);

      await db.cart.update({
        where: { id: kosik.id },
        data: { pripomenutoAt: new Date() },
      });
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

        // TODO(e-mail): až budou SMTP klíče, zařadit sem úlohu ODESLAT_EMAIL.
        console.log(
          `[sklad] ${varianta.product.nazev} dochází – upozornění pro ${polozka.cart.user.email} (zatím bez odeslání).`
        );

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

  // Jedno kolo úklidu hned po startu – posbírá, co zbylo z minulého běhu.
  await uklidUlozisteUloha();

  console.log('✅ Worker poslouchá na frontách:');
  console.log(`   • ${FRONTY.ZPRACOVAT_OBRAZEK} (Sharp komprese fotek)`);
  console.log(`   • ${FRONTA_UKLID} (každých 15 minut)`);
  console.log(`   • ${FRONTA_OPUSTENE_KOSIKY} (každé 4 hodiny)`);
  console.log(`   • ${FRONTA_NIZKY_SKLAD} (každé 2 hodiny)`);
}

async function ukoncit(signal: string) {
  console.log(`\n${signal} – ukončuji worker…`);
  try {
    await zastavitFrontu();
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
