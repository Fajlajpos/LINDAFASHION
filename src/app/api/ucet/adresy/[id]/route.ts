import { db } from '@/lib/db';
import { overitUzivatele } from '@/lib/auth';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { adresaSchema } from '@/lib/validations/ucet';
import { nacistAdresy } from '@/lib/adresy';

export const dynamic = 'force-dynamic';

/**
 * Úprava a smazání uložené adresy.
 *
 * Vlastnictví se ověřuje u obou operací a je součástí `where`, ne jen
 * kontroly nad ním – cizí adresa se tak nedá ani přepsat, ani smazat,
 * a z odpovědi se nedá vyčíst, že vůbec existuje.
 */

interface Kontext {
  params: { id: string };
}

export async function PATCH(request: Request, { params }: Kontext) {
  try {
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const uzivatel = await overitUzivatele();
    if (!uzivatel) return odpovedChyba('Nejste přihlášeni.', 401);

    const vstup = adresaSchema.parse(await request.json());

    const stavajici = await db.address.findFirst({
      where: { id: params.id, userId: uzivatel.id },
      select: { id: true, jeVychozi: true, typ: true },
    });

    if (!stavajici) return odpovedChyba('Adresa nebyla nalezena.', 404);

    // Poslední adresu svého typu nelze zbavit příznaku výchozí – pokladna by
    // pak neměla co předvyplnit, přestože adresa existuje.
    const pocetTypu = await db.address.count({ where: { userId: uzivatel.id, typ: vstup.typ } });
    const jeVychozi = vstup.jeVychozi || (pocetTypu === 1 && stavajici.typ === vstup.typ);

    await db.$transaction(async (tx) => {
      if (jeVychozi) {
        await tx.address.updateMany({
          where: {
            userId: uzivatel.id,
            typ: vstup.typ,
            jeVychozi: true,
            NOT: { id: params.id },
          },
          data: { jeVychozi: false },
        });
      }

      await tx.address.updateMany({
        where: { id: params.id, userId: uzivatel.id },
        data: {
          jmenoPrijmeni: vstup.jmenoPrijmeni,
          ulice: vstup.ulice,
          mesto: vstup.mesto,
          psc: vstup.psc,
          zeme: vstup.zeme.toUpperCase(),
          telefon: vstup.telefon,
          typ: vstup.typ,
          jeVychozi,
        },
      });
    });

    return odpovedOk({ adresy: await nacistAdresy(uzivatel.id) });
  } catch (err) {
    return zpracovatChybu(err);
  }
}

export async function DELETE(request: Request, { params }: Kontext) {
  try {
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const uzivatel = await overitUzivatele();
    if (!uzivatel) return odpovedChyba('Nejste přihlášeni.', 401);

    const smazana = await db.address.findFirst({
      where: { id: params.id, userId: uzivatel.id },
      select: { id: true, typ: true, jeVychozi: true },
    });

    if (!smazana) return odpovedChyba('Adresa nebyla nalezena.', 404);

    await db.$transaction(async (tx) => {
      await tx.address.deleteMany({ where: { id: params.id, userId: uzivatel.id } });

      // Po smazání výchozí adresy povýšíme nejstarší zbylou téhož typu –
      // jinak by zákaznici zůstaly adresy, ze kterých se žádná nepředvyplní.
      if (!smazana.jeVychozi) return;

      const nastupce = await tx.address.findFirst({
        where: { userId: uzivatel.id, typ: smazana.typ },
        orderBy: { id: 'asc' },
        select: { id: true },
      });

      if (nastupce) {
        await tx.address.update({ where: { id: nastupce.id }, data: { jeVychozi: true } });
      }
    });

    return odpovedOk({ adresy: await nacistAdresy(uzivatel.id) });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
