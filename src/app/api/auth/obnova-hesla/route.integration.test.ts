import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/hesla';
import { zalozitReset } from '@/lib/reset-hesla';
import { vycistitDatabazi } from '@/test/data';

/**
 * Reset hesla: jednorázovost tokenu pod souběhem a ověření e-mailu.
 *
 * Token se dřív označoval za použitý prostým `update`, takže dva souběžné
 * požadavky se stejným odkazem prošly kontrolou oba a oba nastavily heslo.
 */

vi.mock('@/lib/auth', async () => ({
  hashPassword: (await import('@/lib/hesla')).hashPassword,
  prihlasit: async () => undefined,
}));

const { POST } = await import('./route');

function pozadavek(token: string, heslo: string): Request {
  return new Request('http://localhost:3000/api/auth/obnova-hesla', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, heslo, hesloZnovu: heslo }),
  });
}

describe('POST /api/auth/obnova-hesla', () => {
  beforeEach(async () => {
    await vycistitDatabazi();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('při souběhu uplatní jeden odkaz jen jednou', async () => {
    const uzivatel = await db.user.create({
      data: { email: 'reset@example.com', passwordHash: await hashPassword('StareHeslo1') },
    });
    const token = await zalozitReset(uzivatel.id);

    const odpovedi = await Promise.all([
      POST(pozadavek(token, 'NoveHesloA1')),
      POST(pozadavek(token, 'NoveHesloB2')),
    ]);

    const stavy = odpovedi.map((o) => o.status).sort();
    expect(stavy).toEqual([200, 410]);

    // Platí právě to heslo, jehož požadavek prošel, a verze tokenu stoupla jednou.
    const po = await db.user.findUniqueOrThrow({ where: { id: uzivatel.id } });
    const platiA = await verifyPassword('NoveHesloA1', po.passwordHash);
    const platiB = await verifyPassword('NoveHesloB2', po.passwordHash);
    expect(platiA !== platiB).toBe(true);
    expect(po.tokenVerze).toBe(1);
  });

  it('dokončený reset ověří e-mail účtu', async () => {
    const uzivatel = await db.user.create({
      data: { email: 'overeni@example.com', passwordHash: await hashPassword('StareHeslo1') },
    });
    expect(uzivatel.emailOverenoAt).toBeNull();

    const token = await zalozitReset(uzivatel.id);
    const odpoved = await POST(pozadavek(token, 'NoveHeslo123'));
    expect(odpoved.status).toBe(200);

    const po = await db.user.findUniqueOrThrow({ where: { id: uzivatel.id } });
    expect(po.emailOverenoAt).not.toBeNull();
  });
});
