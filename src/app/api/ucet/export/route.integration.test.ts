import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/lib/db';
import { vycistitDatabazi } from '@/test/data';

/**
 * Export údajů (čl. 15/20 GDPR) a data vedená jen podle e-mailu.
 *
 * Registrace adresu neověřuje, takže kdokoli mohl založit účet na cizí
 * e-mail a exportem si stáhnout cizí zprávy z kontaktního formuláře.
 * Ta data proto export vydá jen u účtu s ověřeným e-mailem.
 */

const stav = vi.hoisted(() => ({
  prihlasenyUzivatel: null as { id: string; email: string; emailOveren: boolean } | null,
}));

vi.mock('@/lib/auth', () => ({
  overitUzivatele: async () => stav.prihlasenyUzivatel,
}));

const { GET } = await import('./route');

const EMAIL = 'obet@example.com';

async function zalozitUcet(emailOveren: boolean) {
  const uzivatel = await db.user.create({
    data: {
      email: EMAIL,
      passwordHash: 'neni-potreba',
      emailOverenoAt: emailOveren ? new Date() : null,
    },
  });
  stav.prihlasenyUzivatel = { id: uzivatel.id, email: uzivatel.email, emailOveren };

  await db.contactMessage.create({
    data: { jmeno: 'Oběť', email: EMAIL, predmet: 'Soukromé', zprava: 'Tajný obsah zprávy' },
  });

  return uzivatel;
}

async function stahnout() {
  const odpoved = await GET(new Request('http://localhost:3000/api/ucet/export'));
  expect(odpoved.status).toBe(200);
  return (await odpoved.json()) as Record<string, unknown>;
}

describe('GET /api/ucet/export', () => {
  beforeEach(async () => {
    await vycistitDatabazi();
    stav.prihlasenyUzivatel = null;
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('neověřenému účtu nevydá zprávy vedené jen podle e-mailu', async () => {
    await zalozitUcet(false);

    const data = await stahnout();

    expect(data.zpravyZFormulare).toEqual([]);
    expect(JSON.stringify(data)).not.toContain('Tajný obsah zprávy');
    expect(typeof data.poznamka).toBe('string');
  });

  it('ověřenému účtu je vydá', async () => {
    await zalozitUcet(true);

    const data = await stahnout();

    expect(data.zpravyZFormulare).toHaveLength(1);
    expect(JSON.stringify(data)).toContain('Tajný obsah zprávy');
    expect(data.poznamka).toBeUndefined();
  });
});
