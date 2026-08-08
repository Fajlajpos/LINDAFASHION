import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Testujeme čistou logiku (peníze, slugy, validaci uploadu) v Node,
    // ne komponenty – ty ověřuje průchod prohlížečem.
    environment: 'node',
    include: ['src/**/*.test.ts'],

    /*
     * Integrační testy sem nepatří – potřebují běžící Postgres.
     * `npm test` musí projít i bez něj, jinak by si nikdo netroufl testy
     * pustit. Ty spouští `npm run test:integration` s vlastní konfigurací.
     */
    exclude: ['**/node_modules/**', '**/dist/**', 'src/**/*.integration.test.ts'],
  },
});
