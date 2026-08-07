import { db } from '@/lib/db';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { overitAdmina, odpovedNeautorizovano, zapsatDoAuditu } from '@/lib/admin';
import { produktSchema } from '@/lib/validations/produkt';
import { unikatniSlug } from '@/lib/slug';
import { jePlatnyToken, cestaTmp, smazatTise } from '@/lib/uloziste';
import { smazatVariantyObrazku } from '@/lib/sharp-image';
import { FRONTY, publishJob, type UlohaZpracovatObrazek } from '@/lib/queue';
import { Prisma } from '@prisma/client';

interface Kontext {
  params: { id: string };
}

/** GET – detail produktu pro editační formulář. */
export async function GET(_request: Request, { params }: Kontext) {
  try {
    if (!(await overitAdmina())) return odpovedNeautorizovano();

    const produkt = await db.product.findUnique({
      where: { id: params.id },
      include: {
        category: { select: { id: true, nazev: true } },
        variants: { orderBy: { velikost: 'asc' } },
        images: { orderBy: { poradi: 'asc' } },
      },
    });

    if (!produkt) return odpovedChyba('Produkt nebyl nalezen.', 404);

    // Kolik variant je navázaných na objednávku – podle toho formulář schová
    // tlačítko "Smazat" (sekce 6.2).
    const vObjednavkach = await db.orderItem.count({
      where: { variant: { productId: produkt.id } },
    });

    return odpovedOk({
      ...produkt,
      cena: Number(produkt.cena),
      cenaPoSleve: produkt.cenaPoSleve === null ? null : Number(produkt.cenaPoSleve),
      lzeSmazat: vObjednavkach === 0,
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}

/** PUT – úprava produktu, variant a doplnění nových fotek. */
export async function PUT(request: Request, { params }: Kontext) {
  try {
    const admin = await overitAdmina();
    if (!admin) return odpovedNeautorizovano();
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const vstup = produktSchema.parse(await request.json());

    const stavajici = await db.product.findUnique({
      where: { id: params.id },
      include: { variants: { select: { id: true } } },
    });

    if (!stavajici) return odpovedChyba('Produkt nebyl nalezen.', 404);

    const kategorie = await db.category.findUnique({
      where: { id: vstup.categoryId },
      select: { id: true },
    });

    if (!kategorie) {
      return odpovedChyba('Zkontrolujte prosím vyplněné údaje.', 422, {
        categoryId: 'Vybraná kategorie neexistuje.',
      });
    }

    // Slug se přegeneruje jen při změně názvu – jinak by se rozbily odkazy,
    // které už někdo někde má (a SEO s nimi).
    const slug =
      stavajici.nazev === vstup.nazev.trim()
        ? stavajici.slug
        : await unikatniSlug(vstup.nazev, async (kandidat) => {
            const nalezeno = await db.product.findFirst({
              where: { slug: kandidat, NOT: { id: params.id } },
              select: { id: true },
            });
            return nalezeno !== null;
          });

    const poslane = vstup.varianty.filter((v) => v.id).map((v) => v.id as string);
    const kSmazani = stavajici.variants.filter((v) => !poslane.includes(v.id)).map((v) => v.id);

    // Varianta, která je v nějaké objednávce, se smazat nesmí – rozbila by
    // historii objednávek (sekce 6.2).
    const chranene = kSmazani.length
      ? (
          await db.orderItem.findMany({
            where: { variantId: { in: kSmazani } },
            select: { variantId: true },
            distinct: ['variantId'],
          })
        ).map((o) => o.variantId)
      : [];

    const bezpecneSmazat = kSmazani.filter((id) => !chranene.includes(id));
    const fotky = (vstup.fotky ?? []).filter((f) => jePlatnyToken(f.token));

    const noveObrazky = await db.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: params.id },
        data: {
          nazev: vstup.nazev.trim(),
          slug,
          popis: vstup.popis,
          categoryId: vstup.categoryId,
          cena: new Prisma.Decimal(vstup.cena),
          cenaPoSleve: vstup.cenaPoSleve == null ? null : new Prisma.Decimal(vstup.cenaPoSleve),
          znacka: vstup.znacka?.trim() || null,
          material: vstup.jeDarkovyPoukaz ? null : vstup.material?.trim() || null,
          udrzba: vstup.jeDarkovyPoukaz ? null : vstup.udrzba?.trim() || null,
          sku: vstup.sku?.trim() || null,
          aktivni: vstup.aktivni ?? true,
          doporuceny: vstup.doporuceny ?? false,
          jeDarkovyPoukaz: vstup.jeDarkovyPoukaz ?? false,
          metaTitle: vstup.metaTitle?.trim() || null,
          metaDescription: vstup.metaDescription?.trim() || null,
        },
      });

      if (bezpecneSmazat.length) {
        await tx.productVariant.deleteMany({ where: { id: { in: bezpecneSmazat } } });
      }

      // Varianta v objednávce zůstává, ale vynulujeme sklad – z katalogu
      // tak zmizí, aniž bychom rozbili historii.
      if (chranene.length) {
        await tx.productVariant.updateMany({
          where: { id: { in: chranene } },
          data: { skladem: 0 },
        });
      }

      for (const v of vstup.varianty) {
        const data = {
          velikost: v.velikost.trim(),
          barva: v.barva?.trim() || null,
          skladem: v.skladem,
          miry: vstup.jeDarkovyPoukaz ? Prisma.JsonNull : (v.miry ?? Prisma.JsonNull),
        };

        if (v.id) {
          await tx.productVariant.update({ where: { id: v.id }, data });
        } else {
          await tx.productVariant.create({ data: { ...data, productId: params.id } });
        }
      }

      const zacatekPoradi = await tx.productImage.count({ where: { productId: params.id } });
      const vytvorene = [];

      for (const [i, f] of fotky.entries()) {
        vytvorene.push(
          await tx.productImage.create({
            data: {
              productId: params.id,
              altText: f.altText?.trim() || `${vstup.nazev.trim()} – fotografie ${zacatekPoradi + i + 1}`,
              poradi: zacatekPoradi + i,
              jeHlavni: zacatekPoradi === 0 && i === 0,
              stavZpracovani: 'CEKA',
              originalSoubor: f.token,
            },
            select: { id: true, originalSoubor: true },
          })
        );
      }

      return vytvorene;
    });

    for (const obrazek of noveObrazky) {
      if (!obrazek.originalSoubor) continue;
      const uloha: UlohaZpracovatObrazek = { obrazekId: obrazek.id, token: obrazek.originalSoubor };
      await publishJob(FRONTY.ZPRACOVAT_OBRAZEK, uloha);
    }

    await zapsatDoAuditu(admin.email, 'produkt.upraven', 'Product', params.id, {
      nazev: vstup.nazev,
      smazanoVariant: bezpecneSmazat.length,
      zachovanoVObjednavkach: chranene.length,
      novychFotek: noveObrazky.length,
    });

    return odpovedOk({
      id: params.id,
      slug,
      zachovanoVariantVObjednavkach: chranene.length,
      pocetFotekVeFronte: noveObrazky.length,
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}

/** DELETE – smazání produktu, pokud není v žádné objednávce. */
export async function DELETE(request: Request, { params }: Kontext) {
  try {
    const admin = await overitAdmina();
    if (!admin) return odpovedNeautorizovano();
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const produkt = await db.product.findUnique({
      where: { id: params.id },
      include: { images: { select: { id: true, originalSoubor: true, stavZpracovani: true } } },
    });

    if (!produkt) return odpovedChyba('Produkt nebyl nalezen.', 404);

    const vObjednavkach = await db.orderItem.count({
      where: { variant: { productId: params.id } },
    });

    if (vObjednavkach > 0) {
      return odpovedChyba(
        'Tento produkt je součástí objednávek, proto ho nelze smazat – rozbila by se historie objednávek. ' +
          'Místo mazání ho skryjte přepnutím na „neaktivní“.',
        409
      );
    }

    // Soubory nejdřív, databázi až potom – kdyby mazání souborů selhalo,
    // zůstane po nich v databázi stopa a jde je dohledat.
    for (const obrazek of produkt.images) {
      await smazatVariantyObrazku(obrazek.id);
      if (obrazek.originalSoubor && jePlatnyToken(obrazek.originalSoubor)) {
        await smazatTise(cestaTmp(obrazek.originalSoubor));
      }
    }

    // Varianty i fotky odejdou kaskádou (onDelete: Cascade ve schématu).
    await db.product.delete({ where: { id: params.id } });

    await zapsatDoAuditu(admin.email, 'produkt.smazan', 'Product', params.id, {
      nazev: produkt.nazev,
      smazanoFotek: produkt.images.length,
    });

    return odpovedOk({ smazano: true });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
