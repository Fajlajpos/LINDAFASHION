/**
 * Ochrana neveřejných částí webu (sekce 10 zadání).
 *
 * Do téhle chvíle nebyl `/admin` chráněný vůbec – stačilo znát URL a kdokoliv
 * se dostal ke všem datům zákaznic.
 *
 * Middleware běží v Edge runtime, takže tu jde jen ověřit podpis tokenu
 * (`session.ts`), ne sáhnout do databáze. Na citlivé operace proto každý
 * admin endpoint kontroluje roli ještě jednou u sebe – middleware je první
 * obranná linie, ne jediná.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, overitSessionToken } from './lib/session';

/** Vyžaduje přihlášení i roli ADMIN. */
const ADMIN_CESTY = ['/admin', '/api/admin'];

/**
 * Vyžaduje jen přihlášení.
 *
 * `/oblibene` tu schválně **není**. Oblíbené se drží v `localStorage` a
 * srdíčko na kartě funguje i bez účtu (viz `favorites-context.tsx`) – hlavička
 * dokonce nepřihlášené zákaznici ukazuje počítadlo uložených kousků. Za
 * přihlášením ta stránka znamenala, že si zákaznice naklikala výběr, viděla
 * „Oblíbené (3)" a klik na ně ji poslal na přihlašovací formulář, ze kterého
 * se ke svému vlastnímu seznamu nedostala. Po přihlášení se seznam se serverem
 * sloučí, ale to je vylepšení, ne podmínka.
 */
const PRIHLASENE_CESTY = ['/muj-ucet'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const jeAdminCesta = ADMIN_CESTY.some((c) => pathname === c || pathname.startsWith(`${c}/`));
  const jePrihlasenaCesta = PRIHLASENE_CESTY.some((c) => pathname === c || pathname.startsWith(`${c}/`));

  if (!jeAdminCesta && !jePrihlasenaCesta) {
    return NextResponse.next();
  }

  const session = await overitSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  const jeApi = pathname.startsWith('/api/');

  if (!session) {
    if (jeApi) {
      return NextResponse.json({ chyba: 'Nejste přihlášeni.' }, { status: 401 });
    }

    // Po přihlášení vrátíme zákaznici tam, kam původně mířila.
    const cil = new URL('/prihlaseni', request.url);
    cil.searchParams.set('dalsi', pathname);
    return NextResponse.redirect(cil);
  }

  if (jeAdminCesta && session.role !== 'ADMIN') {
    if (jeApi) {
      return NextResponse.json({ chyba: 'K této akci nemáte oprávnění.' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Všechno kromě statických souborů a nahraných fotek – ty middleware
     * nepotřebují a jen by se zpomalily.
     */
    '/((?!_next/static|_next/image|uploads|favicon.ico|robots.txt|sitemap.xml|llms.txt).*)',
  ],
};
