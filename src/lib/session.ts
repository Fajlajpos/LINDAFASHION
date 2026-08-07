/**
 * Session token (JWT v HttpOnly cookie).
 *
 * Tenhle soubor musí zůstat Edge-safe – importuje ho `middleware.ts`, který běží
 * v Edge runtime. Proto tu NENÍ Prisma ani bcryptjs, jen `jose`. Ověření session
 * v middlewaru je tím pádem čistě kryptografické, bez dotazu do databáze.
 */
// Importujeme konkrétní podcesty, ne `jose` jako celek. Hlavní balík s sebou
// táhne i JWE (šifrované tokeny), které používá CompressionStream – ten v Edge
// runtime není, takže build hlásí varování a middleware zbytečně tloustne.
// My podepisujeme (JWS), nešifrujeme, takže ten kód nepotřebujeme.
import { SignJWT } from 'jose/jwt/sign';
import { jwtVerify } from 'jose/jwt/verify';

export const SESSION_COOKIE = 'linda_session';

/** 30 dní – po vypršení se zákaznice musí přihlásit znovu. */
export const SESSION_DOBA_SEKUND = 60 * 60 * 24 * 30;

export type Role = 'CUSTOMER' | 'ADMIN';

export interface SessionPayload {
  userId: string;
  email: string;
  role: Role;
  jmeno: string | null;
  /**
   * Verze tokenu (`User.tokenVerze`). Kontroluje se proti databázi všude, kde
   * na tom záleží – po změně hesla nebo odebrání práv se číslo zvýší a starý
   * token tím okamžitě přestane platit.
   */
  tv: number;
}

function tajnyKlic(): Uint8Array {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      'AUTH_SECRET chybí v .env nebo je kratší než 32 znaků. ' +
        'Vygeneruj ho: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64url\'))"'
    );
  }

  return new TextEncoder().encode(secret);
}

export async function vytvoritSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DOBA_SEKUND}s`)
    .sign(tajnyKlic());
}

export async function overitSessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, tajnyKlic(), { algorithms: ['HS256'] });

    // Payload z JWT je netypovaný – ověříme tvar, ať se dál pracuje s jistotou.
    if (
      typeof payload.userId !== 'string' ||
      typeof payload.email !== 'string' ||
      (payload.role !== 'CUSTOMER' && payload.role !== 'ADMIN')
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      jmeno: typeof payload.jmeno === 'string' ? payload.jmeno : null,
      tv: typeof payload.tv === 'number' ? payload.tv : 0,
    };
  } catch {
    // Neplatný podpis, prošlá platnost, poškozený token – všechno je "nepřihlášen".
    return null;
  }
}

/** Sjednocené nastavení cookie, ať se secure/sameSite nikde nerozejdou. */
export function sessionCookieNastaveni(maxAge: number = SESSION_DOBA_SEKUND) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}
