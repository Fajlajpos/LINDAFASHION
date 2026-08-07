import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Testujeme čistou logiku (peníze, slugy, validaci uploadu) v Node,
    // ne komponenty – ty ověřuje průchod prohlížečem.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
