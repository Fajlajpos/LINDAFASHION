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

    const { objednavka, duvod } = await najitProOdstoupeni(klicZVstupu(vstup));

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
    const { objednavka, duvod } = await najitProOdstoupeni(klicZVstupu(vstup));

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

    const zaznam = await db.reklamace.create({
      data: {
        orderId: objednavka.id,
        typ: 'VRACENI',
        duvod: vstup.duvod?.trim() || null,
        datumPrijeti: prijeti,
        lhutaDo: lhutaNaVyrizeni(prijeti),
        email: objednavka.email,
      },
      select: { id: true, token: true },
    });

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
          polozky: objednavka.polozky,
        },
      });

      if (zarazeno) {
        await db.reklamace.update({
          where: { id: zaznam.id },
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
        zprava:
          'Vaše odstoupení od smlouvy jsme přijali. Potvrzení s datem a časem jsme vám poslali e-mailem.',
      },
      201
    );
  } catch (err) {
    return zpracovatChybu(err);
  }
}
