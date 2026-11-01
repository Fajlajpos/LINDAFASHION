/**
 * Štítek „Nová kolekce" na kartě produktu.
 *
 * Dřív ho zapínalo políčko „Doporučený produkt", které nikdy samo nezhaslo –
 * kus by tak mohl být „nová kolekce" ještě po roce, a to už o zboží neříká
 * pravdu. Teď se štítek odvozuje od data přidání a po lhůtě zmizí sám;
 * „Doporučený" zůstává jen pro zvýraznění na úvodní stránce a řazení.
 */
export const DNY_NOVINKY = 30;

const DEN_MS = 24 * 60 * 60 * 1000;

export function jeNovinka(pridano: Date, ted: Date = new Date()): boolean {
  return ted.getTime() - pridano.getTime() < DNY_NOVINKY * DEN_MS;
}
