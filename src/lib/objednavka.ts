/**
 * Založení objednávky.
 *
 * Celý zápis běží v jedné transakci: sklad, slevový kód i zůstatek poukazu
 * se mění spolu s objednávkou. Kdyby cokoliv selhalo, nezůstane po tom
 * odečtený kus ani vyčerpaný poukaz bez objednávky.
 *
 * Ceny se čtou z databáze, nikdy z toho, co poslal prohlížeč – jinak by si
 * kdokoliv mohl objednat šaty za korunu.
 */
import { Prisma } from '@prisma/client';
import { db } from './db';
import { czkNaHalere, halereNaCzk, prodejniCena, spocitatObjednavku, type Halere } from './penize';
import { nacistNastaveni } from './nastaveni';
import type { ObjednavkaVstup } from './validations/objednavka';

export interface ChybaObjednavky {
  zprava: string;
  pole?: Record<string, string>;
  status: number;
}

export interface VysledekObjednavky {
  id: string;
  cisloObjednavky: string;
  /** Klíč do odkazů, které musí fungovat i bez přihlášení. */
  verejnyToken: string;
  celkovaCenaKc: number;
  kUhradeKc: number;
  zpusobPlatby: string;
}

/** Ceny dopravy z administrace; bez vyplnění metoda není k dispozici. */
async function cenaDopravy(zpusob: string): Promise<Halere | null> {
  const nastaveni = await nacistNastaveni();

  const podleZpusobu: Record<string, number | null> = {
    zasilkovna: nastaveni.cenaDopravyZasilkovna,
    ppl: nastaveni.cenaDopravyPPL,
    ceska_posta: nastaveni.cenaDopravyCeskaPosta,
  };

  const cena = podleZpusobu[zpusob];
  return cena == null ? null : czkNaHalere(cena);
}

/**
 * Číslo objednávky ve tvaru `2026-00042`.
 *
 * Počítá se z počtu objednávek v daném roce. Při souběhu dvou objednávek ve
 * stejnou chvíli může vzniknout stejné číslo; unikátní index v databázi to
 * odmítne a `vytvoritObjednavku` celou transakci zopakuje (viz `POKUSY_O_CISLO`).
 *
 * `posun` slouží právě k tomu opakování – bez něj by druhý pokus spočítal
 * stejné číslo a narazil znovu.
 */
async function dalsiCisloObjednavky(tx: Prisma.TransactionClient, posun = 0): Promise<string> {
  const rok = new Date().getFullYear();

  const pocet = await tx.order.count({
    where: { createdAt: { gte: new Date(rok, 0, 1) } },
  });

  return `${rok}-${String(pocet + 1 + posun).padStart(5, '0')}`;
}

/** Kolikrát se zkusí najít volné číslo objednávky, než to vzdáme. */
const POKUSY_O_CISLO = 5;

/** Kolize unikátního indexu – v Prismě chyba P2002. */
function jeKolizeCisla(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002' &&
    String(err.meta?.target ?? '').includes('cisloObjednavky')
  );
}

