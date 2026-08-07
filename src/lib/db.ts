import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

/**
 * Prisma klient.
 *
 * Logování dotazů je schválně vypnuté i ve vývoji – při běžném proklikání
 * webu zaplaví výpis stovkami SQL řádků a skutečná chyba v nich zapadne.
 * Kdo je potřebuje, zapne si je přes `PRISMA_LOG_QUERIES=1`.
 */
const jeVyvoj = process.env.NODE_ENV !== 'production';
const logovatDotazy = process.env.PRISMA_LOG_QUERIES === '1';

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: logovatDotazy ? ['query', 'error', 'warn'] : jeVyvoj ? ['error', 'warn'] : ['error'],
  });

// V dev režimu se modul při hot reloadu načte znovu; bez tohohle by po pár
// úpravách viselo tolik otevřených spojení, že je databáze odmítne.
if (jeVyvoj) globalForPrisma.prisma = db;
