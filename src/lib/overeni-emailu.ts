/**
 * Ověření e-mailové adresy účtu.
 *
 * Registrace adresu dřív neověřovala vůbec, takže šlo založit účet na cizí
 * e-mail – a export údajů i smazání účtu pak sahaly na data vedená jen podle
 * e-mailu (zprávy z kontaktního formuláře, souhlasy, odběr, hlídání skladu).
 * Kdokoli tak mohl přečíst nebo smazat cizí zprávy. Teď se tahle data čtou
 * a mažou jen u účtu s `emailOverenoAt`.
 *
 * Ověření je „měkké“: účet funguje hned po registraci jako dřív, jen data
 * vázaná výhradně na adresu čekají na důkaz, že adresa patří jí.
 *
 * ## Proč podepsaný token, ne řádek v tabulce
 *
 * Ověření se dá zopakovat bez následků (podruhé jen zapíše totéž), takže
 * jednorázovost, kvůli které `PasswordReset` a `ZmenaEmailu` drží tabulku,
 * tu nic nepřináší. Podepsaný token nepotřebuje migraci, retenci ani úklid.
 *
 * Token nese **e-mail**, pro který byl vydán. Ověřuje se jen tehdy, když účet
 * pořád tu adresu má – starý odkaz po změně e-mailu tak novou adresu neověří.
 *
 * Claim `ucel` drží tokeny od sebe: session token ho nemá, takže tady
 * neprojde, a ověřovací token nemá `role`, takže neprojde jako session.
 */
import { SignJWT } from 'jose/jwt/sign';
import { jwtVerify } from 'jose/jwt/verify';
import { tajnyKlic } from './session';

const UCEL = 'overeni-emailu';

/** Odkaz platí týden – ověření nikam nespěchá a nic neodemyká hned. */
export const PLATNOST_DNU = 7;

export interface OvereniEmailu {
  userId: string;
  email: string;
}

export async function vytvoritTokenOvereni(udaje: OvereniEmailu): Promise<string> {
  return new SignJWT({ ucel: UCEL, userId: udaje.userId, email: udaje.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${PLATNOST_DNU}d`)
    .sign(tajnyKlic());
}

/** Vrátí obsah tokenu, nebo `null` pro neplatný, prošlý či cizí token. */
export async function overitTokenOvereni(token: string | null | undefined): Promise<OvereniEmailu | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, tajnyKlic(), { algorithms: ['HS256'] });

    if (payload.ucel !== UCEL) return null;
    if (typeof payload.userId !== 'string' || typeof payload.email !== 'string') return null;

    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}
