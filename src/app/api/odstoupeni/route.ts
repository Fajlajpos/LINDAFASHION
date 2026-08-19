import { z } from 'zod';
import { db } from '@/lib/db';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { klientskaIp, zkontrolovatLimit } from '@/lib/rate-limit';
import { konecLhuty, najitProOdstoupeni, zpravaKDuvodu } from '@/lib/odstoupeni';
import { lhutaNaVyrizeni } from '@/lib/lhuty';
import { nacistNastaveni } from '@/lib/nastaveni';
import { FRONTY, publishJob } from '@/lib/queue';

export const dynamic = 'force-dynamic';

/**
 * Odstoupení od smlouvy — § 1829 a § 1830a o. z.
 *
 * **Bez přihlášení, záměrně.** Právo odstoupit má každý spotřebitel; objednávka
 * bez registrace nemá účet a dosud neměla jak nárok uplatnit. Autorizuje
 * `verejnyToken` z potvrzovacího e-mailu, nebo dvojice číslo objednávky
 * + e-mail. Proto se nevolá `overitUzivatele()`.
 *
 * `jeStejnyPuvod` se naopak volá: požadavek chodí z našeho formuláře, ne
 * z odkazu v e-mailu, takže původ ověřit lze a má smysl.
 *
 * GET  = první krok, vrátí rekapitulaci objednávky k odsouhlasení.
 * POST = druhý krok, samotné odstoupení. Rozdělení na dva kroky je
 *        požadavek § 1830a, ne jen zvyk — má bránit odstoupení omylem.
 */

const klicSchema = z
  .object({
    token: z.string().min(10).max(200).optional(),
    cisloObjednavky: z.string().max(40).optional(),
    email: z.string().max(200).optional(),
  })
  .refine((d) => !!d.token || (!!d.cisloObjednavky && !!d.email), {
    message: 'Zadejte číslo objednávky i e-mail.',
  });

const potvrzeniSchema = klicSchema.and(
  z.object({
    /*
     * Druhý krok musí dorazit výslovně. Kdyby stačil samotný POST, splynul by
     * potvrzovací krok s prvním odesláním formuláře a § 1830a by nebyl splněný
     * ani při dvou obrazovkách v prohlížeči.
     */
    potvrzeno: z.literal(true, {
      errorMap: () => ({ message: 'Odstoupení je potřeba potvrdit druhým krokem.' }),
    }),
    duvod: z.string().max(1000).optional().nullable(),

    /*
     * Které položky se vracejí. Prázdné pole nebo vynechaný klíč = celá
     * objednávka.
     *
     * Částečné odstoupení je zákonná možnost, ne vylepšení: § 1829 nikde
     * neříká, že se odstupuje od objednávky vcelku, a zákaznice, která si ze
     * tří kousků chce nechat dva, na to má nárok. Dokud tu ten výběr nebyl,
     * mohla to napsat leda do nepovinné poznámky a doufat.
     */
    polozky: z.array(z.string().min(1)).max(100).optional(),
  })
);

/** Klíč pro `najitProOdstoupeni` z rozparsovaného vstupu. */
function klicZVstupu(v: { token?: string; cisloObjednavky?: string; email?: string }) {
  return v.token
    ? { token: v.token }
    : {
        cisloObjednavky: (v.cisloObjednavky as string).trim(),
        email: (v.email as string).trim().toLowerCase(),
      };
}

