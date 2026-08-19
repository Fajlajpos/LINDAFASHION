/**
 * Testovací data pro integrační testy.
 *
 * Záměrně se skládají přes `objednavkaSchema`, ne ručně: test tak prochází
 * stejnou normalizací jako skutečný požadavek (PSČ bez mezer, e-mail malými
 * písmeny, kódy velkými). Kdyby se schéma změnilo, testy si toho všimnou.
 */
import { Prisma } from '@prisma/client';
import { db } from '../lib/db';
import { objednavkaSchema, type ObjednavkaVstup } from '../lib/validations/objednavka';

/**
 * Tabulky v pořadí, ve kterém je bezpečné je vyprázdnit.
 *
 * `CASCADE` pořadí sice řeší, ale vyjmenováváme je všechny, aby se na novou
 * tabulku nezapomnělo – zbytek po předchozím testu je nejčastější příčina
 * testu, který padá jen občas.
 */
const TABULKY = [
  'Reklamace',
  'OrderItem',
  'Order',
  'GiftCard',
  'DiscountCode',
  'CartItem',
  'Cart',
  'Favorite',
  'Address',
  'PasswordReset',
  'StockNotification',
  'NewsletterSubscriber',
  'ContactMessage',
  'AuditLog',
  'SouhlasZaznam',
  'PravniDokument',
  'ProductImage',
  'ProductVariant',
  // `PriceHistory` visí na produktu přes ON DELETE RESTRICT, takže musí padnout
  // dřív než on. `TRUNCATE ... CASCADE` by si poradilo i tak, ale pořadí je
  // tu proto, aby seznam odpovídal skutečné závislosti.
  'PriceHistory',
  'Product',
  'Category',
  'User',
  'Settings',
] as const;

export async function vycistitDatabazi(): Promise<void> {
  const seznam = TABULKY.map((t) => `"${t}"`).join(', ');
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${seznam} RESTART IDENTITY CASCADE`);
}

export interface NastaveniProTest {
  cenaDopravyPPL?: number | null;
  prahDopravaZdarma?: number | null;
  rezimDovolene?: boolean;
  zablokovatObjednavky?: boolean;
}

/**
 * Bez cen dopravy není objednávka spočitatelná – tohle je minimum.
 *
 * `update` nese stejná data jako `create`. Test si nastavení běžně přepisuje
 * podruhé (dovolená, práh dopravy zdarma) a s prázdným `update` by druhé
 * volání tiše neudělalo nic – testy pak padaly na hodnotách z prvního.
 */
export async function zalozitNastaveni(nastaveni: NastaveniProTest = {}): Promise<void> {
  const cenaPPL = nastaveni.cenaDopravyPPL === undefined ? 90 : nastaveni.cenaDopravyPPL;

  const data = {
    cenaDopravyPPL: cenaPPL === null ? null : new Prisma.Decimal(cenaPPL),
    prahDopravaZdarma:
      nastaveni.prahDopravaZdarma == null ? null : new Prisma.Decimal(nastaveni.prahDopravaZdarma),
    rezimDovolene: nastaveni.rezimDovolene ?? false,
    zablokovatObjednavky: nastaveni.zablokovatObjednavky ?? false,
  };

  await db.settings.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });
}

export interface ProduktProTest {
  cena?: number;
  cenaPoSleve?: number | null;
  skladem?: number;
  velikost?: string;
  aktivni?: boolean;
  nazev?: string;
}

export interface ZalozenyProdukt {
  productId: string;
  variantId: string;
  cena: number;
}

let poradiProduktu = 0;

export async function zalozitProdukt(volby: ProduktProTest = {}): Promise<ZalozenyProdukt> {
  poradiProduktu += 1;

  const kategorie = await db.category.upsert({
    where: { slug: 'testovaci' },
    update: {},
    create: { nazev: 'Testovací', slug: 'testovaci' },
  });

  const cena = volby.cena ?? 2500;

  const produkt = await db.product.create({
    data: {
      nazev: volby.nazev ?? `Testovací kousek ${poradiProduktu}`,
      slug: `testovaci-kousek-${poradiProduktu}`,
      popis: 'Popis pro testy.',
      categoryId: kategorie.id,
      cena: new Prisma.Decimal(cena),
      cenaPoSleve: volby.cenaPoSleve == null ? null : new Prisma.Decimal(volby.cenaPoSleve),
      aktivni: volby.aktivni ?? true,
      variants: {
        create: { velikost: volby.velikost ?? 'M', skladem: volby.skladem ?? 5 },
      },
    },
    include: { variants: true },
  });

  return { productId: produkt.id, variantId: produkt.variants[0].id, cena };
}

export async function zalozitSlevovyKod(
  kod: string,
  procentoSlevy: number,
  navic: { limitPouziti?: number | null; aktivni?: boolean; platnyDo?: Date | null } = {}
) {
  return db.discountCode.create({
    data: {
      kod,
      procentoSlevy,
      limitPouziti: navic.limitPouziti ?? null,
      aktivni: navic.aktivni ?? true,
      platnyDo: navic.platnyDo ?? null,
    },
  });
}

export async function zalozitPoukaz(kod: string, zustatek: number) {
  return db.giftCard.create({
    data: {
      kod,
      castka: new Prisma.Decimal(zustatek),
      zustatek: new Prisma.Decimal(zustatek),
    },
  });
}

/**
 * Vstup objednávky prohnaný skutečným schématem – stejně, jako by přišel
 * z prohlížeče.
 */
export function vstupObjednavky(
  polozky: Array<{ variantId: string; mnozstvi: number }>,
  navic: Partial<Record<string, unknown>> = {}
): ObjednavkaVstup {
  return objednavkaSchema.parse({
    polozky,
    email: 'Zakaznice@Example.CZ',
    dodaciJmenoPrijmeni: 'Marie Nováková',
    dodaciUlice: 'Vodičkova 45',
    dodaciMesto: 'Praha 1',
    dodaciPsc: '110 00',
    zpusobDopravy: 'ppl',
    zpusobPlatby: 'bankovni_prevod',
    souhlasPodminky: true,
    ...navic,
  });
}

/** Sklad varianty – zkratka pro asserty. */
export async function skladem(variantId: string): Promise<number> {
  const varianta = await db.productVariant.findUnique({
    where: { id: variantId },
    select: { skladem: true },
  });

  return varianta?.skladem ?? -1;
}
