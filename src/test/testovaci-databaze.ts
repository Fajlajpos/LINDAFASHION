/**
 * Adresa testovací databáze pro integrační testy.
 *
 * Integrační testy sahají na skutečný Postgres – jinak by neměly smysl.
 * Celá jejich hodnota je v tom, že ověřují chování, které vzniká **až
 * v databázi**: transakce, unikátní indexy a podmínky uvnitř `UPDATE`.
 * Zesměšněná Prisma by potvrzovala jen to, že jsme kód napsali tak, jak
 * jsme ho napsali.
 *
 * Testy proto **mažou tabulky**. Celý tenhle soubor existuje kvůli jediné
 * pojistce: aby se to nikdy nestalo nad vývojovou nebo produkční databází.
 */

import fs from 'fs';
import path from 'path';

/** Konec názvu, bez kterého se testy odmítnou spustit. */
const POVINNA_PRIPONA = '_test';

/**
 * Načte `.env` do `process.env`.
 *
 * Next.js si `.env` načítá sám, Vitest ne – bez tohohle by integrační testy
 * neznaly `DATABASE_URL` a hlásily by „chybí databáze" na stroji, kde je
 * všechno v pořádku. Existující proměnné se nepřepisují, aby šlo adresu
 * přebít z příkazové řádky.
 */
export function nacistEnvSoubor(korenProjektu = process.cwd()): void {
  const soubor = path.join(korenProjektu, '.env');
  if (!fs.existsSync(soubor)) return;

  for (const radek of fs.readFileSync(soubor, 'utf8').split(/\r?\n/)) {
    const orezany = radek.trim();
    if (!orezany || orezany.startsWith('#')) continue;

    const delici = orezany.indexOf('=');
    if (delici === -1) continue;

    const klic = orezany.slice(0, delici).trim();
    if (process.env[klic] !== undefined) continue;

    // Hodnota bývá v uvozovkách; ty do proměnné nepatří.
    process.env[klic] = orezany
      .slice(delici + 1)
      .trim()
      .replace(/^(['"])(.*)\1$/, '$2');
  }
}

/**
 * Sestaví adresu testovací databáze.
 *
 * Buď se vezme `DATABASE_URL_TEST`, nebo se z `DATABASE_URL` odvodí připojením
 * `_test` k názvu databáze – takže `linda_fashion` → `linda_fashion_test`.
 */
export function adresaTestovaciDatabaze(): string | null {
  const primo = process.env.DATABASE_URL_TEST?.trim();
  if (primo) return primo;

  const vyvojova = process.env.DATABASE_URL?.trim();
  if (!vyvojova) return null;

  try {
    const url = new URL(vyvojova);
    const nazev = url.pathname.replace(/^\//, '');
    if (!nazev) return null;

    url.pathname = `/${nazev}${nazev.endsWith(POVINNA_PRIPONA) ? '' : POVINNA_PRIPONA}`;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Pojistka proti smazání cizí databáze.
 *
 * Testy začínají `TRUNCATE`. Kdyby se sem omylem dostala adresa vývojové
 * databáze – překlepem v `.env`, zapomenutou proměnnou v shellu – přišla by
 * zákaznice o data. Název proto **musí** končit na `_test`; jinak se testy
 * neprovedou vůbec.
 */
export function overitBezpecnostAdresy(adresa: string): void {
  const nazev = new URL(adresa).pathname.replace(/^\//, '');

  if (!nazev.endsWith(POVINNA_PRIPONA)) {
    throw new Error(
      `Integrační testy odmítají běžet nad databází „${nazev}". Název musí končit na ` +
        `„${POVINNA_PRIPONA}", protože testy mažou obsah tabulek. Zkontroluj DATABASE_URL_TEST.`
    );
  }
}

/** Název databáze z adresy – pro `CREATE DATABASE` a hlášky. */
export function nazevDatabaze(adresa: string): string {
  return new URL(adresa).pathname.replace(/^\//, '');
}

/** Adresa téhož serveru, ale na systémovou databázi `postgres`. */
export function adresaSpravcovska(adresa: string): string {
  const url = new URL(adresa);
  url.pathname = '/postgres';
  url.search = '';
  return url.toString();
}
