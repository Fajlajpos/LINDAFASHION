import { db } from '@/lib/db';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { overitAdmina, odpovedNeautorizovano, zapsatDoAuditu } from '@/lib/admin';
import { nacistNastaveni } from '@/lib/nastaveni';
import { FRONTY, publishJob } from '@/lib/queue';
import { ChybaPackety, jeNastaveno, vytvoritZasilku } from '@/lib/packeta-api';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/objednavky/[id]/zasilka – založí zásilku u Zásilkovny.
 *
 * Nahrazuje přepisování objednávky do klientské sekce a opisování čísla
 * zásilky zpátky. Vedle uložení čísla překlopí objednávku na `EXPEDOVANA`
 * a dá o tom vědět zákaznici – tedy přesně to, co majitelka dělala třemi
 * ručními kroky.
 *
 * ## Idempotence je tu dražší než jinde
 *
 * Podmínka „ještě nemá zásilku" je **součástí UPDATE**, ne kontrolou před ním.
 * Mezi dotazem a zápisem je mezera, do které se vejde druhý požadavek –
 * a u storna to znamenalo dvojí vrácení na sklad, tady by to znamenalo **dvě
 * skutečné zásilky u dopravce a dva vytištěné štítky**. Rezervace se proto
 * zapíše dřív, než se vůbec zavolá API.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await overitAdmina();
    if (!admin) return odpovedNeautorizovano();
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    if (!jeNastaveno()) {
      return odpovedChyba(
        'Zásilkovna není nastavená – chybí API heslo nebo označení odesílatele.',
        503,
      );
    }

    const objednavka = await db.order.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        cisloObjednavky: true,
        verejnyToken: true,
        email: true,
        stav: true,
        cisloZasilky: true,
        zpusobDopravy: true,
        vydejniMistoId: true,
        dodaciJmenoPrijmeni: true,
        dodaciTelefon: true,
        celkovaCena: true,
        datumExpedice: true,
        items: { select: { mnozstvi: true } },
        user: { select: { email: true } },
      },
    });

    if (!objednavka) return odpovedChyba('Objednávka nebyla nalezena.', 404);

    if (objednavka.zpusobDopravy !== 'zasilkovna') {
      return odpovedChyba('Tahle objednávka nejde Zásilkovnou.', 400);
    }

    if (!objednavka.vydejniMistoId) {
      return odpovedChyba(
        'Objednávka nemá vybrané výdejní místo. Doplňte ho a zásilku založte ručně v klientské sekci.',
        400,
      );
    }

    if (objednavka.stav === 'ZRUSENA') {
      return odpovedChyba('Zrušená objednávka se neodesílá.', 409);
    }

    /*
     * Rezervace. Prázdný řetězec je značka „zakládá se" – `null` znamená
     * „zásilka není" a skutečné číslo přijde hned po odpovědi od Zásilkovny.
     * Díky tomu druhý souběžný požadavek neprojde a nezaloží druhý balík.
     */
    const rezervovano = await db.order.updateMany({
      where: { id: params.id, cisloZasilky: null },
      data: { cisloZasilky: '' },
    });

    if (rezervovano.count !== 1) {
      return odpovedChyba('Zásilka už je založená. Načtěte prosím stránku znovu.', 409);
    }

    const nastaveni = await nacistNastaveni();
    const pocetKusu = objednavka.items.reduce((soucet, i) => soucet + i.mnozstvi, 0);

    let cisloZasilky: string;
    try {
      cisloZasilky = await vytvoritZasilku(
        {
          cisloObjednavky: objednavka.cisloObjednavky,
          dodaciJmenoPrijmeni: objednavka.dodaciJmenoPrijmeni,
          email: objednavka.email ?? objednavka.user?.email ?? null,
          dodaciTelefon: objednavka.dodaciTelefon,
          vydejniMistoId: objednavka.vydejniMistoId,
          hodnota: Number(objednavka.celkovaCena),
          pocetKusu,
        },
        nastaveni.hmotnostBalikuGramu,
      );
    } catch (err) {
      // Rezervace se musí uvolnit, jinak by jedna chyba u dopravce objednávku
      // nadobro zamkla a zásilka by pro ni nešla založit už nikdy.
      await db.order.updateMany({
        where: { id: params.id, cisloZasilky: '' },
        data: { cisloZasilky: null },
      });

      if (err instanceof ChybaPackety) {
        // `detail` bývá „chybí telefon" nebo „neplatné výdejní místo“ –
        // tedy něco, co majitelka umí sama opravit.
        return odpovedChyba(err.detail ? `${err.message} ${err.detail}` : err.message, 502);
      }

      throw err;
    }

    /*
     * `datumExpedice` se dopisuje jen tehdy, když ještě žádné není – stejné
     * pravidlo jako v PATCH routě. Lhůtu pro odstoupení sice neurčuje, ale
     * přepisovat zaznamenané datum při opakované akci nemá žádný důvod.
     */
    await db.order.update({
      where: { id: params.id },
      data: {
        cisloZasilky,
        stav: 'EXPEDOVANA',
        ...(objednavka.datumExpedice === null ? { datumExpedice: new Date() } : {}),
      },
    });

    const kontakt = objednavka.email ?? objednavka.user?.email ?? null;

    if (kontakt) {
      await publishJob(FRONTY.ODESLAT_EMAIL, {
        typ: 'zmena-stavu-objednavky',
        to: kontakt,
        subject: `Objednávka ${objednavka.cisloObjednavky} – změna stavu`,
        data: {
          cisloObjednavky: objednavka.cisloObjednavky,
          // Bez tokenu vede odkaz na `/muj-ucet`, kam objednávka bez
          // registrace nikdy nedohlédne.
          verejnyToken: objednavka.verejnyToken,
          stav: 'EXPEDOVANA',
          cisloZasilky,
        },
      });
    }

    await zapsatDoAuditu(admin.email, 'objednavka.zasilka-vytvorena', 'Order', params.id, {
      nazev: objednavka.cisloObjednavky,
      cisloZasilky,
    });

    return odpovedOk({ cisloZasilky });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
