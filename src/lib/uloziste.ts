/**
 * Úložiště nahraných fotek – sdílené mezi `web` (nahrání) a `worker` (zpracování).
 *
 * Dvě složky, obě v Dockeru jako volume:
 *   storage/tmp     – originál přesně tak, jak dorazil; žije jen do zpracování
 *   public/uploads  – hotové WebP varianty, které se servírují zákaznicím
 *
 * Originál se po zpracování maže. To je hlavní důvod, proč e-shop nezaplní disk:
 * z fotky z mobilu (5–8 MB) zůstane po zpracování zhruba 150–250 kB.
 *
 * Bez relativních importů se tenhle soubor nedostane do buildu workeru,
 * proto tu nejsou žádné aliasy @/.
 */
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

export const UPLOAD_DIR = process.env.UPLOAD_DIR || 'public/uploads';
export const TMP_DIR = process.env.UPLOAD_TMP_DIR || 'storage/tmp';

/** Strop pro vstupní soubor. Větší fotka nemá u e-shopu smysl a jen ucpe frontu. */
export const MAX_VSTUP_MB = Number(process.env.UPLOAD_MAX_MB || 15);
export const MAX_VSTUP_BAJTU = MAX_VSTUP_MB * 1024 * 1024;

/** Co pustíme dovnitř. Kontroluje se i skutečná hlavička souboru, ne jen MIME z prohlížeče. */
export const POVOLENE_TYPY: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

/**
 * Token je název dočasného souboru. Přichází od klienta při ukládání produktu,
 * takže ho nikdy nelepíme do cesty bez kontroly – jinak by `../../` umožnilo
 * sáhnout kamkoliv na disk.
 */
const TOKEN_REGEX = /^[a-f0-9]{32}\.(jpg|png|webp|avif)$/;

export function jePlatnyToken(token: string): boolean {
  return TOKEN_REGEX.test(token);
}

export function vytvoritToken(pripona: string): string {
  return `${crypto.randomBytes(16).toString('hex')}.${pripona}`;
}

export function cestaTmp(token: string): string {
  if (!jePlatnyToken(token)) {
    throw new Error(`Neplatný token dočasného souboru: ${token}`);
  }
  return path.join(process.cwd(), TMP_DIR, token);
}

export function cestaUploads(soubor: string): string {
  return path.join(process.cwd(), UPLOAD_DIR, soubor);
}

export async function zajistitSlozky(): Promise<void> {
  await fs.mkdir(path.join(process.cwd(), TMP_DIR), { recursive: true });
  await fs.mkdir(path.join(process.cwd(), UPLOAD_DIR), { recursive: true });
}

/** Smazání, které nevadí, když soubor už není. */
export async function smazatTise(cesta: string): Promise<void> {
  try {
    await fs.unlink(cesta);
  } catch (err) {
    const kod = (err as NodeJS.ErrnoException).code;
    if (kod !== 'ENOENT') {
      console.warn(`[úložiště] Nepodařilo se smazat ${cesta}:`, err);
    }
  }
}

/**
 * Rozpozná formát podle magických bajtů na začátku souboru.
 * `file.type` z prohlížeče si klient může nastavit libovolně, takže se na něj
 * nedá spolehnout – tohle je skutečná kontrola typu.
 */
export function rozpoznatTyp(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }

  // RIFF....WEBP
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }

  // ....ftypavif / ftypavis
  if (buffer.toString('ascii', 4, 8) === 'ftyp') {
    const znacka = buffer.toString('ascii', 8, 12);
    if (znacka === 'avif' || znacka === 'avis') return 'image/avif';
  }

  return null;
}
