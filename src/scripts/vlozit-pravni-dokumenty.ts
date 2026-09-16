/**
 * Vydá znění právních dokumentů z `VYCHOZI_ZNENI` do databáze.
 *
 * Oddělené od `prisma/seed.ts` schválně: seed maže katalog, tohle ne.
 * Na běžícím e-shopu je potřeba doplnit podmínky, ne přijít o produkty.
 *
 * ## Přidává, nikdy nepřepisuje
 *
 * Text, na který odkazuje byť jediná objednávka, je důkaz o tom, s čím
 * zákaznice souhlasila. Skript proto **žádný uložený řádek nemění**:
 *
 * - v tabulce nic není → vloží se jako první verze,
 * - poslední uložené znění je shodné → nedělá se nic,
 * - poslední uložené znění se liší → vznikne **nová verze** účinná ode dneška.
 *
 * Do téhle chvíle uměl jen první případ a u existujícího znění se zastavil.
 * Oprava v textu se tím nedala vydat jinak než ručně přes administraci, takže
 * `VYCHOZI_ZNENI` a to, co četla zákaznice, se mohlo tiše rozejít.
 *
 *   npm run pravni:vlozit
 */
import { PrismaClient } from '@prisma/client';
import { VYCHOZI_ZNENI, type DruhDokumentu } from '../lib/pravni-dokumenty';

const prisma = new PrismaClient();

/** Druhy, jejichž text se opravdu ukládá. */
const SPRAVOVANE: DruhDokumentu[] = ['obchodni-podminky', 'reklamacni-rad'];

/**
 * Volné označení verze pro dnešek.
 *
 * Dvojice (druh, verze) je v databázi unikátní. Když se v jeden den vydávají
 * dvě znění, dostane druhé příponu – kolize by jinak skript shodila uprostřed
 * a část dokumentů by zůstala nevydaná.
 */
async function volneOznaceni(druh: DruhDokumentu, zaklad: string): Promise<string> {
  for (let poradi = 0; poradi < 26; poradi += 1) {
    const verze = poradi === 0 ? zaklad : `${zaklad}-${String.fromCharCode(97 + poradi)}`;
    const obsazeno = await prisma.pravniDokument.findUnique({
      where: { druh_verze: { druh, verze } },
      select: { id: true },
    });

    if (!obsazeno) return verze;
  }

  throw new Error(`Pro ${druh} se dnes nepodařilo najít volné označení verze.`);
}

async function main() {
  const dnes = new Date().toISOString().slice(0, 10);

  for (const druh of SPRAVOVANE) {
    const vychozi = VYCHOZI_ZNENI[druh];

    // Nejnovější podle účinnosti – to je znění, které dnes vidí zákaznice.
    const posledni = await prisma.pravniDokument.findFirst({
      where: { druh },
      orderBy: { ucinnostOd: 'desc' },
      select: { verze: true, obsah: true, nadpis: true },
    });

    if (posledni && posledni.obsah === vychozi.obsah && posledni.nadpis === vychozi.nadpis) {
      console.log(`⏭  ${druh}: verze ${posledni.verze} odpovídá textu v kódu, není co vydávat.`);
      continue;
    }

    const verze = await volneOznaceni(druh, dnes);

    await prisma.pravniDokument.create({
      data: {
        druh,
        verze,
        nadpis: vychozi.nadpis,
        obsah: vychozi.obsah,
        ucinnostOd: new Date(),
      },
    });

    if (posledni) {
      console.log(`📜 ${druh}: vydána nová verze ${verze} (předchozí ${posledni.verze} zůstává).`);
    } else {
      console.log(`📜 ${druh}: vloženo první znění jako verze ${verze}.`);
    }
  }

  console.log(
    '\nStarší znění zůstávají v databázi kvůli objednávkám, které na ně odkazují.\n' +
      'Otevřou se odkazem /obchodni-podminky?verze=<označení>.',
  );
}

main()
  .catch((e) => {
    console.error('❌ Vydání selhalo:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
