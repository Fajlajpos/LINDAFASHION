/**
 * Cenová evidence a „nejnižší cena za 30 dnů" (§ 12a zák. č. 634/1992 Sb.).
 *
 * Novela zákona o ochraně spotřebitele účinná od 6. 1. 2023 zakazuje uvádět
 * slevu z ceny, kterou si prodávající krátce předtím sám nafoukl. U každé
 * slevy proto musí být uvedena **nejnižší cena, za kterou se zboží prodávalo
 * v době 30 dnů před poskytnutím slevy** – a ČOI po e-shopu chce, aby ji uměl
 * doložit. Za porušení hrozí pokuta do 5 000 000 Kč.
 *
 * Do téhle chvíle e-shop přeškrtnutou cenu zobrazoval, ale žádnou historii
 * neukládal: `Product.cena` se prostě přepsala a předchozí hodnota zmizela.
 * Doložit se nedalo nic.
 *
 * Dvě věci, které je snadné splést a jsou důvodem, proč tenhle soubor existuje:
 *
 *   1. **Referenční cena se zmrazí, nepočítá se průběžně.** Zákon mluví
 *      o 30 dnech *před poskytnutím* slevy. Kdyby se okno posouvalo,
 *      po pár dnech by do něj spadla samotná akční cena, referenční cena by
 *      se sesunula na ni a e-shop by vykazoval slevu sám ze sebe.
 *
 *   2. **Do okna patří i cena platná před jeho začátkem.** Když se cena
 *      naposledy měnila před půl rokem, v posledních 30 dnech není ani jeden
 *      záznam – přesto se za tu cenu celou dobu prodávalo. Hledá se proto
 *      i poslední záznam *starší* než okno.
 */
import { Prisma } from '@prisma/client';
import { db } from './db';
import { czkNaHalere, type CenaVstup, type Halere } from './penize';

/** Klient uvnitř transakce i mimo ni – zápis ceny patří do stejné transakce jako produkt. */
type Klient = Prisma.TransactionClient | typeof db;

/** Délka zákonného okna. */
export const DNU_OKNA = 30;

export function zacatekOkna(konec: Date = new Date()): Date {
  return new Date(konec.getTime() - DNU_OKNA * 24 * 60 * 60 * 1000);
}

/** Cena, za kterou se v daném okamžiku skutečně prodávalo. */
function prodejni(cena: CenaVstup, cenaPoSleve: CenaVstup | null | undefined): Halere {
  return cenaPoSleve == null ? czkNaHalere(cena) : czkNaHalere(cenaPoSleve);
}

/**
 * Nejnižší cena, za kterou se produkt nabízel v okně `[konec - 30 dnů, konec)`.
 *
 * Vrací `null`, když o produktu v té době neexistuje žádný záznam – tedy
 * u produktu založeného právě teď. Volající pak použije jeho základní cenu.
 */
export async function nejnizsiCenaVOkne(
  klient: Klient,
  productId: string,
  konec: Date = new Date()
): Promise<Halere | null> {
  const zacatek = zacatekOkna(konec);

  const [vOkne, predOknem] = await Promise.all([
    klient.priceHistory.aggregate({
      where: { productId, platnaOd: { gte: zacatek, lt: konec } },
      _min: { cenaHaleru: true },
    }),

    /*
     * Cena platná v okamžiku, kdy okno začalo. Bez ní by produkt, jehož cena
     * se dlouho neměnila, vypadal jako produkt bez historie – a referenční
     * cena by se vzala z aktuální (už zlevněné) hodnoty.
     */
    klient.priceHistory.findFirst({
      where: { productId, platnaOd: { lt: zacatek } },
      orderBy: { platnaOd: 'desc' },
      select: { cenaHaleru: true },
    }),
  ]);

  const kandidati = [vOkne._min.cenaHaleru, predOknem?.cenaHaleru ?? null].filter(
    (c): c is number => c !== null
  );

  return kandidati.length === 0 ? null : Math.min(...kandidati);
}

/** Zápis jednoho bodu cenové evidence. Řádky se nikdy nemění ani nemažou. */
export async function zapsatCenu(
  klient: Klient,
  productId: string,
  cena: CenaVstup,
  cenaPoSleve: CenaVstup | null | undefined,
  zdroj: string,
  platnaOd: Date = new Date()
): Promise<void> {
  await klient.priceHistory.create({
    data: {
      productId,
      cenaHaleru: prodejni(cena, cenaPoSleve),
      zakladniCenaHaleru: czkNaHalere(cena),
      jeSleva: cenaPoSleve != null,
      zdroj,
      platnaOd,
    },
  });
}

