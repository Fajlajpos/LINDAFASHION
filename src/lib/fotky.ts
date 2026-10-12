/**
 * Fotky, které majitelka dodá jako soubor, ne přes administraci produktů –
 * majitelka na „O mně", obchod na úvodní stránce.
 *
 * Hledají se na disku v `public/fotky/` podle názvu, ne v konstantě: stačí
 * soubor nahrát a kód se nemění. Jen pro serverové komponenty (`node:fs`).
 * V Dockeru je `public/` součást image, takže fotka tam musí být při buildu.
 */
import fs from 'node:fs';
import path from 'node:path';

const PRIPONY = ['webp', 'jpg', 'jpeg', 'png'];

/** `najitFotku('prodejna')` → `/fotky/prodejna.jpg`, nebo `null`, když soubor není. */
export function najitFotku(nazev: string): string | null {
  const pripona = PRIPONY.find((p) =>
    fs.existsSync(path.join(process.cwd(), 'public', 'fotky', `${nazev}.${p}`))
  );
  return pripona ? `/fotky/${nazev}.${pripona}` : null;
}
