import { db } from '@/lib/db';
import { overitUzivatele } from '@/lib/auth';
import { odpovedChyba, zpracovatChybu } from '@/lib/api';
import { klientskaIp, zkontrolovatLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Přenositelnost údajů – čl. 20 GDPR.
 *
 * Zákaznice má právo dostat údaje, které o ní zpracováváme na základě
 * souhlasu nebo smlouvy, ve **strojově čitelném formátu** a předat je jinému
 * správci. Do téhle chvíle si o kopii požádat mohla, ale e-shop jí ji neuměl
 * dát – muselo by se to řešit ručním dotazem do databáze.
 *
 * Proč JSON a ne PDF: čl. 20 chce formát „běžně používaný a strojově čitelný".
 * PDF splňuje první půlku a druhou ne. JSON umí otevřít člověk i program.
 *
 * ## Co se do exportu nedostane a proč
 *
 * - **Hash hesla, `tokenVerze`.** Nejsou to údaje o zákaznici, ale vnitřní
 *   bezpečnostní stav. Vydat hash hesla v souboru, který si zákaznice pošle
 *   e-mailem, by bylo přesně naopak, než jak se s ním má zacházet.
 * - **Audit log a IP adres jiných lidí.** Do exportu patří jen její údaje.
 * - **Cizí objednávky.** Vše se filtruje přes `userId`, ne přes e-mail –
 *   e-mail může po anonymizaci účtu patřit někomu jinému.
 *
 * Naopak tam patří i to, co e-shop drží mimo účet a klíčuje e-mailem
 * (newsletter, hlídání skladu, zprávy z formuláře, záznamy o souhlasech).
 * Právě to zákaznice nikde v účtu nevidí, takže by ji „export" bez nich
 * informoval hůř než dobře.
 */
export async function GET(request: Request) {
  try {
    const uzivatel = await overitUzivatele();
    if (!uzivatel) return odpovedChyba('Nejste přihlášeni.', 401);

    /*
     * Export je jeden z nejtěžších dotazů v aplikaci a zákaznice ho potřebuje
     * jednou za rok, ne jednou za vteřinu. Limit je proto přísný – a je
     * per uživatel, ne per IP: sdílená IP v kanceláři by jinak brala export
     * i kolegyni.
     */
    const limit = zkontrolovatLimit(`export-udaju:${uzivatel.id}`, 5, 60 * 60 * 1000);
    if (!limit.povoleno) {
      return odpovedChyba(
        'Export jste si vyžádala před chvílí. Zkuste to prosím za hodinu, nebo nám napište.',
        429
      );
    }

    const [ucet, objednavky, adresy, oblibene, souhlasy, newsletter, hlidani, zpravy] =
      await Promise.all([
        db.user.findUnique({
          where: { id: uzivatel.id },
          select: {
            email: true,
            jmeno: true,
            telefon: true,
            newsletterSouhlas: true,
            createdAt: true,
            anonymizovanoAt: true,
          },
        }),

        db.order.findMany({
          where: { userId: uzivatel.id },
          orderBy: { createdAt: 'desc' },
          select: {
            cisloObjednavky: true,
            createdAt: true,
            stav: true,
            stavPlatby: true,
            zpusobDopravy: true,
            zpusobPlatby: true,
            mezisoucet: true,
            slevaCastka: true,
            cenaDopravy: true,
            celkovaCena: true,
            dphHaleru: true,
            sazbaDph: true,
            dodaciJmenoPrijmeni: true,
            dodaciUlice: true,
            dodaciMesto: true,
            dodaciPsc: true,
            dodaciZeme: true,
            dodaciTelefon: true,
            souhlasPodminkyAt: true,
            verzePodminek: true,
            datumExpedice: true,
            datumDoruceni: true,
            items: {
              select: {
                mnozstvi: true,
                cenaVDobeNakupu: true,
                variant: {
                  select: { velikost: true, product: { select: { nazev: true } } },
                },
              },
            },
            reklamace: {
              select: {
                typ: true,
                stav: true,
                duvod: true,
                datumPrijeti: true,
                datumVyrizeni: true,
                lhutaDo: true,
              },
            },
          },
        }),

        db.address.findMany({
          where: { userId: uzivatel.id },
          select: {
            typ: true,
            jmenoPrijmeni: true,
            ulice: true,
            mesto: true,
            psc: true,
            zeme: true,
            telefon: true,
            jeVychozi: true,
          },
        }),

        db.favorite.findMany({
          where: { userId: uzivatel.id },
          select: { createdAt: true, product: { select: { nazev: true, slug: true } } },
        }),

        /*
         * Souhlasy se klíčují sloupcem `subjekt` – e-mailem u newsletteru
         * a obchodních podmínek, náhodným id u cookies. Cookie souhlas se
         * proto do exportu nedostane a je to správně: e-shop netuší, které
         * náhodné id patří které přihlášené zákaznici, a spojit je jen kvůli
         * exportu by znamenalo vyrobit přesně tu vazbu, které se to id
         * schválně vyhýbá.
         */
        db.souhlasZaznam.findMany({
          where: { subjekt: uzivatel.email },
          orderBy: { createdAt: 'asc' },
          select: { typ: true, udeleno: true, verze: true, podrobnosti: true, createdAt: true },
        }),

        db.newsletterSubscriber.findMany({
          where: { email: uzivatel.email },
          select: {
            potvrzeno: true,
            createdAt: true,
            potvrzenoAt: true,
            odhlasenAt: true,
            zdroj: true,
          },
        }),

        db.stockNotification.findMany({
          where: { email: uzivatel.email },
          select: {
            createdAt: true,
            vyrizeno: true,
            variant: {
              select: { velikost: true, product: { select: { nazev: true } } },
            },
          },
        }),

        db.contactMessage.findMany({
          where: { email: uzivatel.email },
          orderBy: { createdAt: 'desc' },
          select: { predmet: true, zprava: true, createdAt: true, vyrizeno: true },
        }),
      ]);

    if (!ucet) return odpovedChyba('Účet nebyl nalezen.', 404);

    /*
     * `Decimal` z Prismy `JSON.stringify` vypíše jako objekt, ne jako číslo –
     * export by pak obsahoval `{"s":1,"e":3,"d":[2990]}` místo částky. Proto
     * se ceny převádějí na čísla ještě tady.
     */
    const data = {
      exportVytvoren: new Date().toISOString(),
      pravniZaklad:
        'Kopie osobních údajů podle čl. 15 a čl. 20 nařízení (EU) 2016/679 (GDPR).',
      ucet,
      objednavky: objednavky.map((o) => ({
        ...o,
        mezisoucet: Number(o.mezisoucet),
        slevaCastka: Number(o.slevaCastka),
        cenaDopravy: Number(o.cenaDopravy),
        celkovaCena: Number(o.celkovaCena),
        items: o.items.map((p) => ({
          nazev: p.variant.product.nazev,
          velikost: p.variant.velikost,
          mnozstvi: p.mnozstvi,
          cenaVDobeNakupu: Number(p.cenaVDobeNakupu),
        })),
      })),
      adresy,
      oblibene: oblibene.map((f) => ({
        nazev: f.product.nazev,
        slug: f.product.slug,
        pridanoAt: f.createdAt,
      })),
      souhlasy,
      newsletter,
      hlidaniDostupnosti: hlidani.map((h) => ({
        nazev: h.variant.product.nazev,
        velikost: h.variant.velikost,
        vytvorenoAt: h.createdAt,
        vyrizeno: h.vyrizeno,
      })),
      zpravyZFormulare: zpravy,
    };

    const nazevSouboru = `linda-fashion-udaje-${new Date().toISOString().slice(0, 10)}.json`;

    /*
     * Vlastní `Response` místo `odpovedOk()`: export se má stáhnout jako
     * soubor, ne zobrazit v prohlížeči. `no-store` je tu povinné – kopie
     * osobních údajů nemá co ležet v cache mezi serverem a zákaznicí.
     */
    return new Response(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${nazevSouboru}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    /* `klientskaIp` se tu nepoužívá k limitu, ale do logu se hodí. */
    console.error('[export údajů] Selhalo pro IP', klientskaIp(request));
    return zpracovatChybu(err);
  }
}
