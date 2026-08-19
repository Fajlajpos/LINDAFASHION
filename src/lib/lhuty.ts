/**
 * Zákonné lhůty, které e-shopu běží vůči zákaznici.
 *
 * Všechny tři mají společné, že se počítají **ode dne**, ne od okamžiku, a že
 * jejich marné uplynutí má právní následek. Proto žijí na jednom místě: kdyby
 * si je každý endpoint počítal po svém, rozejdou se — a rozdíl se ukáže až
 * u sporu, kde je nejdražší.
 *
 * Bez importu Prismy a bez aliasů `@/` — počítá s nimi i worker.
 */

const DEN_MS = 24 * 60 * 60 * 1000;

/** Vyřízení reklamace, § 19 odst. 3 zák. č. 634/1992 Sb. */
export const DNU_NA_REKLAMACI = 30;

/** Odstoupení od smlouvy, § 1829 odst. 1 o. z. */
export const DNU_NA_ODSTOUPENI = 14;

/**
 * Lhůta pro vyřízení reklamace.
 *
 * Není to interní cíl, ale datum s následkem: marným uplynutím vzniká
 * zákaznici právo od smlouvy odstoupit nebo žádat slevu. Počítá se od
 * uplatnění, tedy od `datumPrijeti`.
 */
export function lhutaNaVyrizeni(prijeti: Date): Date {
  return new Date(prijeti.getTime() + DNU_NA_REKLAMACI * DEN_MS);
}

/**
 * Konec lhůty pro odstoupení od smlouvy.
 *
 * Běží **od převzetí zboží**, ne od objednání — proto `datumDoruceni`.
 * Dokud zboží nedorazilo, lhůta ještě nezačala běžet a `null` znamená
 * „nelze určit", ne „vypršelo".
 *
 * § 1829 odst. 1 písm. a) o. z.
 */
export function lhutaNaOdstoupeni(doruceni: Date | null): Date | null {
  return doruceni === null ? null : new Date(doruceni.getTime() + DNU_NA_ODSTOUPENI * DEN_MS);
}

/**
 * Smí zákaznice od smlouvy ještě odstoupit?
 *
 * **Nedoručená objednávka vrací `true`**, a je to záměr. Odstoupit lze
 * i před převzetím zboží (§ 1829 odst. 1 věta druhá) — lhůta tehdy prostě
 * ještě nezačala běžet. Kdyby se tu vracelo `false`, e-shop by odmítal
 * odstoupení v době, kdy je na něj nárok nejjistější.
 */
export function lzeOdstoupit(doruceni: Date | null, ted: Date = new Date()): boolean {
  const konec = lhutaNaOdstoupeni(doruceni);
  return konec === null || ted <= konec;
}

/** Kolik dnů ze lhůty zbývá. Záporné číslo = o tolik dnů je po termínu. */
export function zbyvaDnu(konec: Date, ted: Date = new Date()): number {
  return Math.ceil((konec.getTime() - ted.getTime()) / DEN_MS);
}

/**
 * Naléhavost lhůty pro barevné odlišení v administraci.
 *
 * Prahy jsou schválně v kódu, ne v šabloně: „zbývá pět dnů" má znamenat
 * totéž ve výpisu i v detailu, jinak si administrace protiřečí.
 */
export type StavLhuty = 'v_poradku' | 'blizi_se' | 'po_terminu';

export function stavLhuty(konec: Date | null, ted: Date = new Date()): StavLhuty | null {
  if (konec === null) return null;

  const zbyva = zbyvaDnu(konec, ted);
  if (zbyva < 0) return 'po_terminu';
  return zbyva <= 5 ? 'blizi_se' : 'v_poradku';
}
