/**
 * Retenční pravidla – čl. 5 odst. 1 písm. e) GDPR („omezení uložení").
 *
 * Osobní údaje se smějí uchovávat jen po dobu nezbytnou k účelu, pro který se
 * zpracovávají. Do téhle chvíle e-shop nemazal **nic**: zpráva z kontaktního
 * formuláře, hlídání skladu, audit log i IP adresa u objednávky ležely
 * v databázi navždy. Rozpor se zásadou přitom nevypadá jako závada – databáze
 * si spokojeně roste a nikde nic nesvítí.
 *
 * ## Proč jsou lhůty tady a ne v `.env`
 *
 * Jsou to právní rozhodnutí, ne konfigurace. Ke každé patří důvod, proč zrovna
 * tolik – a ten se do proměnné prostředí nevejde. Kdyby se daly přenastavit za
 * běhu, přestane platit, že to, co je v kódu, je i to, co se doopravdy děje.
 *
 * ## Co se schválně **nemaže**
 *
 * - **Objednávky, faktury, `PriceHistory`.** Účetní a evidenční doklady;
 *   zákon o účetnictví a o DPH je nařizuje držet roky. Smazat je kvůli GDPR
 *   by porušilo jiný zákon – čl. 6 odst. 1 písm. c) na ně dopadá dřív.
 * - **Souhlasy s newsletterem a s obchodními podmínkami.** Čl. 7 odst. 1 chce
 *   umět souhlas doložit; odvolání (`udeleno = false`) je nový řádek, ne
 *   přepis. Kdyby retence mazala staré řádky, zmizel by právě ten důkaz,
 *   kvůli kterému tabulka vznikla.
 * - **Anonymizované účty.** Osobní údaj v nich už není, mazat není co.
 *
 * Bez `@/` aliasů a bez `next/*` – běží ve workeru.
 */
import { db } from './db';

const DEN_MS = 24 * 60 * 60 * 1000;

/** Kolik dnů se co drží, a proč zrovna tolik. */
export const RETENCE = {
  /**
   * Zprávy z kontaktního formuláře: 12 měsíců.
   *
   * Účelem je odpovědět a mít po ruce kontext, kdyby se zákaznice ozvala
   * znovu. Rok pokrývá i sezónní návaznost („loni jsem u vás řešila…"),
   * dál už je to archiv bez účelu.
   */
  zpravyDnu: 365,

  /**
   * Hlídání dostupnosti: 90 dnů po odeslání upozornění, 365 dnů celkem.
   *
   * Vyřízené hlídání svůj účel splnilo odesláním zprávy. Nevyřízené drží
   * zájem, který po roce přestává být aktuální – e-shop by po roce
   * upozorňoval na kousek, který si zákaznice dávno nepamatuje.
   */
  hlidaniVyrizenoDnu: 90,
  hlidaniNevyrizenoDnu: 365,

  /**
   * Audit log administrace: 24 měsíců.
   *
   * Slouží k dohledání, kdo co v e-shopu změnil. Dva roky odpovídají obecné
   * promlčecí lhůtě u sporů, které by se tím dokazovaly.
   */
  auditDnu: 730,

  /**
   * IP adresa u objednávky: 12 měsíců.
   *
   * Je to důkaz o uzavření smlouvy na dálku (oprávněný zájem). Objednávka
   * samotná se drží roky jako účetní doklad, ale IP tak dlouho potřeba není –
   * maže se **z řádku**, který zůstává. Proto `update`, ne `delete`.
   */
  ipObjednavkyDnu: 365,

  /**
   * Nepotvrzené přihlášky k newsletteru: 30 dnů.
   *
   * Double opt-in bez potvrzení není souhlas. Držet adresu, ke které souhlas
   * nikdy nevznikl, nemá právní titul ani po měsíci – měsíc je jen slušná
   * lhůta, než si zákaznice odkaz v e-mailu najde.
   */
  nepotvrzenyNewsletterDnu: 30,

  /**
   * Odhlášení z newsletteru: 36 měsíců.
   *
   * Řádek zůstává jako doklad, že souhlas byl a byl odvolán (čl. 7 odst. 3:
   * odvolání neruší zákonnost předchozího zpracování, takže se musí dát
   * doložit obojí). Po třech letech už není co dokazovat.
   */
  odhlasenyNewsletterDnu: 1095,

  /**
   * Záznamy o souhlasu s cookies: 36 měsíců.
   *
   * Souhlas s cookies se obnovuje nejpozději po roce, takže tříletý záznam
   * dávno není platným souhlasem – je jen důkazem o období, které skončilo.
   * Souhlasy s newsletterem a podmínkami se **nemažou vůbec**, ty váží na
   * vztah, který může trvat dál.
   */
  souhlasCookiesDnu: 1095,

  /**
   * Opuštěné košíky: 12 měsíců.
   *
   * Není to ani doklad, ani souhlas – jen rozpracovaný nákup. Po roce je to
   * seznam zboží, které už dost možná ani neprodáváme.
   */
  kosikDnu: 365,
} as const;

