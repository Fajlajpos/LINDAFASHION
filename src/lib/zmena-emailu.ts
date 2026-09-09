/**
 * Změna přihlašovacího e-mailu (čl. 16 GDPR – právo na opravu).
 *
 * E-mail se do téhle chvíle opravit nedal vůbec: `profilSchema` ho záměrně
 * neobsahuje, protože je to zároveň přihlašovací jméno a adresa, kam chodí
 * faktury. Jediná cesta k nápravě překlepu tak bylo smazat účet — což je
 * u práva na opravu odpověď „ne".
 *
 * ## Proč to nejde změnit rovnou
 *
 * Kdyby stačilo pole přepsat, pár vteřin u odemčeného prohlížeče by znamenalo
 * převzetí účtu: útočník nastaví svůj e-mail a přes „zapomenuté heslo" si
 * nechá poslat reset. Změna proto stojí na dvou nezávislých důkazech:
 *
 *  1. **stávající heslo** — že u prohlížeče sedí majitelka účtu;
 *  2. **potvrzení z nové schránky** — že jí ta adresa opravdu patří.
 *
 * Odkaz míří na stránku, ne rovnou na endpoint: potvrzuje se **POSTem**.
 * Kdyby změnu dokončilo prosté otevření adresy, provedl by ji náhledový robot
 * poštovního klienta dřív, než si zákaznice zprávu přečte — stejný důvod,
 * proč je POST i potvrzení newsletteru.
 *
 * Ukládá se jen SHA-256 otisk tokenu, nikdy token samotný — kdyby se někdo
 * dostal k databázi, odkaz z ní nesestaví.
 */
import crypto from 'crypto';
import { db } from './db';

/**
 * Odkaz platí 24 hodin.
 *
 * Déle než u resetu hesla (hodina): tenhle e-mail chodí na adresu, do které
 * se zákaznice teprve chystá přejít, takže si ji nemusí přečíst hned. Zároveň
 * je to pořád okno, po kterém token propadne sám.
 */
export const PLATNOST_HODIN = 24;

export function otisk(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Založí žádost o změnu a zneplatní všechny starší nepoužité.
 *
 * Po několika pokusech tak platí vždy jen ten poslední odeslaný odkaz — jinak
 * by šlo zneužít starší token na adresu, kterou už si zákaznice rozmyslela.
 */
export async function zalozitZmenuEmailu(userId: string, novyEmail: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('base64url');

  await db.$transaction([
    db.zmenaEmailu.updateMany({
      where: { userId, pouzitoAt: null },
      data: { pouzitoAt: new Date() },
    }),
    db.zmenaEmailu.create({
      data: {
        userId,
        novyEmail,
        tokenHash: otisk(token),
        platnyDo: new Date(Date.now() + PLATNOST_HODIN * 60 * 60 * 1000),
      },
    }),
  ]);

  return token;
}

export interface PlatnaZmena {
  id: string;
  userId: string;
  novyEmail: string;
}

/**
 * Vrátí žádost, pokud je token platný, nepoužitý, nevypršel — a účet pořád
 * existuje jako účet živé zákaznice.
 *
 * Kontrola `anonymizovanoAt` tu je ze stejného důvodu jako
 * v `/api/auth/zapomenute-heslo`: po žádosti o výmaz se účet nemaže fyzicky,
 * jen se přepíše na zástupnou adresu. Token vydaný **před** výmazem by jinak
 * ještě 24 hodin platil a přepsal by ji zpátky na skutečnou — tedy vrátil na
 * anonymizovaný účet živý osobní údaj, a to bez jakéhokoli přihlášení.
 *
 * Anonymizace sama žádosti maže, takže tohle je druhá vrstva. Stojí za to:
 * je to jediné místo, kde se e-mail účtu dá změnit bez hesla, a rozhoduje
 * o něm odkaz ležící v cizí schránce.
 *
 * Patří to sem, ne do route handleru — funkci sdílí potvrzovací stránka
 * i endpoint a dvě kopie autorizační kontroly se časem rozejdou.
 */
export async function overitTokenZmeny(token: string): Promise<PlatnaZmena | null> {
  if (!token || token.length < 20) return null;

  const zaznam = await db.zmenaEmailu.findUnique({
    where: { tokenHash: otisk(token) },
    select: {
      id: true,
      userId: true,
      novyEmail: true,
      platnyDo: true,
      pouzitoAt: true,
      user: { select: { anonymizovanoAt: true } },
    },
  });

  if (!zaznam) return null;
  if (zaznam.pouzitoAt !== null) return null;
  if (zaznam.platnyDo.getTime() < Date.now()) return null;
  if (zaznam.user.anonymizovanoAt !== null) return null;

  return { id: zaznam.id, userId: zaznam.userId, novyEmail: zaznam.novyEmail };
}

/** Úklid prošlých a použitých žádostí, ať tabulka neroste donekonečna. */
export async function uklidZmenEmailu(): Promise<number> {
  const vysledek = await db.zmenaEmailu.deleteMany({
    where: {
      OR: [{ platnyDo: { lt: new Date() } }, { pouzitoAt: { not: null } }],
    },
  });

  return vysledek.count;
}
