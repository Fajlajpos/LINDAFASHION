import { db } from '@/lib/db';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { overitAdmina, odpovedNeautorizovano, zapsatDoAuditu } from '@/lib/admin';
import { nastaveniSchema } from '@/lib/validations/nastaveni';
import { ID_NASTAVENI, VYCHOZI_NASTAVENI } from '@/lib/nastaveni';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

/** GET – aktuální nastavení e-shopu (sekce 6.7 a 6.8). */
export async function GET() {
  try {
    if (!(await overitAdmina())) return odpovedNeautorizovano();

    const zaznam = await db.settings.findUnique({ where: { id: ID_NASTAVENI } });

    if (!zaznam) {
      return odpovedOk({ nastaveni: { ...VYCHOZI_NASTAVENI, id: ID_NASTAVENI } });
    }

    return odpovedOk({
      nastaveni: {
        ...zaznam,
        cenaDopravyZasilkovna: zaznam.cenaDopravyZasilkovna === null ? null : Number(zaznam.cenaDopravyZasilkovna),
        cenaDopravyPPL: zaznam.cenaDopravyPPL === null ? null : Number(zaznam.cenaDopravyPPL),
        cenaDopravyCeskaPosta: zaznam.cenaDopravyCeskaPosta === null ? null : Number(zaznam.cenaDopravyCeskaPosta),
        prahDopravaZdarma: zaznam.prahDopravaZdarma === null ? null : Number(zaznam.prahDopravaZdarma),
      },
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}

/** PUT – uložení nastavení. Řádek je jediný, takže upsert na pevné id. */
export async function PUT(request: Request) {
  try {
    const admin = await overitAdmina();
    if (!admin) return odpovedNeautorizovano();
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const vstup = nastaveniSchema.parse(await request.json());

    const data = {
      rezimDovolene: vstup.rezimDovolene ?? false,
      datumNavratu: vstup.datumNavratu,
      zpravaProZakazniky: vstup.zpravaProZakazniky,
      zablokovatObjednavky: vstup.zablokovatObjednavky ?? false,
      nazevFirmy: vstup.nazevFirmy,
      icoFirmy: vstup.icoFirmy,
      dicFirmy: vstup.dicFirmy,
      adresaFirmy: vstup.adresaFirmy,
      telefonFirmy: vstup.telefonFirmy,
      emailFirmy: vstup.emailFirmy,
      jePlatceDph: vstup.jePlatceDph ?? false,
      socialInstagram: vstup.socialInstagram,
      socialFacebook: vstup.socialFacebook,
      cenaDopravyZasilkovna:
        vstup.cenaDopravyZasilkovna === null ? null : new Prisma.Decimal(vstup.cenaDopravyZasilkovna),
      cenaDopravyPPL: vstup.cenaDopravyPPL === null ? null : new Prisma.Decimal(vstup.cenaDopravyPPL),
      cenaDopravyCeskaPosta:
        vstup.cenaDopravyCeskaPosta === null ? null : new Prisma.Decimal(vstup.cenaDopravyCeskaPosta),
      prahDopravaZdarma: vstup.prahDopravaZdarma === null ? null : new Prisma.Decimal(vstup.prahDopravaZdarma),
    };

    await db.settings.upsert({
      where: { id: ID_NASTAVENI },
      update: data,
      create: { id: ID_NASTAVENI, ...data },
    });

    await zapsatDoAuditu(admin.email, 'nastaveni.upraveno', 'Settings', String(ID_NASTAVENI), {
      rezimDovolene: data.rezimDovolene,
      zablokovatObjednavky: data.zablokovatObjednavky,
    });

    return odpovedOk({ ulozeno: true });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
