/**
 * Sjednocené odpovědi API a překlad chyb.
 *
 * Tvar chybové odpovědi je schválně `{ chyba, pole? }` – `pole` umožňuje
 * formuláři zobrazit hlášku přímo u konkrétního inputu, ne jen v souhrnu
 * nahoře (pravidlo projektu i sekce 13 zadání).
 */
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export interface ApiChyba {
  chyba: string;
  pole?: Record<string, string>;
}

export function odpovedOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function odpovedChyba(zprava: string, status = 400, pole?: Record<string, string>) {
  const telo: ApiChyba = pole ? { chyba: zprava, pole } : { chyba: zprava };
  return NextResponse.json(telo, { status });
}

/** Zod chyby na mapu `název pole → hláška`, aby je formulář uměl umístit. */
export function zodNaPole(err: ZodError): Record<string, string> {
  const pole: Record<string, string> = {};

  for (const problem of err.errors) {
    const klic = problem.path.join('.') || '_';
    if (!pole[klic]) pole[klic] = problem.message;
  }

  return pole;
}

/**
 * Poslední záchyt pro route handlery. Nikdy nepouští detail databázové chyby
 * ven k uživateli – jen ho zaloguje.
 */
export function zpracovatChybu(err: unknown) {
  if (err instanceof ZodError) {
    return odpovedChyba('Zkontrolujte prosím vyplněné údaje.', 422, zodNaPole(err));
  }

  /*
   * Rozbité tělo požadavku je chyba volajícího, ne serveru. `request.json()`
   * na nevalidním JSONu hází SyntaxError, který dřív propadl až do větve 500 –
   * odpověď pak tvrdila „něco se pokazilo na naší straně“ a zbytečně plnila log.
   */
  if (err instanceof SyntaxError) {
    return odpovedChyba('Neplatný formát požadavku.', 400);
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const cil = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'hodnota';
      return odpovedChyba(`Tato ${cil} už je obsazená.`, 409);
    }
    if (err.code === 'P2025') {
      return odpovedChyba('Záznam nebyl nalezen.', 404);
    }
  }

  console.error('[API] Neošetřená chyba:', err);
  return odpovedChyba('Něco se pokazilo na naší straně. Zkuste to prosím znovu.', 500);
}

/**
 * Jednoduchá CSRF pojistka pro mutující požadavky.
 *
 * Session cookie je SameSite=Lax, takže cizí web ji na POST vůbec nepřipojí –
 * tohle je druhá vrstva pro případ, že by se nastavení cookie někdy změnilo.
 */
export function jeStejnyPuvod(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // stejný původ / non-browser klient origin neposílá

  const povolene = [process.env.APP_URL, process.env.NEXTAUTH_URL].filter(Boolean) as string[];
  const host = request.headers.get('host');
  if (host) {
    povolene.push(`http://${host}`, `https://${host}`);
  }

  return povolene.some((p) => {
    try {
      return new URL(p).origin === new URL(origin).origin;
    } catch {
      return false;
    }
  });
}
