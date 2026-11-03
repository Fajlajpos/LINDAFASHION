import { z } from 'zod';
import { db } from '@/lib/db';
import { hashPassword, prihlasit } from '@/lib/auth';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { klientskaIp, zkontrolovatLimit } from '@/lib/rate-limit';
import { overitResetToken } from '@/lib/reset-hesla';

export const dynamic = 'force-dynamic';

const heslo = z
  .string()
  .min(8, 'Heslo musí mít alespoň 8 znaků.')
  .max(200, 'Heslo je příliš dlouhé.')
  .regex(/[a-zA-Zá-žÁ-Ž]/, 'Heslo musí obsahovat alespoň jedno písmeno.')
  .regex(/[0-9]/, 'Heslo musí obsahovat alespoň jednu číslici.');

const schema = z
  .object({
    token: z.string().min(20, 'Odkaz je neplatný.'),
    heslo,
    hesloZnovu: z.string().min(1, 'Zopakujte prosím heslo.'),
  })
  .refine((d) => d.heslo === d.hesloZnovu, {
    message: 'Hesla se neshodují.',
    path: ['hesloZnovu'],
  });

/**
 * POST /api/auth/obnova-hesla – nastaví nové heslo podle jednorázového tokenu.
 *
 * Po změně se zvýší `tokenVerze`, čímž se okamžitě odhlásí všechna zařízení.
 * To je podstatné: pokud si zákaznice mění heslo proto, že se k účtu někdo
 * dostal, útočníkova relace musí skončit teď, ne za 30 dní.
 */
export async function POST(request: Request) {
  try {
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const limit = zkontrolovatLimit(`obnova:${klientskaIp(request)}`, 10, 60 * 60 * 1000);
    if (!limit.povoleno) {
      return odpovedChyba('Příliš mnoho pokusů. Zkuste to prosím za chvíli.', 429);
    }

    const vstup = schema.parse(await request.json());
    const reset = await overitResetToken(vstup.token);

    if (!reset) {
      return odpovedChyba(
        'Odkaz pro obnovu hesla je neplatný nebo mu vypršela platnost. Požádejte prosím o nový.',
        410
      );
    }

    const hash = await hashPassword(vstup.heslo);

    const provedeno = await db.$transaction(async (tx) => {
      /*
       * Token je jednorázový. Značka „použito“ se nastavuje **podmíněně**
       * (`pouzitoAt: null` ve `where`) a kontroluje se počet – dřív to byl
       * prostý `update` a dva souběžné požadavky se stejným odkazem prošly
       * kontrolou výš oba a oba nastavily heslo. Stejná úvaha jako u storna.
       */
      const oznaceno = await tx.passwordReset.updateMany({
        where: { id: reset.id, pouzitoAt: null },
        data: { pouzitoAt: new Date() },
      });
      if (oznaceno.count !== 1) return false;

      /*
       * Nové heslo a zneplatnění dosavadních relací patří do jedné transakce.
       * Dřív se `tokenVerze` zvyšovala až samostatným dotazem za ní – kdyby
       * proces mezi tím spadl, bylo by heslo změněné, ale útočníkova relace
       * by běžela dál až do vypršení tokenu, tedy 30 dní. Právě tomu má
       * zvýšení verze zabránit.
       */
      await tx.user.update({
        where: { id: reset.userId },
        data: { passwordHash: hash, tokenVerze: { increment: 1 } },
      });

      // Odkaz přišel do schránky účtu, takže reset zároveň dokazuje, že adresa
      // je její. Dřívější datum ověření se nepřepisuje.
      await tx.user.updateMany({
        where: { id: reset.userId, emailOverenoAt: null },
        data: { emailOverenoAt: new Date() },
      });

      return true;
    });

    if (!provedeno) {
      return odpovedChyba(
        'Odkaz pro obnovu hesla už byl použitý. Požádejte prosím o nový.',
        410
      );
    }

    // Rovnou přihlásíme – zákaznice právě prokázala přístup k e-mailu i heslu.
    const user = await db.user.findUnique({
      where: { id: reset.userId },
      select: { id: true, email: true, jmeno: true, role: true, tokenVerze: true },
    });

    if (user) await prihlasit(user);

    return odpovedOk({
      zprava: 'Heslo bylo změněno.',
      presmerovat: user?.role === 'ADMIN' ? '/admin' : '/muj-ucet',
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}

/** GET ?token= – ověření platnosti odkazu, aby stránka nezobrazila formulář zbytečně. */
export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get('token') ?? '';
    const reset = await overitResetToken(token);
    return odpovedOk({ platny: reset !== null });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