/** Stav slevy, jak se má zapsat na produkt. */
export interface StavSlevy {
  nejnizsiCena30DniHaleru: number | null;
  slevaOd: Date | null;
}

/**
 * Rozhodne, jakou referenční cenu má produkt po změně ceny nést.
 *
 * Tři případy:
 *
 *   • **Sleva nekončí ani nezačíná** (`cenaPoSleve` je pořád null) – nic se
 *     nedrží, obě pole jsou null.
 *
 *   • **Sleva pokračuje** – referenční cena i `slevaOd` zůstávají beze změny.
 *     Tohle je ten případ z § 12a odst. 3: „zvyšuje-li prodávající slevu
 *     postupně, uvede nejnižší cenu před **prvním** poskytnutím slevy."
 *     Bez toho by se dala povinnost obejít krokováním 500 → 490 → 480: každý
 *     krok by si vzal referenci z předchozího a inzerovaná sleva by se scvrkla
 *     na pár korun, přestože reálná sleva je stovka.
 *
 *   • **Sleva začíná** – referenční cena se spočítá z evidence a zmrazí.
 *
 * `puvodni` je stav produktu **před** zápisem. U nového produktu se předává
 * `null` a rozhoduje se, jako by sleva teprve začínala.
 */
export async function urcitStavSlevy(
  klient: Klient,
  productId: string,
  novaCena: CenaVstup,
  novaCenaPoSleve: CenaVstup | null | undefined,
  puvodni: { cenaPoSleve: unknown | null; nejnizsiCena30DniHaleru: number | null; slevaOd: Date | null } | null,
  ted: Date = new Date()
): Promise<StavSlevy> {
  if (novaCenaPoSleve == null) {
    return { nejnizsiCena30DniHaleru: null, slevaOd: null };
  }

  const slevaBezela = puvodni != null && puvodni.cenaPoSleve != null && puvodni.slevaOd != null;

  if (slevaBezela && puvodni.nejnizsiCena30DniHaleru != null) {
    return {
      nejnizsiCena30DniHaleru: puvodni.nejnizsiCena30DniHaleru,
      slevaOd: puvodni.slevaOd,
    };
  }

  /*
   * Sleva začíná. Referenční cena se bere z evidence; když produkt žádnou
   * nemá (zakládá se právě teď), použije se jeho základní cena – za nižší
   * se nikdy neprodával, takže je to zároveň nejnižší cena za celou dobu
   * prodeje. Přesně to § 12a odst. 2 chce u zboží v prodeji kratší než 30 dnů.
   */
  const zEvidence = await nejnizsiCenaVOkne(klient, productId, ted);

  return {
    nejnizsiCena30DniHaleru: zEvidence ?? czkNaHalere(novaCena),
    slevaOd: ted,
  };
}

/**
 * Stav slevy pro produkt, který se právě zakládá.
 *
 * Nový produkt nemá evidenci, takže se nedá nic dohledat – a nemusí:
 * § 12a odst. 2 pro zboží v prodeji kratší než 30 dnů říká, že referenční
 * cenou je nejnižší cena od začátku prodeje. Ta je u nového produktu
 * z definice jeho základní cena.
 *
 * Existuje odděleně od `urcitStavSlevy`, protože v okamžiku volání produkt
 * ještě nemá `id`, na které by se dala evidence dotázat.
 */
export function stavSlevyNovehoProduktu(
  cena: CenaVstup,
  cenaPoSleve: CenaVstup | null | undefined,
  ted: Date = new Date()
): StavSlevy {
  return cenaPoSleve == null
    ? { nejnizsiCena30DniHaleru: null, slevaOd: null }
    : { nejnizsiCena30DniHaleru: czkNaHalere(cena), slevaOd: ted };
}

/** Změnila se cena, za kterou se prodává, nebo základní cena? */
export function cenaSeZmenila(
  stara: { cena: CenaVstup; cenaPoSleve: CenaVstup | null },
  nova: { cena: CenaVstup; cenaPoSleve: CenaVstup | null | undefined }
): boolean {
  const staraPoSleve = stara.cenaPoSleve == null ? null : czkNaHalere(stara.cenaPoSleve);
  const novaPoSleve = nova.cenaPoSleve == null ? null : czkNaHalere(nova.cenaPoSleve);

  return czkNaHalere(stara.cena) !== czkNaHalere(nova.cena) || staraPoSleve !== novaPoSleve;
}
