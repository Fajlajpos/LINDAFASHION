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
import {
  czkNaHalere,
  halereNaCzk,
  prodejniCena,
  spocitatObjednavku,
  type Halere,
  type RozpisObjednavky,
} from './penize';
import { dphZCelkem, nacistNastaveni, type NastaveniWebu } from './nastaveni';
import { snimekDodavatele } from './dodavatel';
import { verzeProObjednavku } from './pravni-dokumenty';
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
  /**
   * Verze obchodních podmínek zapsaná k objednávce.
   *
   * Jde ven proto, aby ji potvrzovací e-mail mohl uvést. § 1822 chce potvrzení
   * smlouvy v textové podobě – a „souhlasila s podmínkami" bez uvedení verze
   * zákaznici neřekne, s čím vlastně. E-mail je trvalý nosič, který jí zůstane
   * i když se znění na webu změní.
   */
  verzePodminek: string;
}

/** Ceny dopravy z administrace; bez vyplnění metoda není k dispozici. */
function cenaDopravy(zpusob: string, nastaveni: NastaveniWebu): Halere | null {
  const podleZpusobu: Record<string, number | null> = {
    zasilkovna: nastaveni.cenaDopravyZasilkovna,
    ppl: nastaveni.cenaDopravyPPL,
    ceska_posta: nastaveni.cenaDopravyCeskaPosta,
  };

  const cena = podleZpusobu[zpusob];
  return cena == null ? null : czkNaHalere(cena);
}

/**
 * Číselná řada objednávek se láme podle českého kalendáře, ne podle časové
 * zóny kontejneru – ta je v Dockeru UTC. Objednávka z 1. ledna 00:30 SEČ je
 * v UTC ještě 31. prosince, takže se bez tohohle počítala do minulého roku
 * a dostala číslo, které už bylo obsazené.
 */
const CASOVA_ZONA = 'Europe/Prague';

function aktualniRok(): number {
  const formatovac = new Intl.DateTimeFormat('en-CA', { timeZone: CASOVA_ZONA, year: 'numeric' });
  return Number(formatovac.format(new Date()));
}

/**
 * Půlnoc 1. ledna v Praze jako okamžik v UTC.
 *
 * 1. ledna je vždycky středoevropský čas (UTC+1) – letní čas začíná až
 * v březnu – takže stačí odečíst hodinu a není potřeba obecný převod zón.
 */
