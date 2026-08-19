/**
 * Odstoupení od smlouvy podle § 1829 a § 1830a o. z.
 *
 * § 1830a (transpozice směrnice (EU) 2023/2673, účinný od 19. 6. 2026) žádá,
 * aby e-shop nabídl viditelné a snadno dostupné tlačítko „Odstoupit od
 * smlouvy", za ním jednoduchý formulář, druhý potvrzovací krok proti omylu
 * a automatické potvrzení s datem a časem přijetí.
 *
 * Nejdůležitější vlastnost celého souboru: **odstoupení nesmí vyžadovat
 * přihlášení.** Právo na odstoupení má každý spotřebitel, ne jen ten, kdo si
 * u nás založil účet — a objednávka bez registrace žádný účet nemá. Dosud šla
 * žádost podat výhradně přes `/api/reklamace`, které volá `overitUzivatele()`,
 * takže zákaznice bez účtu neměla jak uplatnit nárok, který jí zákon dává.
 *
 * Autorizace proto stojí na dvou cestách, obou bez relace:
 *
 *   • **`verejnyToken`** — náhodný klíč objednávky, který už nese odkaz
 *     v potvrzovacím e-mailu. Stejný mechanismus jako u stažení faktury.
 *
 *   • **číslo objednávky + e-mail** — pro zákaznici, která e-mail nemá po ruce
 *     a přišla na stránku sama. Číslo objednávky jde po sobě, takže samo by
 *     stačilo k procházení cizích nákupů; ve dvojici s e-mailem ne.
 *     Číslo samotné se proto jako klíč **nikdy nepoužije**.
 */
import { db } from './db';
import { DNU_NA_ODSTOUPENI, lhutaNaOdstoupeni, lzeOdstoupit } from './lhuty';

/** Stavy, ve kterých objednávka už neplatí a odstupovat není od čeho. */
const UZAVRENE = ['ZRUSENA', 'VRACENA'] as const;

export interface NalezenaObjednavka {
  id: string;
  cisloObjednavky: string;
  verejnyToken: string;
  email: string | null;
  stav: string;
  datumDoruceni: Date | null;
  createdAt: Date;
  celkovaCena: number;
  polozky: Array<{ id: string; nazev: string; velikost: string; mnozstvi: number }>;
}

/** Co brání odstoupení. `null` = nic. */
export type DuvodOdmitnuti = 'nenalezeno' | 'uzavrena' | 'lhuta_vyprsela' | 'jiz_podano';

export interface VysledekHledani {
  objednavka: NalezenaObjednavka | null;
  duvod: DuvodOdmitnuti | null;
  /**
   * Položky, které už rozpracované odstoupení pokrývá.
   *
   * Odstoupit lze i **částečně** – vrátit jedny šaty ze tří a zbytek si nechat
   * (§ 1829 nikde neříká, že se odstupuje od celé objednávky). Formulář proto
   * musí umět říct „tuhle už vracíte" a zároveň nechat ostatní vybrat.
   * Prázdné pole = zatím nic.
   */
  jizPodanePolozky: string[];
}

const VYBER = {
  id: true,
  cisloObjednavky: true,
  verejnyToken: true,
  email: true,
  stav: true,
  datumDoruceni: true,
  createdAt: true,
  celkovaCena: true,
  items: {
    select: {
      id: true,
      mnozstvi: true,
      variant: { select: { velikost: true, product: { select: { nazev: true } } } },
    },
  },
} as const;

type Radek = {
  id: string;
  cisloObjednavky: string;
  verejnyToken: string;
  email: string | null;
  stav: string;
  datumDoruceni: Date | null;
  createdAt: Date;
  celkovaCena: unknown;
  items: Array<{
    id: string;
    mnozstvi: number;
    variant: { velikost: string; product: { nazev: string } };
  }>;
};

function naObjednavku(o: Radek): NalezenaObjednavka {
  return {
    id: o.id,
    cisloObjednavky: o.cisloObjednavky,
    verejnyToken: o.verejnyToken,
    email: o.email,
    stav: o.stav,
    datumDoruceni: o.datumDoruceni,
    createdAt: o.createdAt,
    celkovaCena: Number(o.celkovaCena),
    polozky: o.items.map((i) => ({
      id: i.id,
      nazev: i.variant.product.nazev,
      velikost: i.variant.velikost,
      mnozstvi: i.mnozstvi,
    })),
  };
}

/**
 * Klíč, kterým se objednávka otevírá **bez přihlášení**.
 *
 * Buď náhodný `verejnyToken` z odkazu v e-mailu, nebo dvojice číslo + e-mail.
 * Samotné číslo objednávky klíčem nikdy není: jde po sobě, takže by se s ním
 * daly procházet cizí nákupy.
 */
export type VerejnyKlic = { token: string } | { cisloObjednavky: string; email: string };

