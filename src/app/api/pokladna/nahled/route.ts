import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { klientskaIp, zkontrolovatLimit } from '@/lib/rate-limit';
import { nahledSchema } from '@/lib/validations/objednavka';
import { nahledObjednavky } from '@/lib/objednavka';

export const dynamic = 'force-dynamic';

/**
 * POST /api/pokladna/nahled – rozpis ceny pro shrnutí pokladny.
 *
 * Počítá se stejnou funkcí, kterou pak účtuje objednávka (`spocitatNabidku`),
 * takže částka ve shrnutí je ta, kterou zákaznice zaplatí. Prohlížeč pošle
 * zpátky `ocekavanaCena` a server objednávku odmítne, když se mezitím změnila.
 *
 * Nic nezapisuje a nic nerezervuje – sklad se odečte až objednávkou.
 */
export async function POST(request: Request) {
  try {
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    // Náhled ověřuje i slevové kódy a poukazy, takže potřebuje stejnou brzdu
    // proti hádání hrubou silou jako `overit-kod`. Na běžné procházení pokladny
    // (pár náhledů na nákup) je štědrá.
    const limit = zkontrolovatLimit(`nahled:${klientskaIp(request)}`, 60, 10 * 60 * 1000);
    if (!limit.povoleno) {
      return odpovedChyba('Příliš mnoho pokusů. Zkuste to prosím za chvíli.', 429);
    }

    const vstup = nahledSchema.parse(await request.json());
    const vysledek = await nahledObjednavky(vstup);

    if (!vysledek.ok) {
      return odpovedChyba(vysledek.chyba.zprava, vysledek.chyba.status, vysledek.chyba.pole);
    }

    return odpovedOk(vysledek.data);
  } catch (err) {
    return zpracovatChybu(err);
  }
}
