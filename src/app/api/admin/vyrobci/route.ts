import { db } from '@/lib/db';
import { odpovedOk, zpracovatChybu } from '@/lib/api';
import { overitAdmina, odpovedNeautorizovano } from '@/lib/admin';
import { nacistNastaveni } from '@/lib/nastaveni';

/*
 * Jako každá admin route: ověřuje přihlášení přes `cookies()`, takže ji Next
 * nemůže předgenerovat. Bez téhle řádky se o to při buildu stejně pokusí
 * a vyplívne `Dynamic server usage` – chyba, která nic neznamená, ale výpis
 * buildu zaplevělí natolik, že se v něm skutečná chyba přehlédne.
 */
export const dynamic = 'force-dynamic';

/**
 * Výrobci, kteří už v katalogu jsou.
 *
 * Údaje podle GPSR jsou u každého produktu zvlášť a to je správně – jsou to
 * náležitosti nabídky, ne číselník, a produkt si je musí nést i po tom, co
 * dodavatel skončí. Jenže butik odebírá od hrstky dodavatelů, takže se
 * název, adresa a e-mail přepisovaly ručně u každého kousku: šest polí navíc
 * při každém zakládání a šest míst, kde se dá udělat překlep, který na
 * stránce vypadá jako platný kontakt.
 *
 * Endpoint je proto jen předvyplnění formuláře. Uložená data se nemění
 * a produkty se na společný řádek nenavazují.
 */

export interface UlozenyVyrobce {
  nazev: string;
  adresa: string;
  email: string;
  mimoEu: boolean;
  zemePuvodu: string | null;
  odpovednaOsobaNazev: string | null;
  odpovednaOsobaAdresa: string | null;
  odpovednaOsobaEmail: string | null;
}

/** Kolik různých výrobců má smysl nabízet – nabídka, ne archiv. */
const MAX_VYROBCU = 40;

export async function GET() {
  try {
    const admin = await overitAdmina();
    if (!admin) return odpovedNeautorizovano();

    /*
     * Bere se poslední použité znění od každého výrobce: když majitelka
     * u nového kousku opraví dodavateli adresu, další produkt už má nabídnout
     * tu opravenou, ne tu, která se poprvé zapsala před rokem.
     */
    const produkty = await db.product.findMany({
      where: {
        jeDarkovyPoukaz: false,
        vyrobceNazev: { not: null },
        vyrobceAdresa: { not: null },
        vyrobceEmail: { not: null },
      },
      select: {
        vyrobceNazev: true,
        vyrobceAdresa: true,
        vyrobceEmail: true,
        vyrobceMimoEu: true,
        zemePuvodu: true,
        odpovednaOsobaNazev: true,
        odpovednaOsobaAdresa: true,
        odpovednaOsobaEmail: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 400,
    });

    const podleNazvu = new Map<string, UlozenyVyrobce>();

    for (const p of produkty) {
      const nazev = p.vyrobceNazev?.trim();
      const adresa = p.vyrobceAdresa?.trim();
      const email = p.vyrobceEmail?.trim();
      if (!nazev || !adresa || !email) continue;

      // Klíč bez diakritiky a velikosti písmen by tu byl přesnější, ale
      // spojil by dva dodavatele, které majitelka rozlišuje – tady se nehledá,
      // jen nabízí, takže shoda na názvu stačí.
      if (podleNazvu.has(nazev)) continue;
      if (podleNazvu.size >= MAX_VYROBCU) break;

      podleNazvu.set(nazev, {
        nazev,
        adresa,
        email,
        mimoEu: p.vyrobceMimoEu,
        zemePuvodu: p.zemePuvodu?.trim() || null,
        odpovednaOsobaNazev: p.odpovednaOsobaNazev?.trim() || null,
        odpovednaOsobaAdresa: p.odpovednaOsobaAdresa?.trim() || null,
        odpovednaOsobaEmail: p.odpovednaOsobaEmail?.trim() || null,
      });
    }

    /*
     * Vlastní značení (private label). Zboží od neznámého dodavatele – burza,
     * anonymní sklad – jde legálně prodat jen tak, že roli výrobce převezme
     * prodávající: na kus přiváže visačku se svým jménem, sídlem a e-mailem
     * a stejné údaje uvede na webu. Bere se sídlo (`adresaFirmy`), ne
     * provozovna – musí sedět s tím, co je na visačce. Bez všech tří údajů
     * v nastavení se volba nenabídne, aby nevznikl výrobce bez adresy.
     */
    const nastaveni = await nacistNastaveni();
    const nazev = nastaveni.nazevFirmy?.trim();
    const adresa = nastaveni.adresaFirmy?.trim();
    const email = nastaveni.emailFirmy?.trim();
    const prodavajici: UlozenyVyrobce | null =
      nazev && adresa && email
        ? {
            nazev,
            adresa,
            email,
            mimoEu: false,
            zemePuvodu: null,
            odpovednaOsobaNazev: null,
            odpovednaOsobaAdresa: null,
            odpovednaOsobaEmail: null,
          }
        : null;

    // Prodávající, který už u nějakého kousku figuruje, by v seznamu byl dvakrát.
    if (prodavajici) podleNazvu.delete(prodavajici.nazev);

    return odpovedOk({
      vyrobci: [...podleNazvu.values()].sort((a, b) => a.nazev.localeCompare(b.nazev, 'cs')),
      prodavajici,
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
