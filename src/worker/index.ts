import { getQueueBoss } from '../lib/queue';
import { db } from '../lib/db';

async function startWorker() {
  console.log('🚀 Spouštím worker kontejner LINDA FASHION...');

  try {
    const boss = await getQueueBoss();

    // 1. Úloha pro zpracování fotek Sharpem
    await boss.work('process-image', async (job) => {
      console.log(`[WORKER] Zpracovávám obrázek pre produkt:`, job.data);
      // Zpracování Sharp
      return { success: true };
    });

    // 2. Transakční e-maily
    await boss.work('send-email', async (job) => {
      const { to, subject, body } = job.data as { to: string; subject: string; body: string };
      console.log(`[WORKER] Odesílám e-mail na ${to} s předmětem "${subject}"`);
      // SMTP/Resend odoslanie
      return { success: true };
    });

    // 3. Generování PDF Faktury
    await boss.work('generate-pdf-invoice', async (job) => {
      const { orderId } = job.data as { orderId: string };
      console.log(`[WORKER] Generuji PDF fakturu k objednávce: ${orderId}`);
      return { success: true };
    });

    // 4. Opuštěné košíky (Pravidelná kontrola)
    await boss.schedule('check-abandoned-carts', '0 */4 * * *', async () => {
      console.log('[WORKER] Kontrola opuštěných košíků u přihlášených uživatelů...');
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hodin staré košíky
      const abandonedCarts = await db.cart.findMany({
        where: {
          updatedAt: { lte: cutoff },
          pripomenutoAt: null,
          items: { some: {} },
        },
        include: { user: true },
      });

      for (const cart of abandonedCarts) {
        if (cart.user?.email) {
          console.log(`[WORKER] Odesílám e-mail o opuštěném košíku zákaznici: ${cart.user.email}`);
          await db.cart.update({
            where: { id: cart.id },
            data: { pripomenutoAt: new Date() },
          });
        }
      }
    });

    // 5. Automatické upozornění na docházející sklad
    await boss.schedule('check-low-stock', '0 */2 * * *', async () => {
      console.log('[WORKER] Kontrola docházejících zásob v košících a oblíbených...');
      // Kontrola variant, které mají méně než 2 kusy
      const lowStockVariants = await db.productVariant.findMany({
        where: { skladem: { lte: 2, gt: 0 } },
        include: {
          product: true,
          cartItems: { include: { cart: { include: { user: true } } } },
          stockNotifications: { where: { vyrizeno: false } },
        },
      });

      for (const variant of lowStockVariants) {
        for (const item of variant.cartItems) {
          if (!item.upozornenoNaSklad && item.cart.user?.email) {
            console.log(`[WORKER] Posílám upozornění na docházející sklad (${variant.product.nazev}) zákaznici: ${item.cart.user.email}`);
            await db.cartItem.update({
              where: { id: item.id },
              data: { upozornenoNaSklad: true },
            });
          }
        }
      }
    });

    console.log('✅ Worker úspěšně poslouchá na zadaných frontách.');
  } catch (error) {
    console.error('❌ Chyba při spouštění workeru:', error);
  }
}

startWorker();