export async function vytvoritObjednavku(
  vstup: ObjednavkaVstup,
  userId: string | null
): Promise<{ ok: true; data: VysledekObjednavky } | { ok: false; chyba: ChybaObjednavky }> {
  const nastaveni = await nacistNastaveni();

  // Sekce 6.7: majitelka může na dobu dovolené objednávání úplně vypnout.
  if (nastaveni.rezimDovolene && nastaveni.zablokovatObjednavky) {
    return {
      ok: false,
      chyba: {
        zprava: 'Objednávky jsou momentálně pozastavené kvůli naší nepřítomnosti. Zkuste to prosím po našem návratu.',
        status: 409,
      },
    };
  }

  const doprava = await cenaDopravy(vstup.zpusobDopravy);
  if (doprava === null) {
    return {
      ok: false,
      chyba: {
        zprava: 'Zkontrolujte prosím vyplněné údaje.',
        pole: { zpusobDopravy: 'Tento způsob dopravy momentálně nenabízíme.' },
        status: 422,
      },
    };
  }

  if (vstup.zpusobDopravy === 'zasilkovna' && !vstup.vydejniMistoId) {
    return {
      ok: false,
      chyba: {
        zprava: 'Zkontrolujte prosím vyplněné údaje.',
        pole: { vydejniMistoId: 'Vyberte prosím výdejní místo.' },
        status: 422,
      },
    };
  }

  /** Jeden pokus o zápis; `posun` posouvá pořadové číslo po kolizi. */
  const zapsat = (posun: number) =>
    db.$transaction(async (tx) => {
      // --- 1. Zboží a sklad ------------------------------------------------
      const varianty = await tx.productVariant.findMany({
        where: { id: { in: vstup.polozky.map((p) => p.variantId) } },
        include: { product: true },
      });

      const podleId = new Map(varianty.map((v) => [v.id, v]));
      const polozky: Array<{ variantId: string; mnozstvi: number; cenaHaleru: Halere }> = [];

      for (const vstupniPolozka of vstup.polozky) {
        const varianta = podleId.get(vstupniPolozka.variantId);

        if (!varianta || !varianta.product.aktivni) {
          throw new ChybaZbozi('Některý produkt v košíku už není v nabídce. Zkontrolujte prosím košík.');
        }

        if (varianta.skladem < vstupniPolozka.mnozstvi) {
          throw new ChybaZbozi(
            varianta.skladem === 0
              ? `„${varianta.product.nazev} (${varianta.velikost})" je vyprodaná.`
              : `Z „${varianta.product.nazev} (${varianta.velikost})" zbývá jen ${varianta.skladem} ks.`
          );
        }

        polozky.push({
          variantId: varianta.id,
          mnozstvi: vstupniPolozka.mnozstvi,
          // Cena z databáze, ne z prohlížeče.
          cenaHaleru: prodejniCena(varianta.product.cena, varianta.product.cenaPoSleve),
        });
      }

      // --- 2. Slevový kód --------------------------------------------------
      let discountCodeId: string | null = null;
      let procentoSlevy = 0;

      if (vstup.slevovyKod) {
        const kod = await tx.discountCode.findUnique({ where: { kod: vstup.slevovyKod } });
        const ted = new Date();

        const platny =
          kod &&
          kod.aktivni &&
          (!kod.platnyOd || kod.platnyOd <= ted) &&
          (!kod.platnyDo || kod.platnyDo >= ted) &&
          (kod.limitPouziti === null || kod.pocetPouziti < kod.limitPouziti);

        if (!platny) {
          throw new ChybaPole('slevovyKod', 'Tento slevový kód není platný.');
        }

        discountCodeId = kod.id;
        procentoSlevy = kod.procentoSlevy;
      }

      // --- 3. Dárkový poukaz ----------------------------------------------
      let giftCardId: string | null = null;
      let zustatekPoukazu: Halere = 0;

      if (vstup.darkovyPoukaz) {
        const poukaz = await tx.giftCard.findUnique({ where: { kod: vstup.darkovyPoukaz } });
        const ted = new Date();

        const platny =
          poukaz &&
          poukaz.aktivni &&
          (!poukaz.platnyDo || poukaz.platnyDo >= ted) &&
          czkNaHalere(poukaz.zustatek) > 0;

        if (!platny) {
          throw new ChybaPole('darkovyPoukaz', 'Tento dárkový poukaz není platný nebo je vyčerpaný.');
        }

        giftCardId = poukaz.id;
        zustatekPoukazu = czkNaHalere(poukaz.zustatek);
      }

      // --- 4. Výpočet ------------------------------------------------------
      // Doprava zdarma se posuzuje z ceny zboží po slevě.
      const bezDopravy = spocitatObjednavku({
        polozky: polozky.map((p) => ({ cenaZaKus: p.cenaHaleru, mnozstvi: p.mnozstvi })),
        procentoSlevy,
      });

      const prah = nastaveni.prahDopravaZdarma;
      const dopravaVysledna =
        prah !== null && halereNaCzk(bezDopravy.mezisoucet - bezDopravy.sleva) >= prah ? 0 : doprava;

      const rozpis = spocitatObjednavku({
        polozky: polozky.map((p) => ({ cenaZaKus: p.cenaHaleru, mnozstvi: p.mnozstvi })),
        procentoSlevy,
        doprava: dopravaVysledna,
        zustatekPoukazu,
      });

      // --- 5. Zápis --------------------------------------------------------
      const cisloObjednavky = await dalsiCisloObjednavky(tx, posun);

      const objednavka = await tx.order.create({
        data: {
          cisloObjednavky,
          userId,
          email: vstup.email.trim().toLowerCase(),
          stav: 'NOVA',
          celkovaCena: new Prisma.Decimal(halereNaCzk(rozpis.celkem)),
          discountCodeId,
          giftCardId,
          castkaZGiftCard: rozpis.zPoukazu > 0 ? new Prisma.Decimal(halereNaCzk(rozpis.zPoukazu)) : null,
          zpusobDopravy: vstup.zpusobDopravy,
          vydejniMistoId: vstup.vydejniMistoId || null,
          vydejniMistoNazev: vstup.vydejniMistoNazev || null,
          zpusobPlatby: vstup.zpusobPlatby,
          // Poukazem plně uhrazená objednávka je zaplacená hned.
          stavPlatby: rozpis.kUhrade === 0 ? 'ZAPLACENO' : 'CEKA_NA_PLATBU',
          poznamka: vstup.poznamka?.trim() || null,

          // Snímek adresy, ne odkaz na Address – objednávka se nesmí změnit,
          // když si zákaznice adresu později upraví (sekce 7).
          dodaciJmenoPrijmeni: vstup.dodaciJmenoPrijmeni.trim(),
          dodaciUlice: vstup.dodaciUlice.trim(),
          dodaciMesto: vstup.dodaciMesto.trim(),
          dodaciPsc: vstup.dodaciPsc,
          dodaciZeme: vstup.dodaciZeme || 'CZ',
          dodaciTelefon: vstup.dodaciTelefon,

          items: {
            create: polozky.map((p) => ({
              variantId: p.variantId,
              mnozstvi: p.mnozstvi,
              cenaVDobeNakupu: new Prisma.Decimal(halereNaCzk(p.cenaHaleru)),
            })),
          },
        },
        select: { id: true, cisloObjednavky: true, verejnyToken: true },
      });

      /*
       * Sklad dolů.
       *
       * Podmínka `skladem >= mnozstvi` je součástí UPDATE, ne samostatné
       * kontroly před ním. Kontrola v kroku 1 slouží jen k hezké hlášce –
       * mezi ní a zápisem je mezera, do které se vejde souběžná objednávka,
       * a samotný `decrement` by pak sklad poslal do minusu. Když podmínka
       * neprojde, řádek se nezmění a celá transakce se zruší.
       */
      for (const p of polozky) {
        const zmeneno = await tx.productVariant.updateMany({
          where: { id: p.variantId, skladem: { gte: p.mnozstvi } },
          data: { skladem: { decrement: p.mnozstvi } },
        });

        if (zmeneno.count !== 1) {
          const varianta = podleId.get(p.variantId);
          throw new ChybaZbozi(
            varianta
              ? `„${varianta.product.nazev} (${varianta.velikost})" nám mezitím někdo vykoupil. Upravte prosím množství v košíku.`
              : 'Některý produkt v košíku mezitím došel. Zkontrolujte prosím košík.'
          );
        }
      }

      if (discountCodeId) {
        await tx.discountCode.update({
          where: { id: discountCodeId },
          data: { pocetPouziti: { increment: 1 } },
        });
      }

      if (giftCardId && rozpis.zPoukazu > 0) {
        const zbyva = zustatekPoukazu - rozpis.zPoukazu;
        await tx.giftCard.update({
          where: { id: giftCardId },
          data: {
            zustatek: new Prisma.Decimal(halereNaCzk(zbyva)),
            // Vyčerpaný poukaz deaktivujeme, ať se nenabízí znovu.
            aktivni: zbyva > 0,
          },
        });
      }

      // Košík u účtu je vyřízený.
      if (userId) {
        await tx.cartItem.deleteMany({ where: { cart: { userId } } });
      }

      return {
        id: objednavka.id,
        cisloObjednavky: objednavka.cisloObjednavky,
        verejnyToken: objednavka.verejnyToken,
        celkovaCenaKc: halereNaCzk(rozpis.celkem),
        kUhradeKc: halereNaCzk(rozpis.kUhrade),
        zpusobPlatby: vstup.zpusobPlatby,
      };
    });

  try {
    let vysledek: VysledekObjednavky | null = null;

    // Dvě objednávky odeslané ve stejnou vteřinu spočítají stejné pořadové
    // číslo; unikátní index druhou odmítne. Bez opakování by zákaznici vyskočila
    // nesrozumitelná hláška o obsazené hodnotě a nákup by propadl.
    for (let pokus = 0; pokus < POKUSY_O_CISLO; pokus++) {
      try {
        vysledek = await zapsat(pokus);
        break;
      } catch (err) {
        if (!jeKolizeCisla(err) || pokus === POKUSY_O_CISLO - 1) throw err;
      }
    }

    if (!vysledek) {
      // Sem se dostaneme jen kdyby smyčka doběhla bez výsledku i bez výjimky.
      throw new Error('Nepodařilo se přidělit číslo objednávky.');
    }

    return { ok: true, data: vysledek };
  } catch (err) {
    if (err instanceof ChybaZbozi) {
      return { ok: false, chyba: { zprava: err.message, status: 409 } };
    }

    if (err instanceof ChybaPole) {
      return {
        ok: false,
        chyba: {
          zprava: 'Zkontrolujte prosím vyplněné údaje.',
          pole: { [err.pole]: err.message },
          status: 422,
        },
      };
    }

    throw err;
  }
}

/** Zboží mezitím zmizelo nebo se vyprodalo. */
class ChybaZbozi extends Error {}

/** Chyba patřící ke konkrétnímu poli formuláře. */
class ChybaPole extends Error {
  constructor(
    public pole: string,
    zprava: string
  ) {
    super(zprava);
  }
}