/** GET — rekapitulace objednávky pro první krok formuláře. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    /*
     * Limit je tu přísnější než u ostatních formulářů: dvojice číslo + e-mail
     * se dá zkoušet hrubou silou, a číslo objednávky jde po sobě. Bez brzdy
     * by se dalo ověřovat, která adresa u nás nakoupila.
     */
    const limit = zkontrolovatLimit(`odstoupeni:${klientskaIp(request)}`, 20, 60 * 60 * 1000);
    if (!limit.povoleno) {
      return odpovedChyba('Příliš mnoho pokusů. Zkuste to prosím za chvíli.', 429);
    }

    const vstup = klicSchema.parse({
      token: url.searchParams.get('token') ?? undefined,
      cisloObjednavky: url.searchParams.get('cisloObjednavky') ?? undefined,
      email: url.searchParams.get('email') ?? undefined,
    });

    const { objednavka, duvod, jizPodanePolozky } = await najitProOdstoupeni(klicZVstupu(vstup));

    if (duvod !== null || !objednavka) {
      return odpovedOk({
        nalezeno: false,
        zprava: zpravaKDuvodu(duvod ?? 'nenalezeno'),
      });
    }

    const konec = konecLhuty(objednavka);

    return odpovedOk({
      nalezeno: true,
      objednavka: {
        cisloObjednavky: objednavka.cisloObjednavky,
        // Token se vrací, aby druhý krok nemusel znovu posílat e-mail —
        // a hlavně aby ho formulář nedržel v adrese, kde skončí v historii.
        token: objednavka.verejnyToken,
        celkovaCena: objednavka.celkovaCena,
        datumObjednani: objednavka.createdAt,
        datumDoruceni: objednavka.datumDoruceni,
        lhutaDo: konec,
        polozky: objednavka.polozky,
        // Formulář je ukáže jako už vrácené a nenechá je vybrat znovu.
        jizPodanePolozky,
      },
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}

/** POST — druhý krok: přijetí odstoupení. */
export async function POST(request: Request) {
  try {
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const limit = zkontrolovatLimit(`odstoupeni-post:${klientskaIp(request)}`, 10, 60 * 60 * 1000);
    if (!limit.povoleno) {
      return odpovedChyba('Příliš mnoho pokusů. Zkuste to prosím za chvíli.', 429);
    }

    const vstup = potvrzeniSchema.parse(await request.json());
    const { objednavka, duvod, jizPodanePolozky } = await najitProOdstoupeni(klicZVstupu(vstup));

    if (duvod !== null || !objednavka) {
      // 409 i pro „nenalezeno": stav se mohl mezi krokem jedna a dva změnit
      // a pro zákaznici je to totéž — nejde to dokončit a ví proč.
      return odpovedChyba(zpravaKDuvodu(duvod ?? 'nenalezeno'), duvod === 'nenalezeno' ? 404 : 409);
    }

    /*
     * Přesný okamžik přijetí. § 1830a chce v potvrzení **datum a čas**, takže
     * se ta hodnota musí ustálit tady a projít beze změny do databáze
     * i do e-mailu — dvě volání `new Date()` by se lišila a potvrzení by
     * uvádělo jiný čas, než jaký nese záznam.
     */
    const prijeti = new Date();

    /*
     * --- Které položky se vracejí ---
     *
     * Vybrané id se prosejí proti skutečné objednávce: cizí id se zahodí,
     * ne odmítne. Zákaznice s vybranou položkou, kterou mezitím pokrylo jiné
     * odstoupení, tak nepřijde o zbytek žádosti kvůli chybové hlášce, které
     * by stejně nerozuměla.
     *
     * Prázdný výběr (nebo výběr všeho, co ještě zbývá) znamená celou
     * objednávku – jeden záznam s `orderItemId: null`. Rozepisovat ho na
     * položky by v administraci vypadalo jako tři samostatné žádosti místo
     * jednoho odstoupení.
     */
    const dostupne = objednavka.polozky.filter((p) => !jizPodanePolozky.includes(p.id));

    const vybrane = vstup.polozky?.length
      ? dostupne.filter((p) => vstup.polozky!.includes(p.id))
      : dostupne;

    if (vybrane.length === 0) {
      return odpovedChyba(
        'Vyberte prosím aspoň jeden kus, který chcete vrátit.',
        422,
        { polozky: 'Nic k vrácení nezbývá – vybrané zboží už vracíte.' }
      );
    }

    const celaObjednavka = vybrane.length === objednavka.polozky.length;

    /*
     * Jedna transakce: buď se založí všechny řádky, nebo žádný. Poloviční
     * odstoupení by zákaznici tvrdilo, že vrací tři kusy, a majitelce
     * ukázalo jeden.
     */
    const zaznamy = await db.$transaction(
      (celaObjednavka ? [null] : vybrane.map((p) => p.id)).map((orderItemId) =>
        db.reklamace.create({
          data: {
            orderId: objednavka.id,
            orderItemId,
            typ: 'VRACENI',
            duvod: vstup.duvod?.trim() || null,
            datumPrijeti: prijeti,
            lhutaDo: lhutaNaVyrizeni(prijeti),
            email: objednavka.email,
          },
          select: { id: true, token: true },
        })
      )
    );

    const zaznam = zaznamy[0];

    const nastaveni = await nacistNastaveni();

    /*
     * Automatické potvrzení zákaznici — výslovný požadavek § 1830a, ne
     * zdvořilost. Nese datum a čas přijetí a kopii toho, co podala.
     *
     * `potvrzeniOdeslanoAt` se nastavuje až po zařazení do fronty: kdyby se
     * nastavilo dopředu a zařazení selhalo, tvářil by se záznam jako
     * potvrzený, přestože zákaznici nic nedorazilo.
     */
    if (objednavka.email) {
      const zarazeno = await publishJob(FRONTY.ODESLAT_EMAIL, {
        typ: 'odstoupeni-potvrzeni',
        to: objednavka.email,
        subject: `Potvrzení odstoupení od smlouvy – objednávka ${objednavka.cisloObjednavky}`,
        data: {
          cisloObjednavky: objednavka.cisloObjednavky,
          prijatoAt: prijeti.toISOString(),
          duvod: vstup.duvod?.trim() || null,
          adresaProVraceni: nastaveni.adresaProVraceni,
          // Do potvrzení patří to, co zákaznice opravdu vrací, ne celý nákup.
          // Kopie podané žádosti je náležitost potvrzení – seznam, který
          // neodpovídá výběru, ji dělá nepravdivou.
          polozky: vybrane,
          celaObjednavka,
        },
      });

      if (zarazeno) {
        // Značka patří na **všechny** dnes založené řádky. Kdyby ji nesl jen
        // první, tvářily by se ostatní jako nepotvrzené a hlídání by je hnalo
        // znovu, přestože zákaznici dorazilo jedno společné potvrzení.
        await db.reklamace.updateMany({
          where: { id: { in: zaznamy.map((z) => z.id) } },
          data: { potvrzeniOdeslanoAt: new Date() },
        });
      }
    }

    // Majitelce zvlášť – bez toho by odstoupení leželo v administraci a nikdo
    // by o něm nevěděl, dokud tam sama nezajde.
    if (nastaveni.emailFirmy) {
      await publishJob(FRONTY.ODESLAT_EMAIL, {
        typ: 'nova-reklamace',
        to: nastaveni.emailFirmy,
        subject: `Odstoupení od smlouvy – objednávka ${objednavka.cisloObjednavky}`,
        data: {
          reklamaceId: zaznam.id,
          cisloObjednavky: objednavka.cisloObjednavky,
          typ: 'VRACENI',
        },
      });
    }

    return odpovedOk(
      {
        prijatoAt: prijeti,
        cisloObjednavky: objednavka.cisloObjednavky,
        adresaProVraceni: nastaveni.adresaProVraceni,
        vraceno: vybrane.map((p) => ({ nazev: p.nazev, velikost: p.velikost, mnozstvi: p.mnozstvi })),
        celaObjednavka,
        zprava:
          'Vaše odstoupení od smlouvy jsme přijali. Potvrzení s datem a časem jsme vám poslali e-mailem.',
      },
      201
    );
  } catch (err) {
    return zpracovatChybu(err);
  }
}
