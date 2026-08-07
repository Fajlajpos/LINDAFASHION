/**
 * Košík uložený u účtu (sekce 5 zadání).
 *
 * Nepřihlášená zákaznice má košík jen v prohlížeči. Jakmile se přihlásí,
 * obsah se navíc ukládá k účtu, takže přežije odhlášení i přechod na jiné
 * zařízení.
 *
 * Při každém načtení se ověřuje dostupnost: pokud admin mezitím produkt
 * smazal nebo skryl, položka z košíku zmizí a zákaznice se to dozví hned –
 * ne až u pokladny.
 */
import { db } from './db';
import { czkNaHalere, type Halere } from './penize';

export interface PolozkaKosikuServer {
  variantId: string;
  productId: string;
  nazev: string;
  slug: string;
  velikost: string;
  barva: string | null;
  cena: number;
  cenaPoSleve: number | null;
  mnozstvi: number;
  obrazekUrl: string | null;
  skladem: number;
}

export interface NactenyKosik {
  polozky: PolozkaKosikuServer[];
  /** Co jsme z košíku museli odebrat a proč – zobrazí se zákaznici. */
  odebrano: Array<{ nazev: string; duvod: string }>;
  mezisoucetHaleru: Halere;
}

/** Sloučení dvou košíků – vyšší množství vyhrává. */
export function sloucitMnozstvi(a: number, b: number): number {
  // Schválně max, ne součet: kdyby se synchronizace zopakovala (obnovení
  // stránky, dvojklik), sčítáním by množství tiše narůstalo.
  return Math.max(a, b);
}

/**
 * Načte košík uživatele, ověří dostupnost a rovnou uklidí nedostupné položky.
 */
export async function nacistKosik(userId: string): Promise<NactenyKosik> {
  const kosik = await db.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: {
                include: {
                  images: {
                    where: { stavZpracovani: 'HOTOVO' },
                    orderBy: [{ jeHlavni: 'desc' }, { poradi: 'asc' }],
                    take: 1,
                    select: { urlThumb: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!kosik) return { polozky: [], odebrano: [], mezisoucetHaleru: 0 };

  const polozky: PolozkaKosikuServer[] = [];
  const odebrano: NactenyKosik['odebrano'] = [];
  const kSmazani: string[] = [];

  for (const item of kosik.items) {
    const produkt = item.variant.product;

    if (!produkt.aktivni) {
      odebrano.push({ nazev: produkt.nazev, duvod: 'Tento produkt už není v nabídce.' });
      kSmazani.push(item.id);
      continue;
    }

    if (item.variant.skladem === 0) {
      odebrano.push({
        nazev: `${produkt.nazev} (${item.variant.velikost})`,
        duvod: 'Tato velikost je vyprodaná.',
      });
      kSmazani.push(item.id);
      continue;
    }

    // Skladem je míň, než kolik měla zákaznice v košíku – množství snížíme,
    // ale položku necháme.
    const mnozstvi = Math.min(item.mnozstvi, item.variant.skladem);
    if (mnozstvi !== item.mnozstvi) {
      odebrano.push({
        nazev: `${produkt.nazev} (${item.variant.velikost})`,
        duvod: `Skladem zbývá jen ${item.variant.skladem} ks, množství jsme upravili.`,
      });
      await db.cartItem.update({ where: { id: item.id }, data: { mnozstvi } });
    }

    polozky.push({
      variantId: item.variantId,
      productId: produkt.id,
      nazev: produkt.nazev,
      slug: produkt.slug,
      velikost: item.variant.velikost,
      barva: item.variant.barva,
      cena: Number(produkt.cena),
      cenaPoSleve: produkt.cenaPoSleve === null ? null : Number(produkt.cenaPoSleve),
      mnozstvi,
      obrazekUrl: produkt.images[0]?.urlThumb ?? null,
      skladem: item.variant.skladem,
    });
  }

  if (kSmazani.length > 0) {
    await db.cartItem.deleteMany({ where: { id: { in: kSmazani } } });
  }

  const mezisoucetHaleru = polozky.reduce(
    (soucet, p) => soucet + czkNaHalere(p.cenaPoSleve ?? p.cena) * p.mnozstvi,
    0
  );

  return { polozky, odebrano, mezisoucetHaleru };
}

export interface VstupniPolozka {
  variantId: string;
  mnozstvi: number;
}

/**
 * Sloučí košík z prohlížeče s tím uloženým u účtu.
 * Volá se po přihlášení i při běžné synchronizaci.
 */
export async function sloucitKosik(userId: string, polozky: VstupniPolozka[]): Promise<NactenyKosik> {
  const kosik = await db.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
    include: { items: true },
  });

  // Varianty ověříme jedním dotazem – ať nevytváříme položky na neexistující
  // nebo skryté zboží.
  const idcka = polozky.map((p) => p.variantId).filter(Boolean);

  const platne = idcka.length
    ? await db.productVariant.findMany({
        where: { id: { in: idcka }, skladem: { gt: 0 }, product: { aktivni: true } },
        select: { id: true, skladem: true },
      })
    : [];

  const podleId = new Map(platne.map((v) => [v.id, v]));

  for (const vstup of polozky) {
    const varianta = podleId.get(vstup.variantId);
    if (!varianta) continue;

    const stavajici = kosik.items.find((i) => i.variantId === vstup.variantId);
    const pozadovano = Math.max(1, Math.min(vstup.mnozstvi, varianta.skladem));

    const mnozstvi = stavajici
      ? Math.min(sloucitMnozstvi(stavajici.mnozstvi, pozadovano), varianta.skladem)
      : pozadovano;

    await db.cartItem.upsert({
      where: { cartId_variantId: { cartId: kosik.id, variantId: vstup.variantId } },
      update: { mnozstvi },
      create: { cartId: kosik.id, variantId: vstup.variantId, mnozstvi },
    });
  }

  return nacistKosik(userId);
}

/** Nastaví množství jedné položky; nula ji z košíku odebere. */
export async function upravitPolozku(
  userId: string,
  variantId: string,
  mnozstvi: number
): Promise<NactenyKosik> {
  const kosik = await db.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
    select: { id: true },
  });

  if (mnozstvi <= 0) {
    await db.cartItem.deleteMany({ where: { cartId: kosik.id, variantId } });
    return nacistKosik(userId);
  }

  const varianta = await db.productVariant.findFirst({
    where: { id: variantId, product: { aktivni: true } },
    select: { skladem: true },
  });

  if (!varianta || varianta.skladem === 0) {
    await db.cartItem.deleteMany({ where: { cartId: kosik.id, variantId } });
    return nacistKosik(userId);
  }

  await db.cartItem.upsert({
    where: { cartId_variantId: { cartId: kosik.id, variantId } },
    update: { mnozstvi: Math.min(mnozstvi, varianta.skladem) },
    create: { cartId: kosik.id, variantId, mnozstvi: Math.min(mnozstvi, varianta.skladem) },
  });

  return nacistKosik(userId);
}

export async function vyprazdnitKosik(userId: string): Promise<void> {
  await db.cartItem.deleteMany({ where: { cart: { userId } } });
}
