/**
 * Zpracování fotek Sharpem (sekce 9 zadání).
 *
 * Běží VÝHRADNĚ ve `worker` kontejneru, nikdy v `web` – hromadné nahrání
 * dvaceti fotek by jinak soutěžilo o výkon se zákaznicemi, které si zrovna
 * prohlížejí katalog.
 *
 * Z jednoho originálu vzniknou tři WebP varianty a originál se smaže:
 *
 *   fotka z mobilu   4 032 × 3 024 px, JPEG   ~5 800 kB
 *   → large          1 600 px, WebP q80        ~180 kB
 *   → medium           800 px, WebP q80         ~55 kB
 *   → thumb            300 px, WebP q75         ~12 kB
 *   → originál smazán                             0 kB
 *   ------------------------------------------------------
 *   celkem na disku                            ~247 kB  (4 % původní velikosti)
 *
 * EXIF (včetně GPS souřadnic z telefonu) se zahazuje – Sharp metadata
 * nekopíruje, pokud se explicitně nezavolá `.withMetadata()`. Orientaci
 * z EXIF ale musíme zachovat, proto `.rotate()` PŘED resize; jinak by se
 * fotky focené na výšku otočily.
 */
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { UPLOAD_DIR, cestaUploads, smazatTise, zajistitSlozky } from './uloziste';

export interface VariantaObrazku {
  url: string;
  sirka: number;
  vyska: number;
  bajtu: number;
}

export interface VysledekZpracovani {
  large: VariantaObrazku;
  medium: VariantaObrazku;
  thumb: VariantaObrazku;
  /** Kolik zabral originál, než se smazal – pro log a přehled úspory. */
  puvodniBajtu: number;
}

const VARIANTY = [
  { klic: 'large', maxPx: 1600, kvalita: 80 },
  { klic: 'medium', maxPx: 800, kvalita: 80 },
  { klic: 'thumb', maxPx: 300, kvalita: 75 },
] as const;

/**
 * @param cestaOriginalu absolutní cesta k souboru ve storage/tmp
 * @param zakladNazvu    základ výsledného jména bez přípony (typicky id fotky)
 */
export async function zpracovatObrazek(
  cestaOriginalu: string,
  zakladNazvu: string
): Promise<VysledekZpracovani> {
  await zajistitSlozky();

  // Velikost bereme ze souboru – `metadata.size` Sharp vyplňuje jen u vstupu
  // z bufferu, u cesty k souboru zůstává undefined.
  const puvodniBajtu = (await fs.stat(cestaOriginalu)).size;

  // Zároveň ověříme, že jde opravdu o obrázek, který Sharp umí otevřít –
  // ať případná chyba padne dřív, než začneme zapisovat varianty.
  await sharp(cestaOriginalu, {
    // Ochrana proti "dekompresní bombě" – obrázek s absurdními rozměry
    // by jinak workeru sežral paměť.
    limitInputPixels: 100_000_000,
    failOn: 'error',
  }).metadata();

  const vysledky: Partial<Record<(typeof VARIANTY)[number]['klic'], VariantaObrazku>> = {};

  for (const varianta of VARIANTY) {
    const nazevSouboru = `${zakladNazvu}_${varianta.klic}.webp`;

    const info = await sharp(cestaOriginalu, { limitInputPixels: 100_000_000 })
      .rotate() // podle EXIF orientace, musí být před resize
      .resize({
        width: varianta.maxPx,
        height: varianta.maxPx,
        fit: 'inside',
        withoutEnlargement: true, // malou fotku nenafukujeme, jen by ztloustla
      })
      .webp({ quality: varianta.kvalita, effort: 4 })
      .toFile(cestaUploads(nazevSouboru));

    vysledky[varianta.klic] = {
      url: `/${path.posix.join(UPLOAD_DIR.replace(/^public\/?/, ''), nazevSouboru)}`,
      sirka: info.width,
      vyska: info.height,
      bajtu: info.size,
    };
  }

  // Originál už není k ničemu – tohle je krok, který drží spotřebu disku dole.
  await smazatTise(cestaOriginalu);

  return {
    large: vysledky.large!,
    medium: vysledky.medium!,
    thumb: vysledky.thumb!,
    puvodniBajtu,
  };
}

/** Úklid po smazané fotce – odstraní všechny tři varianty. */
export async function smazatVariantyObrazku(zakladNazvu: string): Promise<void> {
  for (const varianta of VARIANTY) {
    await smazatTise(cestaUploads(`${zakladNazvu}_${varianta.klic}.webp`));
  }
}