/** Datum před `dnu` dny. Jediné místo, kde se v retenci počítá s časem. */
export function hranice(dnu: number, ted: Date = new Date()): Date {
  return new Date(ted.getTime() - dnu * DEN_MS);
}

export interface VysledekRetence {
  zpravy: number;
  hlidani: number;
  auditLog: number;
  ipObjednavek: number;
  newsletterNepotvrzeny: number;
  newsletterOdhlaseny: number;
  souhlasyCookies: number;
  kosiky: number;
}

/**
 * Jedno kolo úklidu. Vrací, čeho se kolika řádků týkalo.
 *
 * Každý krok je samostatný `deleteMany` / `updateMany`, ne jedna transakce:
 * kdyby jeden krok selhal (například kvůli zámku nad `Cart`), nemá to shodit
 * ostatní. Retence je opakovatelná operace – co se dnes nesmazalo, smaže se
 * zítra. Jedna velká transakce by naopak znamenala, že jediná chyba nechá
 * databázi neuklizenou donekonečna.
 */
export async function spustitRetenci(ted: Date = new Date()): Promise<VysledekRetence> {
  const zpravy = await db.contactMessage.deleteMany({
    where: { createdAt: { lt: hranice(RETENCE.zpravyDnu, ted) } },
  });

  const hlidaniVyrizene = await db.stockNotification.deleteMany({
    where: { vyrizeno: true, createdAt: { lt: hranice(RETENCE.hlidaniVyrizenoDnu, ted) } },
  });

  const hlidaniStare = await db.stockNotification.deleteMany({
    where: { createdAt: { lt: hranice(RETENCE.hlidaniNevyrizenoDnu, ted) } },
  });

  const auditLog = await db.auditLog.deleteMany({
    where: { createdAt: { lt: hranice(RETENCE.auditDnu, ted) } },
  });

  /*
   * IP se vynuluje jen tam, kde ještě nějaká je. Bez podmínky `not: null` by
   * `updateMany` přepisoval každou starou objednávku znovu a znovu při každém
   * běhu a hlásil tisíce „smazaných" IP, které tam dávno nebyly.
   */
  const ipObjednavek = await db.order.updateMany({
    where: {
      ipObjednavky: { not: null },
      createdAt: { lt: hranice(RETENCE.ipObjednavkyDnu, ted) },
    },
    data: { ipObjednavky: null },
  });

  const newsletterNepotvrzeny = await db.newsletterSubscriber.deleteMany({
    where: {
      potvrzeno: false,
      createdAt: { lt: hranice(RETENCE.nepotvrzenyNewsletterDnu, ted) },
    },
  });

  const newsletterOdhlaseny = await db.newsletterSubscriber.deleteMany({
    where: { odhlasenAt: { lt: hranice(RETENCE.odhlasenyNewsletterDnu, ted) } },
  });

  const souhlasyCookies = await db.souhlasZaznam.deleteMany({
    where: { typ: 'COOKIES', createdAt: { lt: hranice(RETENCE.souhlasCookiesDnu, ted) } },
  });

  /*
   * Košík se maže celý, ne jen položky – `CartItem` na něm visí přes
   * `onDelete: Cascade`, takže smazáním košíku odejdou s ním. Opačné pořadí
   * (nejdřív položky) by nechalo prázdné košíky ležet dál.
   */
  const kosiky = await db.cart.deleteMany({
    where: { updatedAt: { lt: hranice(RETENCE.kosikDnu, ted) } },
  });

  return {
    zpravy: zpravy.count,
    hlidani: hlidaniVyrizene.count + hlidaniStare.count,
    auditLog: auditLog.count,
    ipObjednavek: ipObjednavek.count,
    newsletterNepotvrzeny: newsletterNepotvrzeny.count,
    newsletterOdhlaseny: newsletterOdhlaseny.count,
    souhlasyCookies: souhlasyCookies.count,
    kosiky: kosiky.count,
  };
}

/** Shrnutí do logu. Nula se nevypisuje – ať je v logu vidět, když se něco stalo. */
export function popisVysledku(v: VysledekRetence): string {
  const casti = [
    v.zpravy && `${v.zpravy} zpráv z formuláře`,
    v.hlidani && `${v.hlidani} hlídání skladu`,
    v.auditLog && `${v.auditLog} záznamů auditu`,
    v.ipObjednavek && `${v.ipObjednavek} IP u objednávek`,
    v.newsletterNepotvrzeny && `${v.newsletterNepotvrzeny} nepotvrzených přihlášek`,
    v.newsletterOdhlaseny && `${v.newsletterOdhlaseny} odhlášených odběratelek`,
    v.souhlasyCookies && `${v.souhlasyCookies} záznamů o souhlasu s cookies`,
    v.kosiky && `${v.kosiky} opuštěných košíků`,
  ].filter(Boolean);

  return casti.length === 0 ? 'nebylo co mazat' : casti.join(', ');
}
