import fs from 'fs/promises';
import { db } from '@/lib/db';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { overitAdmina, odpovedNeautorizovano, zapsatDoAuditu } from '@/lib/admin';
import {
  MAX_DAVKA_BAJTU,
  MAX_DAVKA_MB,
  MAX_VSTUP_BAJTU,
  MAX_VSTUP_MB,
  POVOLENE_TYPY,
  cestaTmp,
  rozpoznatTyp,
  vytvoritToken,
  zajistitSlozky,
} from '@/lib/uloziste';
import { FRONTY, publishJob, type UlohaZpracovatObrazek } from '@/lib/queue';

/**
 * POST /api/admin/upload – nahrání fotek (sekce 9, krok 1).
 *
 * `web` tady dělá jen tři rychlé věci: ověří soubor, uloží originál do
 * dočasného úložiště a odpoví. Zmenšování a kompresi Sharpem si vezme
 * `worker` – proto hromadné nahrání dvaceti fotek nezpomalí zákaznice,
 * které si zrovna prohlížejí katalog.
 *
 * Dva režimy:
 *   • s `productId`  – rovnou založí ProductImage (stav CEKA) a zařadí úlohu
 *   • bez `productId` – jen vrátí tokeny; ProductImage vznikne až při uložení
 *     nového produktu (dřív totiž není k čemu fotku připojit)
 */

/** Kolik souborů zvládne jedno volání – brzda proti zahlcení fronty. */
const MAX_SOUBORU = 20;

export async function POST(request: Request) {
  try {
    const admin = await overitAdmina();
    if (!admin) return odpovedNeautorizovano();
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    // Kontrola velikosti MUSÍ být před `formData()` – ten si celé tělo natáhne
    // do paměti, takže po něm už je na obranu pozdě.
    const delka = Number(request.headers.get('content-length') ?? 0);
    if (delka > MAX_DAVKA_BAJTU) {
      return odpovedChyba(
        `Najednou lze nahrát nejvýš ${MAX_DAVKA_MB} MB fotek (vybráno ${(delka / 1024 / 1024).toFixed(0)} MB). ` +
          'Rozdělte prosím nahrávání do několika dávek.',
        413
      );
    }

    const formData = await request.formData();
    const soubory = formData.getAll('fotky').filter((f): f is File => f instanceof File);
    const productId = formData.get('productId');

    if (soubory.length === 0) {
      return odpovedChyba('Nebyl vybrán žádný soubor.', 400);
    }

    if (soubory.length > MAX_SOUBORU) {
      return odpovedChyba(`Najednou lze nahrát nejvýš ${MAX_SOUBORU} fotek.`, 400);
    }

    // Když je uvedený produkt, musí existovat – jinak by vznikly fotky do prázdna.
    if (typeof productId === 'string' && productId) {
      const existuje = await db.product.findUnique({ where: { id: productId }, select: { id: true } });
      if (!existuje) return odpovedChyba('Produkt nebyl nalezen.', 404);
    }

    await zajistitSlozky();

    const nahrane: Array<{
      token: string;
      puvodniNazev: string;
      velikostBajtu: number;
      obrazekId?: string;
    }> = [];
    const odmitnute: Array<{ nazev: string; duvod: string }> = [];

    for (const soubor of soubory) {
      if (soubor.size === 0) {
        odmitnute.push({ nazev: soubor.name, duvod: 'Soubor je prázdný.' });
        continue;
      }

      if (soubor.size > MAX_VSTUP_BAJTU) {
        odmitnute.push({
          nazev: soubor.name,
          duvod: `Soubor je větší než ${MAX_VSTUP_MB} MB (má ${(soubor.size / 1024 / 1024).toFixed(1)} MB).`,
        });
        continue;
      }

      const buffer = Buffer.from(await soubor.arrayBuffer());

      // Typ určujeme z obsahu souboru. `soubor.type` posílá prohlížeč a dá se
      // podvrhnout – přejmenovaný .exe by jinak prošel jako obrázek.
      const skutecnyTyp = rozpoznatTyp(buffer);

      if (!skutecnyTyp || !POVOLENE_TYPY[skutecnyTyp]) {
        odmitnute.push({
          nazev: soubor.name,
          duvod: 'Nepodporovaný formát. Nahrajte prosím JPEG, PNG, WebP nebo AVIF.',
        });
        continue;
      }

      const token = vytvoritToken(POVOLENE_TYPY[skutecnyTyp]);
      await fs.writeFile(cestaTmp(token), buffer);

      const zaznam: (typeof nahrane)[number] = {
        token,
        puvodniNazev: soubor.name,
        velikostBajtu: soubor.size,
      };

      // Režim editace existujícího produktu – zakládáme rovnou a frontujeme.
      if (typeof productId === 'string' && productId) {
        const poradi = await db.productImage.count({ where: { productId } });

        const obrazek = await db.productImage.create({
          data: {
            productId,
            poradi,
            jeHlavni: poradi === 0,
            stavZpracovani: 'CEKA',
            originalSoubor: token,
            altText: null,
          },
          select: { id: true },
        });

        const uloha: UlohaZpracovatObrazek = { obrazekId: obrazek.id, token };
        await publishJob(FRONTY.ZPRACOVAT_OBRAZEK, uloha);

        zaznam.obrazekId = obrazek.id;
      }

      nahrane.push(zaznam);
    }

    if (nahrane.length === 0) {
      return odpovedChyba(
        odmitnute[0]?.duvod ?? 'Žádnou z vybraných fotek se nepodařilo nahrát.',
        400
      );
    }

    await zapsatDoAuditu(admin.email, 'fotky.nahrany', 'ProductImage', (productId as string) || null, {
      pocet: nahrane.length,
      odmitnuto: odmitnute.length,
    });

    return odpovedOk({ nahrane, odmitnute }, 201);
  } catch (err) {
    return zpracovatChybu(err);
  }
}
