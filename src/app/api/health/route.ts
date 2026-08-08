import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health – kontrola pro Docker a reverzní proxy.
 *
 * Compose se dřív ptal na `/`. To je ale Server Component, která sahá do
 * databáze: při nedostupné databázi se vyrenderuje chybová hranice a `wget`
 * na ni dostane úplně obyčejnou odpověď 200. Kontejner tak hlásil „healthy"
 * s rozbitou databází – a `worker`, který na jeho zdraví čeká, klidně
 * nastartoval do prázdna.
 *
 * `SELECT 1` je nejlevnější dotaz, který přesto projde celou cestou: pool,
 * spojení, autentizaci. Odpověď se nikde necachuje.
 */
export async function GET() {
  const zacatek = Date.now();

  try {
    await db.$queryRaw`SELECT 1`;

    return NextResponse.json(
      { stav: 'ok', databaze: 'ok', trvaniMs: Date.now() - zacatek },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    // Detail chyby ven nepatří – nese jméno hostitele i uživatele databáze.
    console.error('[health] Databáze neodpovídá:', err);

    return NextResponse.json(
      { stav: 'chyba', databaze: 'nedostupna', trvaniMs: Date.now() - zacatek },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
