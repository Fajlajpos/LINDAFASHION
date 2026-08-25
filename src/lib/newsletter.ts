/**
 * Odběr novinek – jedna cesta dovnitř i ven.
 *
 * ## Proč to není jen pár řádků v endpointu
 *
 * Souhlas s newsletterem se dal udělit třemi místy a každé s ním nakládalo
 * jinak:
 *
 *   • veřejný formulář (hero, patička) → double opt-in, obě IP, `SouhlasZaznam`
 *   • zaškrtávátko v registraci        → jen `User.newsletterSouhlas = true`
 *   • přepínač v účtu                  → totéž
 *
 * Druhé dvě cesty tedy vyráběly souhlas **bez jediného důkazu** (čl. 7 odst. 1
 * GDPR) a hlavně bez potvrzení adresy – a protože rozesílka čte
 * `NewsletterSubscriber`, zákaznice, která si v účtu novinky zapnula, se na
 * žádný seznam nedostala. Zapnutí nedělalo nic, vypnutí ano.
 *
 * Registrace navíc volala `newsletterSubscriber.deleteMany({ email })`, čímž
 * zahodila `potvrzenoAt`, `ipPrihlaseni` i `ipPotvrzeni` dřívějšího double
 * opt-inu. To je přesně ten druh záznamu, který retence chrání a který se
 * u kontroly ÚOOÚ nedá ničím nahradit.
 *
 * Od téhle chvíle vede každé zapnutí i vypnutí sem. `User.newsletterSouhlas`
 * zůstává jako to, co se zaškrtává v účtu, ale **autoritativní je odběratel
 * a evidence souhlasů** – tam se rozesílá a tím se souhlas dokládá.
 */
import { db } from './db';
import { FRONTY, publishJob } from './queue';
import { zaznamenatSouhlas } from './souhlasy';

export type ZdrojPrihlaseni = 'hero' | 'paticka' | 'registrace' | 'ucet';

export interface KontextPrihlaseni {
  email: string;
  zdroj?: ZdrojPrihlaseni | null;
  ip?: string | null;
  userAgent?: string | null;
}

export interface VysledekPrihlaseni {
  /** `true`, když adresa byla potvrzená už předtím – nic se neposílalo. */
  jizPotvrzeno: boolean;
  zprava: string;
}

/**
 * Přihlášení k odběru. Vždycky jen **první krok** double opt-inu.
 *
 * `potvrzeno` zůstává `false`; překlápí ho až kliknutí na odkaz v e-mailu
 * (`/api/newsletter/potvrzeni`). Do té doby je záznam evidencí zájmu, ne
 * souhlasem – rozesílat se smí výhradně na potvrzené adresy.
 */
export async function prihlasitKOdberu(
  kontext: KontextPrihlaseni
): Promise<VysledekPrihlaseni> {
  const email = kontext.email.trim().toLowerCase();
  const ip = kontext.ip ?? null;

  /*
   * Opakované přihlášení nesmí skončit chybou o obsazeném e-mailu – pro
   * zákaznici je to tentýž úkon jako poprvé. Zároveň obnoví odběr, který si
   * dřív odhlásila.
   *
   * `ipPrihlaseni` se přepisuje i při opakování: platí poslední projev vůle,
   * ne ten původní. Historie zůstává v `SouhlasZaznam`, který se nikdy nemění.
   *
   * `zdroj` se u existujícího řádku **nepřepisuje** – zajímá nás, odkud
   * přihláška přišla poprvé.
   */
  const odberatel = await db.newsletterSubscriber.upsert({
    where: { email },
    update: { odhlasenAt: null, ipPrihlaseni: ip },
    create: { email, zdroj: kontext.zdroj ?? null, ipPrihlaseni: ip },
    select: { token: true, potvrzeno: true },
  });

  /*
   * Potvrzovací odkaz posíláme jen tomu, kdo ještě nepotvrdil. Opakované
   * odeslání formuláře už potvrzenou odběratelkou by jinak znamenalo, že
   * kdokoliv, kdo zná cizí adresu, jí umí naklikat e-maily do schránky.
   */
  if (!odberatel.potvrzeno) {
    const zaklad = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');

    await publishJob(FRONTY.ODESLAT_EMAIL, {
      typ: 'newsletter-potvrzeni',
      to: email,
      subject: 'Potvrďte prosím odběr novinek – LINDA FASHION',
      data: {
        odkaz: `${zaklad}/newsletter/potvrzeni?token=${encodeURIComponent(odberatel.token)}`,
      },
    });
  } else {
    /*
     * Adresa je potvrzená z dřívějška, takže se nic neposílá – ale zrcadlo na
     * účtu se musí srovnat hned. Jinak vznikne opačná lež než ta původní:
     * zákaznice **je** na potvrzeném seznamu a novinky jí chodí, zatímco
     * přepínač v účtu tvrdí, že je nemá. Typicky když si po dřívějším
     * přihlášení z patičky teprve zakládá účet.
     */
    await db.user.updateMany({ where: { email }, data: { newsletterSouhlas: true } });
  }

  /*
   * Do evidence se zapisuje **žádost**, ne souhlas: `udeleno: false`.
   * Souhlas vzniká až kliknutím na potvrzovací odkaz. Kdyby se zapisoval jako
   * udělený, vyrobený důkaz by tvrdil pravý opak toho, co double opt-in dokládá.
   */
  await zaznamenatSouhlas({
    typ: 'NEWSLETTER',
    subjekt: email,
    udeleno: false,
    podrobnosti: { krok: 'prihlaseni', zdroj: kontext.zdroj ?? null },
    ip,
    userAgent: kontext.userAgent ?? null,
  });

  return {
    jizPotvrzeno: odberatel.potvrzeno,
    zprava: odberatel.potvrzeno
      ? 'Vaši adresu už v odběru novinek máme. Nemusíte dělat nic dalšího.'
      : 'Děkujeme. Poslali jsme vám e-mail s potvrzovacím odkazem – odběr spustíme, jakmile na něj kliknete.',
  };
}

/**
 * Odhlášení z odběru.
 *
 * Odběratel se **nemaže**, jen se označí `odhlasenAt`. Řádek nese doklad
 * o dřívějším souhlasu a čl. 7 odst. 3 říká, že odvoláním nezaniká zákonnost
 * zpracování před ním – takže musí zůstat doložitelné, že souhlas nějakou dobu
 * platil. Úplný výmaz řeší až retence po nastavené lhůtě.
 */
export async function odhlasitZOdberu(kontext: KontextPrihlaseni): Promise<void> {
  const email = kontext.email.trim().toLowerCase();

  const zmeneno = await db.newsletterSubscriber.updateMany({
    where: { email, odhlasenAt: null },
    data: { odhlasenAt: new Date() },
  });

  // Odvolání se zapisuje jen tehdy, když opravdu něco odvolalo. Jinak by
  // každé uložení profilu s vypnutým přepínačem přidalo do evidence další
  // „odvolání" souhlasu, který nikdy neexistoval.
  if (zmeneno.count > 0) {
    await zaznamenatSouhlas({
      typ: 'NEWSLETTER',
      subjekt: email,
      udeleno: false,
      podrobnosti: { krok: 'odhlaseni', zdroj: kontext.zdroj ?? null },
      ip: kontext.ip ?? null,
      userAgent: kontext.userAgent ?? null,
    });
  }
}
