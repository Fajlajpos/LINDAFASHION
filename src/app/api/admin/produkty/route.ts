import { db } from '@/lib/db';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { overitAdmina, odpovedNeautorizovano, zapsatDoAuditu } from '@/lib/admin';
import { produktSchema, urcitHlavni } from '@/lib/validations/produkt';
import { unikatniSlug } from '@/lib/slug';
import { hledaciTextProduktu } from '@/lib/vyhledavani';
import { jePlatnyToken } from '@/lib/uloziste';
import { FRONTY, publishJob, type UlohaZpracovatObrazek } from '@/lib/queue';
import { stavSlevyNovehoProduktu, zapsatCenu } from '@/lib/cenova-historie';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

/** GET /api/admin/produkty – seznam pro administraci, s hledáním a stránkováním. */
export async function GET(request: Request) {
  try {
    if (!(await overitAdmina())) return odpovedNeautorizovano();

    const url = new URL(request.url);
    const hledat = url.searchParams.get('hledat')?.trim();
    const kategorie = url.searchParams.get('kategorie')?.trim();
    const stranka = Math.max(1, Number(url.searchParams.get('stranka') ?? 1) || 1);
    const naStranku = 30;

    const kde: Prisma.ProductWhereInput = {
      ...(hledat
        ? {
            OR: [
              { nazev: { contains: hledat, mode: 'insensitive' } },
              { sku: { contains: hledat, mode: 'insensitive' } },
              { znacka: { contains: hledat, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(kategorie ? { categoryId: kategorie } : {}),
    };

    const [produkty, celkem] = await Promise.all([
      db.product.findMany({
        where: kde,
        orderBy: { createdAt: 'desc' },
        skip: (stranka - 1) * naStranku,
        take: naStranku,
        include: {
          category: { select: { id: true, nazev: true } },
          variants: { select: { id: true, velikost: true, skladem: true } },
          images: {
            orderBy: { poradi: 'asc' },
            select: { id: true, urlThumb: true, jeHlavni: true, stavZpracovani: true },
          },
          // Podle počtu objednávek se rozhoduje, jestli smí jít produkt smazat.
          _count: { select: { variants: true } },
        },
      }),
      db.product.count({ where: kde }),
    ]);

    return odpovedOk({
      produkty: produkty.map((p) => ({
        ...p,
        cena: Number(p.cena),
        cenaPoSleve: p.cenaPoSleve === null ? null : Number(p.cenaPoSleve),
        sklademCelkem: p.variants.reduce((s, v) => s + v.skladem, 0),
      })),
      celkem,
      stranka,
      stranek: Math.max(1, Math.ceil(celkem / naStranku)),
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}

/** POST /api/admin/produkty – založení produktu i s variantami a frontou na fotky. */
export async function POST(request: Request) {
  try {
    const admin = await overitAdmina();
    if (!admin) return odpovedNeautorizovano();
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const vstup = produktSchema.parse(await request.json());

    const kategorie = await db.category.findUnique({
      where: { id: vstup.categoryId },
      select: { id: true },
    });

    if (!kategorie) {
      return odpovedChyba('Zkontrolujte prosím vyplněné údaje.', 422, {
        categoryId: 'Vybraná kategorie neexistuje.',
      });
    }

    const slug = await unikatniSlug(vstup.nazev, async (kandidat) => {
      const nalezeno = await db.product.findUnique({ where: { slug: kandidat }, select: { id: true } });
      return nalezeno !== null;
    });

    // Fotky, které prošly kontrolou tokenu – zbytek zahazujeme, ať se do
    // databáze nedostane cesta, kterou by si klient vymyslel.
    const fotky = (vstup.fotky ?? []).filter((f) => jePlatnyToken(f.token));

    // Hlavní je právě jedna, i kdyby jich prohlížeč označil víc nebo žádnou.
    const hlavni = urcitHlavni(fotky);

    /*
     * § 12a zákona o ochraně spotřebitele. Nový produkt evidenci nemá, takže
     * referenční cenou pro případnou slevu je jeho základní cena – viz
     * `stavSlevyNovehoProduktu`. Zapisuje se rovnou při zakládání, aby se
     * produkt nikdy neocitl v katalogu se slevou a bez referenční ceny.
     */
    const stavSlevy = stavSlevyNovehoProduktu(vstup.cena, vstup.cenaPoSleve);

    const produkt = await db.product.create({
      data: {
        nazev: vstup.nazev.trim(),
        slug,
        popis: vstup.popis,
        categoryId: vstup.categoryId,
        cena: new Prisma.Decimal(vstup.cena),
        cenaPoSleve: vstup.cenaPoSleve == null ? null : new Prisma.Decimal(vstup.cenaPoSleve),
        znacka: vstup.znacka?.trim() || null,
        // U dárkového poukazu nedávají materiál ani péče smysl (sekce 6.2) –
        // zahazujeme je i na serveru, ne jen skrytím polí ve formuláři.
        material: vstup.jeDarkovyPoukaz ? null : vstup.material?.trim() || null,
        udrzba: vstup.jeDarkovyPoukaz ? null : vstup.udrzba?.trim() || null,
        sku: vstup.sku?.trim() || null,
        aktivni: vstup.aktivni ?? true,
        doporuceny: vstup.doporuceny ?? false,
        jeDarkovyPoukaz: vstup.jeDarkovyPoukaz ?? false,
        metaTitle: vstup.metaTitle?.trim() || null,
        metaDescription: vstup.metaDescription?.trim() || null,

        nejnizsiCena30DniHaleru: stavSlevy.nejnizsiCena30DniHaleru,
        slevaOd: stavSlevy.slevaOd,

        // GPSR (EU) 2023/988 – bez údajů o výrobci se výrobek nesmí nabízet.
        // U dárkového poukazu nejde o výrobek, proto se zahazují stejně
        // jako materiál a údržba.
        vyrobceNazev: vstup.jeDarkovyPoukaz ? null : vstup.vyrobceNazev?.trim() || null,
        vyrobceAdresa: vstup.jeDarkovyPoukaz ? null : vstup.vyrobceAdresa?.trim() || null,
        vyrobceEmail: vstup.jeDarkovyPoukaz ? null : vstup.vyrobceEmail?.trim() || null,
        odpovednaOsobaNazev: vstup.jeDarkovyPoukaz ? null : vstup.odpovednaOsobaNazev?.trim() || null,
        odpovednaOsobaAdresa: vstup.jeDarkovyPoukaz ? null : vstup.odpovednaOsobaAdresa?.trim() || null,
        odpovednaOsobaEmail: vstup.jeDarkovyPoukaz ? null : vstup.odpovednaOsobaEmail?.trim() || null,
        bezpecnostniUpozorneni: vstup.jeDarkovyPoukaz ? null : vstup.bezpecnostniUpozorneni?.trim() || null,
        ean: vstup.jeDarkovyPoukaz ? null : vstup.ean?.trim() || null,
        cisloSarze: vstup.jeDarkovyPoukaz ? null : vstup.cisloSarze?.trim() || null,
        zemePuvodu: vstup.jeDarkovyPoukaz ? null : vstup.zemePuvodu?.trim() || null,
        // Nařízení (EU) 1007/2011 – materiálové složení textilu v procentech.
        slozeniMaterialu: vstup.jeDarkovyPoukaz ? null : vstup.slozeniMaterialu?.trim() || null,
        obsahujeZivocisneCasti: vstup.jeDarkovyPoukaz ? false : (vstup.obsahujeZivocisneCasti ?? false),

        /* Text pro hledání se odvozuje z polí výš, takže musí vzniknout
           u každého zápisu produktu – jinak nový kousek v katalogu je, ale
           najít ho nejde. Kategorie tu není schválně, viz vyhledavani.ts. */
        hledaciText: hledaciTextProduktu({
          nazev: vstup.nazev,
          znacka: vstup.znacka,
          popis: vstup.popis,
          sku: vstup.sku,
          material: vstup.jeDarkovyPoukaz ? null : vstup.material,
        }),

        variants: {
          create: vstup.varianty.map((v) => ({
            velikost: v.velikost.trim(),
            barva: v.barva?.trim() || null,
            skladem: v.skladem,
            miry: vstup.jeDarkovyPoukaz ? Prisma.JsonNull : (v.miry ?? Prisma.JsonNull),
          })),
        },

        images: {
          create: fotky.map((f, i) => ({
            altText: f.altText?.trim() || `${vstup.nazev.trim()} – fotografie ${i + 1}`,
            poradi: i,
            jeHlavni: i === hlavni,
            stavZpracovani: 'CEKA' as const,
            originalSoubor: f.token,
          })),
        },
      },
      include: { images: { select: { id: true, originalSoubor: true } } },
    });

    // Výchozí bod cenové evidence. Bez něj by první zlevnění produktu nemělo
    // z čeho spočítat nejnižší cenu za 30 dnů.
    await zapsatCenu(db, produkt.id, vstup.cena, vstup.cenaPoSleve, `admin:${admin.email}`);

    // Teprve teď do fronty – kdyby zakládání produktu selhalo, nezůstane
    // ve frontě úloha ukazující na neexistující řádek.
    for (const obrazek of produkt.images) {
      if (!obrazek.originalSoubor) continue;

      const uloha: UlohaZpracovatObrazek = {
        obrazekId: obrazek.id,
        token: obrazek.originalSoubor,
      };
      await publishJob(FRONTY.ZPRACOVAT_OBRAZEK, uloha);
    }

    await zapsatDoAuditu(admin.email, 'produkt.vytvoren', 'Product', produkt.id, {
      nazev: produkt.nazev,
      pocetVariant: vstup.varianty.length,
      pocetFotek: fotky.length,
    });

    return odpovedOk(
      {
        id: produkt.id,
        slug: produkt.slug,
        nazev: produkt.nazev,
        pocetFotekVeFronte: produkt.images.length,
      },
      201
    );
  } catch (err) {
    return zpracovatChybu(err);
  }
}