/**
 * Vyhledání objednávky veřejným klíčem.
 *
 * Sdílené s reklamacemi: právo reklamovat i odstoupit má i zákaznice bez
 * účtu a obě cesty musí ověřovat totožnost stejně přísně. Kdyby si každý
 * endpoint psal svůj dotaz, rozejdou se – a rozdíl by tentokrát znamenal,
 * že jedním z nich jde otevřít cizí objednávka.
 */
export async function najitObjednavkuKlicem(
  klic: VerejnyKlic
): Promise<NalezenaObjednavka | null> {
  const kde =
    'token' in klic
      ? { verejnyToken: klic.token }
      : {
          cisloObjednavky: klic.cisloObjednavky,
          // Porovnání e-mailu je bez ohledu na velikost písmen: zákaznice ho
          // do formuláře napíše, jak ji napadne, ne jak ho máme uložený.
          email: { equals: klic.email, mode: 'insensitive' as const },
        };

  const nalezena = await db.order.findFirst({ where: kde, select: VYBER });

  return nalezena ? naObjednavku(nalezena as Radek) : null;
}

/**
 * Najde objednávku, od které lze odstoupit.
 *
 * Vrací jednotný výsledek i pro „nenalezeno", aby volající nemusel rozlišovat
 * mezi neexistující objednávkou a špatným e-mailem. Kdyby se ty dva případy
 * rozlišily v odpovědi, dal by se endpoint použít ke zjišťování, které
 * číslo objednávky existuje.
 */
export async function najitProOdstoupeni(
  klic: VerejnyKlic,
  ted: Date = new Date()
): Promise<VysledekHledani> {
  const objednavka = await najitObjednavkuKlicem(klic);

  if (!objednavka) return { objednavka: null, duvod: 'nenalezeno', jizPodanePolozky: [] };

  if ((UZAVRENE as readonly string[]).includes(objednavka.stav)) {
    return { objednavka, duvod: 'uzavrena', jizPodanePolozky: [] };
  }

  if (!lzeOdstoupit(objednavka.datumDoruceni, ted)) {
    return { objednavka, duvod: 'lhuta_vyprsela', jizPodanePolozky: [] };
  }

  /*
   * Rozpracované odstoupení se nezakládá dvakrát. Druhý krok formuláře sice
   * omyl brzdí, ale dvojklik na potvrzení ani znovuposlání stránky nesmí
   * vyrobit dvě žádosti — majitelka by je rozplétala ručně a zákaznice by
   * dostala dvě potvrzení o tomtéž.
   *
   * Kontrola je ale **po položkách**, ne na celou objednávku. Původně stačila
   * jediná otevřená žádost a další odstoupení se odmítlo — což zákaznici,
   * která minulý týden vrátila jedny šaty a teď chce vrátit i druhé, upíralo
   * právo, na které jí lhůta pořád běží.
   */
  const otevrene = await db.reklamace.findMany({
    where: {
      orderId: objednavka.id,
      typ: 'VRACENI',
      stav: { in: ['PRIJATA', 'RESI_SE'] },
    },
    select: { orderItemId: true },
  });

  // `orderItemId: null` znamená odstoupení od celé objednávky – tím je
  // pokryté všechno a další žádost už nemá co přidat.
  const celaObjednavka = otevrene.some((r) => r.orderItemId === null);

  const jizPodanePolozky = otevrene
    .map((r) => r.orderItemId)
    .filter((id): id is string => id !== null);

  const vseVyrizeno =
    objednavka.polozky.length > 0 &&
    objednavka.polozky.every((p) => jizPodanePolozky.includes(p.id));

  if (celaObjednavka || vseVyrizeno) {
    return { objednavka, duvod: 'jiz_podano', jizPodanePolozky };
  }

  return { objednavka, duvod: null, jizPodanePolozky };
}

/** Text pro zákaznici k jednotlivým důvodům odmítnutí. */
export function zpravaKDuvodu(duvod: DuvodOdmitnuti): string {
  switch (duvod) {
    case 'nenalezeno':
      return 'Objednávku jsme podle zadaných údajů nenašli. Zkontrolujte prosím číslo objednávky a e-mail, který jste u ní použila.';
    case 'uzavrena':
      return 'Tahle objednávka už je zrušená nebo vrácená, takže od ní odstupovat není od čeho. Napište nám prosím a domluvíme se.';
    case 'lhuta_vyprsela':
      return `Zákonná lhůta ${DNU_NA_ODSTOUPENI} dnů od převzetí zboží už uplynula. Reklamovat vadu ale můžete i dál – po celou dobu záruky.`;
    case 'jiz_podano':
      return 'Vaše odstoupení už evidujeme a pracujeme na něm. Potvrzení jsme vám poslali e-mailem.';
  }
}

/** Do kdy lze odstoupit – pro zobrazení ve formuláři. `null` = zboží ještě nedorazilo. */
export function konecLhuty(objednavka: NalezenaObjednavka): Date | null {
  return lhutaNaOdstoupeni(objednavka.datumDoruceni);
}
