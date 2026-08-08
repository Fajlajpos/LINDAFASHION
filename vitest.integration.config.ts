import path from 'path';
import { defineConfig } from 'vitest/config';

/**
 * Integrační testy nad skutečnou databází.
 *
 * Jedou zvlášť od jednotkových: `npm test` musí projít i bez Postgresu, jinak
 * by si nikdo netroufl testy pustit. Sem patří jen to, co bez databáze nemá
 * smysl – transakce, unikátní indexy a podmínky uvnitř `UPDATE`.
 */
export default defineConfig({
  // Route handlery importují přes `@/` – bez aliasu by se sem nedaly načíst.
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },

  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],

    // Adresa databáze se musí přepsat dřív, než se načte `lib/db.ts`.
    setupFiles: ['./src/test/setup-integration.ts'],
    globalSetup: ['./src/test/global-setup.ts'],

    /*
     * Jeden testovací soubor po druhém, ne paralelně.
     *
     * Testy si mezi sebou mažou tabulky a některé záměrně pouštějí několik
     * objednávek najednou, aby ověřily souběh. Kdyby přitom běžel jiný soubor
     * nad toutéž databází, výsledky by se navzájem přebíjely a testy by
     * padaly náhodně – což je horší než žádné testy.
     */
    fileParallelism: false,

    // Souběžné objednávky a migrace na studeném spojení chvíli trvají.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