function zacatekRoku(rok: number): Date {
  return new Date(Date.UTC(rok, 0, 1, -1));
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
  const rok = aktualniRok();

  const pocet = await tx.order.count({
    where: { createdAt: { gte: zacatekRoku(rok) } },
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

/**
 * Doprovodné údaje o požadavku, které patří k dokladu o uzavření smlouvy.
 *
 * Nejsou součástí `ObjednavkaVstup` schválně: `ObjednavkaVstup` je to, co poslal
 * prohlížeč, a IP si prohlížeč určovat nesmí. Tohle zjišťuje server.
 */
export interface KontextObjednavky {
  ip?: string | null;
}

/** Co z objednávky potřebuje výpočet ceny – náhled ve shrnutí posílá jen tohle. */
export type VstupNabidky = Pick<ObjednavkaVstup, 'polozky' | 'zpusobDopravy' | 'slevovyKod' | 'darkovyPoukaz'>;

export interface PolozkaNabidky {
  variantId: string;
  mnozstvi: number;
  /** Prodejní cena za kus z databáze. */
  cenaHaleru: Halere;
  nazev: string;
  velikost: string;
  barva: string | null;
}

/** Spočítaná nabídka: přesně to, co by objednávka v tuhle chvíli uložila. */
interface Nabidka {
  polozky: PolozkaNabidky[];
  discountCodeId: string | null;
  procentoSlevy: number;
  /** Zapamatovaný limit – kontrola vyčerpání patří až do `UPDATE` při zápisu. */
  limitPouziti: number | null;
  giftCardId: string | null;
  rozpis: RozpisObjednavky;
}

/**
 * Zboží, kód, poukaz a výpočet – jediné místo, které říká, kolik objednávka stojí.
 *
 * Volá ho transakce objednávky i náhled ve shrnutí pokladny. Dvě kopie téhož
 * výpočtu by se dřív nebo později rozešly a shrnutí by ukazovalo jinou částku,
 * než jakou pak objednávka naúčtuje – přesně to, co § 1826a odst. 1 o. z. chce
 * vyloučit: cenu musí zákaznice vidět **bezprostředně před** odesláním.
 *
 * Nic nezapisuje. Kontroly tu slouží k hezké hlášce; o skladu, limitu kódu
 * a zůstatku poukazu rozhoduje až podmínka v `UPDATE` při zápisu.
 */
async function spocitatNabidku(
  klient: Prisma.TransactionClient,
  vstup: VstupNabidky,
  nastaveni: NastaveniWebu,
  doprava: Halere
): Promise<Nabidka> {
  // --- 1. Zboží a sklad --------------------------------------------------
  const varianty = await klient.productVariant.findMany({
    where: { id: { in: vstup.polozky.map((p) => p.variantId) } },
    include: { product: true },
  });

  const podleId = new Map(varianty.map((v) => [v.id, v]));
  const polozky: PolozkaNabidky[] = [];

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
      nazev: varianta.product.nazev,
      velikost: varianta.velikost,
      barva: varianta.barva,
    });
  }

  // --- 2. Slevový kód ----------------------------------------------------
  let discountCodeId: string | null = null;
  let procentoSlevy = 0;
  let limitPouziti: number | null = null;

  if (vstup.slevovyKod) {
    const kod = await klient.discountCode.findUnique({ where: { kod: vstup.slevovyKod } });
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
    limitPouziti = kod.limitPouziti;
  }

  // --- 3. Dárkový poukaz -------------------------------------------------
  let giftCardId: string | null = null;
  let zustatekPoukazu: Halere = 0;

  if (vstup.darkovyPoukaz) {
    const poukaz = await klient.giftCard.findUnique({ where: { kod: vstup.darkovyPoukaz } });
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

  // --- 4. Výpočet --------------------------------------------------------
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

  return { polozky, discountCodeId, procentoSlevy, limitPouziti, giftCardId, rozpis };
}

/** Dopravce bez ceny v administraci nejde spočítat, a tedy ani objednat. */
const CHYBA_DOPRAVY: ChybaObjednavky = {
  zprava: 'Zkontrolujte prosím vyplněné údaje.',
  pole: { zpusobDopravy: 'Tento způsob dopravy momentálně nenabízíme.' },
  status: 422,
};

export interface NahledObjednavky {
  polozky: PolozkaNabidky[];
  procentoSlevy: number;
  rozpis: RozpisObjednavky;
}

/**
 * Náhled pro shrnutí pokladny – stejný výpočet jako objednávka, bez zápisu.
 *
 * Shrnutí dřív počítal prohlížeč z cen uložených v košíku. Ty se ověřují jen
 * při načtení stránky, takže když majitelka mezitím změnila cenu nebo poukaz
 * někdo dočerpal, zákaznice potvrdila jednu částku a objednávka uložila jinou.
 */
export async function nahledObjednavky(
  vstup: VstupNabidky
): Promise<{ ok: true; data: NahledObjednavky } | { ok: false; chyba: ChybaObjednavky }> {
  const nastaveni = await nacistNastaveni();

  const doprava = cenaDopravy(vstup.zpusobDopravy, nastaveni);
  if (doprava === null) return { ok: false, chyba: CHYBA_DOPRAVY };

  try {
    const nabidka = await spocitatNabidku(db, vstup, nastaveni, doprava);
    return {
      ok: true,
      data: { polozky: nabidka.polozky, procentoSlevy: nabidka.procentoSlevy, rozpis: nabidka.rozpis },
    };
  } catch (err) {
    const chyba = prevestChybu(err);
    if (chyba) return { ok: false, chyba };
    throw err;
  }
}

export async function vytvoritObjednavku(
  vstup: ObjednavkaVstup,
  userId: string | null,
  kontext: KontextObjednavky = {}
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

  const doprava = cenaDopravy(vstup.zpusobDopravy, nastaveni);
  if (doprava === null) return { ok: false, chyba: CHYBA_DOPRAVY };

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

  /*
   * Verze podmínek, se kterou zákaznice souhlasí, se zjistí **jednou před
   * transakcí**. Uvnitř by se ptala znovu při každém opakování kvůli kolizi
   * čísla objednávky – a v tu chvíli by se dvě opakování téže objednávky
   * mohla trefit do různých verzí, kdyby mezi nimi nabyla účinnosti nová.
   */
  const verzePodminek = await verzeProObjednavku(nastaveni.verzePodminek);

  /** Jeden pokus o zápis; `posun` posouvá pořadové číslo po kolizi. */
  const zapsat = (posun: number) =>
    db.$transaction(async (tx) => {
      const { polozky, discountCodeId, limitPouziti, giftCardId, rozpis } = await spocitatNabidku(
        tx,
        vstup,
        nastaveni,
        doprava
      );

      /*
       * Částka, kterou zákaznice viděla ve shrnutí, musí být ta, kterou
       * objednávka uloží (§ 1826a odst. 1 o. z.). Když se mezitím změnila
       * cena, zůstatek poukazu nebo vypršel kód, objednávka se nezaloží
       * a shrnutí se načte znovu – raději o krok víc než smlouva za jinou
       * cenu, než jakou potvrdila. Kontrola je před prvním zápisem, takže
       * sklad, kód i poukaz zůstanou nedotčené.
       */
      if (
        vstup.ocekavanaCena &&
        (vstup.ocekavanaCena.celkemHaleru !== rozpis.celkem ||
          vstup.ocekavanaCena.kUhradeHaleru !== rozpis.kUhrade)
      ) {
        throw new ChybaCeny();
      }
      // --- 5. Zápis --------------------------------------------------------
      const cisloObjednavky = await dalsiCisloObjednavky(tx, posun);

      const objednavka = await tx.order.create({
        data: {
          cisloObjednavky,
          userId,
          email: vstup.email.trim().toLowerCase(),
          stav: 'NOVA',

          /*
           * Rozpis se ukládá celý, ne jen výsledná částka.
           *
           * Faktura si dřív slevu dopočítávala z aktuálního `procentoSlevy`
           * slevového kódu a dopravu brala jako zbytek do celkové ceny. Jakmile
           * majitelka u kódu procento změnila, vyšel doklad pro dávno uzavřenou
           * objednávku jinak – a rozdíl tiše spolkla doprava. Rozpis patří
           * k dokladu, takže musí být zmrazený stejně jako doručovací adresa.
           */
          mezisoucet: new Prisma.Decimal(halereNaCzk(rozpis.mezisoucet)),
          slevaCastka: new Prisma.Decimal(halereNaCzk(rozpis.sleva)),
          cenaDopravy: new Prisma.Decimal(halereNaCzk(rozpis.doprava)),
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
          zaplacenoAt: rozpis.kUhrade === 0 ? new Date() : null,
          poznamka: vstup.poznamka?.trim() || null,

          /*
           * Doklad o uzavření smlouvy (§ 1820 a násl. o. z.).
           *
           * `souhlasPodminky` se do téhle chvíle jen zvalidoval a zahodil.
           * Při sporu ale musí prodávající doložit, **s čím přesně** zákaznice
           * souhlasila – samotné „zaškrtla to“ nestačí, když se znění podmínek
           * mezitím změnilo. Proto okamžik i verze.
           *
           * Schéma vyžaduje `souhlasPodminky: z.literal(true)`, takže sem se
           * objednávka bez souhlasu vůbec nedostane a datum je bezpečné.
           */
          souhlasPodminkyAt: new Date(),
          verzePodminek,
          ipObjednavky: kontext.ip ?? null,

          /*
           * Snímek režimu DPH, ne odkaz na aktuální nastavení.
           *
           * Kdyby se majitelka stala plátcem později, přepočítaly by se podle
           * dnešního přepínače i loňské doklady – a faktura je účetní doklad,
           * který se zpětně měnit nesmí.
           */
          jePlatceDph: nastaveni.jePlatceDph,
          sazbaDph: nastaveni.jePlatceDph ? nastaveni.sazbaDph : 0,
          dphHaleru: dphZCelkem(rozpis.celkem, nastaveni),

          /*
           * Identifikace dodavatele ve stejném okamžiku, ze stejného důvodu.
           *
           * Doklad se přegeneruje pokaždé, když se objednávka označí jako
           * zaplacená. Bez snímku by si při tom sáhl do aktuálního `Settings` –
           * takže po přestěhování nebo změně IČO by loňská faktura vyšla
           * s dnešní hlavičkou.
           */
          // Přetypování kvůli Prismě: `InputJsonValue` chce indexovou signaturu,
          // kterou pojmenovaný interface nemá. Tvar hlídá `SnimekDodavatele`
          // na vstupu do funkce, ne až tady.
          dodavatelSnapshot: { ...snimekDodavatele(nastaveni) } as Prisma.InputJsonObject,

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
          throw new ChybaZbozi(
            `„${p.nazev} (${p.velikost})" nám mezitím někdo vykoupil. Upravte prosím množství v košíku.`
          );
        }
      }

      /*
       * Počitadlo slevového kódu – podmínka na vyčerpání je součástí UPDATE.
       *
       * Kontrola v kroku 2 je jen kvůli hlášce. Mezi ní a tímhle zápisem je
       * mezera, do které se vejde souběžná objednávka, takže kód s limitem
       * „50 použití" se dal uplatnit i po padesáté první. `increment` sám je
       * atomický, ale nevyčerpanost nehlídá – tu musí říct `where`.
       */
      if (discountCodeId) {
        const zmeneno = await tx.discountCode.updateMany({
          where: {
            id: discountCodeId,
            // `limitPouziti` je zapamatovaná konstanta, ne druhý sloupec –
            // Prisma dva sloupce v `where` porovnat neumí.
            ...(limitPouziti === null ? {} : { pocetPouziti: { lt: limitPouziti } }),
          },
          data: { pocetPouziti: { increment: 1 } },
        });

        if (zmeneno.count !== 1) {
          throw new ChybaPole('slevovyKod', 'Tento slevový kód byl mezitím vyčerpán.');
        }
      }

      /*
       * Zůstatek poukazu – tentýž vzorec, a tady je to nejdražší.
       *
       * Dřív se zapisovala absolutní hodnota spočítaná ze zůstatku načteného
       * o pár řádků výš (`zustatek: zbyva`). Dvě objednávky odeslané naráz se
       * stejným kódem obě přečetly 1000, obě zapsaly 0 – a poukaz zaplatil
       * obě. Klasický ztracený zápis, jen se v něm ztrácejí peníze.
       *
       * `decrement` s podmínkou `zustatek >= odečítaná částka` je atomický:
       * druhá objednávka podmínku nesplní, `count` vyjde 0 a celá transakce
       * se zruší. Je to totéž, co dělá sklad o pár řádků výš.
       */
      if (giftCardId && rozpis.zPoukazu > 0) {
        const odecist = new Prisma.Decimal(halereNaCzk(rozpis.zPoukazu));

        const zmeneno = await tx.giftCard.updateMany({
          where: { id: giftCardId, zustatek: { gte: odecist } },
          data: { zustatek: { decrement: odecist } },
        });

        if (zmeneno.count !== 1) {
          throw new ChybaPole(
            'darkovyPoukaz',
            'Zůstatek poukazu se mezitím změnil. Načtěte prosím stránku znovu.'
          );
        }

        /*
         * Vyčerpaný poukaz se deaktivuje, ať se nenabízí znovu. Samostatným
         * dotazem s podmínkou na nulu, ne polem v předchozím `data`: tam by
         * se `aktivni` odvozovalo z toho, co jsme si přečetli, tedy zase
         * z hodnoty, kterou nám mezitím mohl někdo změnit pod rukama.
         */
        await tx.giftCard.updateMany({
          where: { id: giftCardId, zustatek: { lte: new Prisma.Decimal(0) } },
          data: { aktivni: false },
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
        verzePodminek,
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
    const chyba = prevestChybu(err);
    if (chyba) return { ok: false, chyba };
    throw err;
  }
}

/** Očekávané chyby výpočtu na odpověď pro formulář; neznámé vrací `null`. */
function prevestChybu(err: unknown): ChybaObjednavky | null {
  if (err instanceof ChybaZbozi) {
    return { zprava: err.message, status: 409 };
  }

  if (err instanceof ChybaCeny) {
    // Pole `ocekavanaCena` podle něj shrnutí pozná, že má náhled načíst znovu.
    return { zprava: err.message, pole: { ocekavanaCena: err.message }, status: 409 };
  }

  if (err instanceof ChybaPole) {
    return {
      zprava: 'Zkontrolujte prosím vyplněné údaje.',
      pole: { [err.pole]: err.message },
      status: 422,
    };
  }

  return null;
}

/** Zboží mezitím zmizelo nebo se vyprodalo. */
class ChybaZbozi extends Error {}

/** Částka se od zobrazení shrnutí změnila. */
class ChybaCeny extends Error {
  constructor() {
    super('Cena objednávky se od zobrazení souhrnu změnila. Zkontrolujte prosím nový souhrn a objednejte znovu.');
  }
}

/** Chyba patřící ke konkrétnímu poli formuláře. */
class ChybaPole extends Error {
  constructor(
    public pole: string,
    zprava: string
  ) {
    super(zprava);
  }
}
