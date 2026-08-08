/**
 * Příprava testovací databáze – běží jednou před integračními testy.
 *
 * Založí databázi, pokud ještě není, a nasadí do ní migrace. Díky tomu se
 * `npm run test:integration` rozjede na čerstvém klonu repozitáře bez ručních
 * kroků; stačí běžící Postgres z `docker-compose.dev.yml`.
 */
import { execFileSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import {
  adresaSpravcovska,
  adresaTestovaciDatabaze,
  nacistEnvSoubor,
  nazevDatabaze,
  overitBezpecnostAdresy,
} from './testovaci-databaze';

/** Databáze už existuje – Postgres to hlásí kódem 42P04. */
function jeJizZalozena(err: unknown): boolean {
  return String((err as { message?: string })?.message ?? err).includes('42P04');
}

export async function setup(): Promise<void> {
  nacistEnvSoubor();

  const adresa = adresaTestovaciDatabaze();

  if (!adresa) {
    throw new Error(
      'Integrační testy potřebují databázi. Nastav DATABASE_URL (nebo DATABASE_URL_TEST) v .env ' +
        'a spusť Postgres: docker compose -f docker-compose.dev.yml up -d'
    );
  }

  // Musí být první – testy pod tím mažou tabulky.
  overitBezpecnostAdresy(adresa);

  const nazev = nazevDatabaze(adresa);

  // `CREATE DATABASE` nejde spustit z připojení k té samé databázi, proto
  // přes systémovou `postgres`.
  const spravce = new PrismaClient({ datasourceUrl: adresaSpravcovska(adresa) });

  try {
    await spravce.$executeRawUnsafe(`CREATE DATABASE "${nazev}"`);
    console.log(`[testy] Založena testovací databáze „${nazev}".`);
  } catch (err) {
    if (!jeJizZalozena(err)) {
      throw new Error(
        `Nepodařilo se připojit k Postgresu ani založit databázi „${nazev}". ` +
          'Běží docker compose -f docker-compose.dev.yml up -d?'
      );
    }
  } finally {
    await spravce.$disconnect();
  }

  // Schéma nasazujeme migracemi, ne `db push` – testy tak jedou nad přesně
  // tím schématem, které vznikne i v produkci, včetně backfillů v migracích.
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: adresa },
    stdio: 'pipe',
    shell: process.platform === 'win32',
  });
}
