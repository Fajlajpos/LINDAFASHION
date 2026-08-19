/**
 * Vloží výchozí znění právních dokumentů do databáze.
 *
 * Oddělené od `prisma/seed.ts` schválně: seed maže katalog, tohle ne.
 * Na běžícím e-shopu je potřeba doplnit podmínky, ne přijít o produkty.
 *
 * Existující znění nikdy nepřepisuje – text, na který odkazuje objednávka,
 * je důkaz o tom, s čím zákaznice souhlasila.
 *
 *   npx ts-node -P tsconfig.node.json src/scripts/vlozit-pravni-dokumenty.ts
 */
import { PrismaClient } from '@prisma/client';
import { VYCHOZI_ZNENI } from '../lib/pravni-dokumenty';

const prisma = new PrismaClient();

async function main() {
  const dnes = new Date().toISOString().slice(0, 10);

  for (const druh of ['obchodni-podminky', 'reklamacni-rad'] as const) {
    const uzJe = await prisma.pravniDokument.findFirst({ where: { druh } });

    if (uzJe) {
      console.log(`⏭  ${druh}: už existuje znění (verze ${uzJe.verze}), nechávám být.`);
      continue;
    }

    const vychozi = VYCHOZI_ZNENI[druh];

    await prisma.pravniDokument.create({
      data: {
        druh,
        verze: dnes,
        nadpis: vychozi.nadpis,
        obsah: vychozi.obsah,
        ucinnostOd: new Date(),
      },
    });

    console.log(`📜 ${druh}: vloženo výchozí znění jako verze ${dnes}.`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Vložení selhalo:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
