import { odpovedChyba, odpovedOk, zpracovatChybu } from '@/lib/api';
import { klientskaIp, zkontrolovatLimit } from '@/lib/rate-limit';
import { nacistNaseptavac } from '@/lib/katalog';

export const dynamic = 'force-dynamic';

/** Delší dotaz než tohle je překlep nebo pokus něco protlačit, ne hledání. */
const MAX_DELKA_DOTAZU = 80;

/*
 * Limit je proti stahování katalogu po řádcích, ne proti psaní.
 *
 * Pole posílá dotaz až po 200 ms klidu, takže i rychlé psaní vygeneruje řádově
 * jednotky požadavků za větu. 60 za minutu tedy člověk psaním nepotká, ale
 * skriptu se to prochází katalog po písmenech přestane vyplácet.
 *
 * Klíč je oddělený prefixem: `klientskaIp` vrací stejnou hodnotu i pro
 * přihlášení a formuláře, a bez prefixu by hledání ukrajovalo z pokusů
 * o přihlášení (a naopak).
 */
const LIMIT_POCET = 60;
const LIMIT_OKNO_MS = 60 * 1000;

/**
 * GET /api/vyhledavani?q=… – návrhy pro našeptávač v hlavičce.
 *
 * Veřejný endpoint bez přihlášení; vrací jen to, co je stejně vidět
 * v katalogu (aktivní produkty), a jen pár položek.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const dotaz = (url.searchParams.get('q') ?? '').slice(0, MAX_DELKA_DOTAZU).trim();

    // Prázdný dotaz odbavíme bez sáhnutí do databáze i bez ukrojení z limitu –
    // pole ho pošle při mazání znaků a odpověď je stejně vždycky prázdná.
    if (!dotaz) {
      return odpovedOk({ produkty: [], kategorie: [], celkem: 0, volnaShoda: false });
    }

    const limit = zkontrolovatLimit(
      `vyhledavani:${klientskaIp(request)}`,
      LIMIT_POCET,
      LIMIT_OKNO_MS
    );

    if (!limit.povoleno) {
      return odpovedChyba('Příliš mnoho dotazů. Zkuste to prosím za chvíli.', 429);
    }

    return odpovedOk(await nacistNaseptavac(dotaz));
  } catch (err) {
    return zpracovatChybu(err);
  }
}
