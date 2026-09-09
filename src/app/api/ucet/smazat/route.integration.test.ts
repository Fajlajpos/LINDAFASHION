import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/hesla';
import { vycistitDatabazi } from '@/test/data';
import { otisk, overitTokenZmeny, zalozitZmenuEmailu } from '@/lib/zmena-emailu';

/**
 * Anonymizace účtu a rozpracovaná změna přihlašovacího e-mailu.
 *
 * Účet se po žádosti o výmaz **nemaže fyzicky** – přepíše se na zástupnou
 * adresu, aby objednávky zůstaly použitelné jako účetní doklad. Tím ale
 * nesepne `onDelete: Cascade`, takže všechno, co na uživateli visí, musí
 * anonymizace vyjmenovat sama.
 *
 * `ZmenaEmailu` v tom výčtu chyběla, a je to ta nejnepříjemnější tabulka,
 * na kterou se dá zapomenout: nese `novyEmail` v otevřeném tvaru a k němu
 * token, který platí 24 hodin a potvrzuje se **bez přihlášení**. Odkaz
 * odeslaný pár minut před výmazem tak šel použít i potom a přepsal zástupnou
 * adresu zpátky na skutečnou.
 *
 * Testuje se to nad skutečnou databází, protože jádrem je právě to, co
 * v transakci zůstane a co ne.
 */

const stav = vi.hoisted(() => ({ prihlasenyUzivatel: null as { id: string; email: string } | null }));

/*
 * `overitUzivatele` i `odhlasit` sahají na `next/headers`, které mimo
 * požadavek Next.js neexistuje.
 */
vi.mock('@/lib/auth', () => ({
  overitUzivatele: async () => stav.prihlasenyUzivatel,
  odhlasit: () => undefined,
}));

const { POST } = await import('./route');

const HESLO = 'TajneHeslo123';

/** Požadavek bez hlavičky Origin – tak, jak dorazí od stejného původu. */
function pozadavek(heslo = HESLO): Request {
  return new Request('http://localhost:3000/api/ucet/smazat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ heslo }),
  });
}

async function zalozitZakaznici() {
  const uzivatel = await db.user.create({
    data: {
      email: 'jana.novakova@example.com',
      passwordHash: await hashPassword(HESLO),
      jmeno: 'Jana Nováková',
    },
  });

  stav.prihlasenyUzivatel = { id: uzivatel.id, email: uzivatel.email };
  return uzivatel;
}

describe('POST /api/ucet/smazat', () => {
  beforeEach(async () => {
    await vycistitDatabazi();
    stav.prihlasenyUzivatel = null;
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('smaže rozpracovanou žádost o změnu e-mailu a token přestane platit', async () => {
    const uzivatel = await zalozitZakaznici();
    const token = await zalozitZmenuEmailu(uzivatel.id, 'utocnik@example.com');

    // Než se účet smaže, odkaz z nové schránky platí.
    expect(await overitTokenZmeny(token)).not.toBeNull();

    const odpoved = await POST(pozadavek());
    expect(odpoved.status).toBe(200);

    // Řádek s adresou v otevřeném tvaru je pryč…
    const zbyle = await db.zmenaEmailu.findMany({ where: { userId: uzivatel.id } });
    expect(zbyle).toHaveLength(0);

    // …a odkaz, který mohl ležet v cizí schránce, s ním.
    expect(await overitTokenZmeny(token)).toBeNull();

    // Účet zůstává, jen anonymizovaný – objednávky na něm visí jako doklad.
    const po = await db.user.findUniqueOrThrow({ where: { id: uzivatel.id } });
    expect(po.anonymizovanoAt).not.toBeNull();
    expect(po.email).not.toBe('jana.novakova@example.com');
  });

  it('token k anonymizovanému účtu neplatí, i kdyby řádek přežil', async () => {
    /*
     * Druhá vrstva, nezávislá na tom, jestli si anonymizace na tabulku
     * vzpomněla. `overitTokenZmeny` je jediné místo, kde se e-mail účtu dá
     * změnit bez hesla, a rozhoduje o něm odkaz v cizí schránce – takže se
     * ptá i na `anonymizovanoAt`, přesně jako `/api/auth/zapomenute-heslo`.
     */
    const uzivatel = await zalozitZakaznici();

    const token = 'a'.repeat(43);
    await db.zmenaEmailu.create({
      data: {
        userId: uzivatel.id,
        novyEmail: 'utocnik@example.com',
        tokenHash: otisk(token),
        platnyDo: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    expect(await overitTokenZmeny(token)).not.toBeNull();

    await db.user.update({
      where: { id: uzivatel.id },
      data: { anonymizovanoAt: new Date() },
    });

    expect(await overitTokenZmeny(token)).toBeNull();
  });
});
