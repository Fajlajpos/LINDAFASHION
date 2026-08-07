import { cookies } from 'next/headers';
import { SESSION_COOKIE, sessionCookieNastaveni } from '@/lib/session';
import { odpovedChyba, odpovedOk, jeStejnyPuvod } from '@/lib/api';

export async function POST(request: Request) {
  if (!jeStejnyPuvod(request)) {
    return odpovedChyba('Neplatný požadavek.', 403);
  }

  // maxAge 0 cookie okamžitě zneplatní.
  cookies().set(SESSION_COOKIE, '', sessionCookieNastaveni(0));

  return odpovedOk({ presmerovat: '/' });
}
