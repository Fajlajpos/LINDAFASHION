import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SignJWT } from 'jose/jwt/sign';
import { overitTokenOvereni, vytvoritTokenOvereni } from './overeni-emailu';
import { tajnyKlic, vytvoritSessionToken, overitSessionToken } from './session';

/**
 * Ověřovací odkaz e-mailu je podepsaný token. Testuje se hlavně to, že se
 * nedá zaměnit se session tokenem ani podvrhnout.
 */
describe('ověřovací token e-mailu', () => {
  const puvodni = process.env.AUTH_SECRET;

  beforeAll(() => {
    process.env.AUTH_SECRET = 'testovaci-tajemstvi-ktere-ma-aspon-32-znaku';
  });

  afterAll(() => {
    process.env.AUTH_SECRET = puvodni;
  });

  it('platný token vrátí účet a adresu, pro kterou vznikl', async () => {
    const token = await vytvoritTokenOvereni({ userId: 'u1', email: 'jana@example.cz' });

    expect(await overitTokenOvereni(token)).toEqual({ userId: 'u1', email: 'jana@example.cz' });
  });

  it('session token jako ověřovací neprojde', async () => {
    const session = await vytvoritSessionToken({
      userId: 'u1',
      email: 'jana@example.cz',
      role: 'CUSTOMER',
      jmeno: null,
      tv: 0,
    });

    expect(await overitTokenOvereni(session)).toBeNull();
  });

  it('ověřovací token jako session neprojde', async () => {
    const token = await vytvoritTokenOvereni({ userId: 'u1', email: 'jana@example.cz' });

    expect(await overitSessionToken(token)).toBeNull();
  });

  it('pozměněný, cizím klíčem podepsaný nebo prošlý token neprojde', async () => {
    const token = await vytvoritTokenOvereni({ userId: 'u1', email: 'jana@example.cz' });
    expect(await overitTokenOvereni(token.slice(0, -2) + 'xx')).toBeNull();

    const cizi = await new SignJWT({ ucel: 'overeni-emailu', userId: 'u1', email: 'jana@example.cz' })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(new TextEncoder().encode('uplne-jiny-klic-ktery-ma-aspon-32-znaku'));
    expect(await overitTokenOvereni(cizi)).toBeNull();

    const prosly = await new SignJWT({ ucel: 'overeni-emailu', userId: 'u1', email: 'jana@example.cz' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(tajnyKlic());
    expect(await overitTokenOvereni(prosly)).toBeNull();
  });

  it('prázdný vstup vrátí null', async () => {
    expect(await overitTokenOvereni(null)).toBeNull();
    expect(await overitTokenOvereni('')).toBeNull();
  });
});
