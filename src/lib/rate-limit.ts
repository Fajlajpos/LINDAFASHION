/**
 * Rate limiting proti brute-force útoku na přihlášení a proti spamu
 * na veřejných formulářích (sekce 10 zadání).
 *
 * Vědomé omezení: počítadlo žije v paměti procesu, takže se resetuje při
 * restartu a nesdílí se mezi víc instancemi `web`. Pro jeden kontejner, což
 * je plánované nasazení (sekce 3), to stačí. Až by běželo víc instancí,
 * přesuň počítadlo do Postgresu nebo Redisu – rozhraní zůstane stejné.
 */

interface Okno {
  pokusy: number[];
}

const okna = new Map<string, Okno>();

/** Ať mapa neroste donekonečna u dlouho běžícího procesu. */
const UKLID_PO_MS = 10 * 60 * 1000;
let posledniUklid = 0;

function uklidit(ted: number) {
  if (ted - posledniUklid < UKLID_PO_MS) return;
  posledniUklid = ted;

  for (const [klic, okno] of okna) {
    if (okno.pokusy.every((t) => ted - t > UKLID_PO_MS)) {
      okna.delete(klic);
    }
  }
}

export interface VysledekLimitu {
  povoleno: boolean;
  /** Kolik sekund zbývá do uvolnění, když `povoleno === false`. */
  zkusitZaSekund: number;
}

export function zkontrolovatLimit(klic: string, maxPokusu: number, oknoMs: number): VysledekLimitu {
  const ted = Date.now();
  uklidit(ted);

  const okno = okna.get(klic) ?? { pokusy: [] };
  const cerstve = okno.pokusy.filter((t) => ted - t < oknoMs);

  if (cerstve.length >= maxPokusu) {
    const nejstarsi = Math.min(...cerstve);
    okna.set(klic, { pokusy: cerstve });

    return {
      povoleno: false,
      zkusitZaSekund: Math.max(1, Math.ceil((oknoMs - (ted - nejstarsi)) / 1000)),
    };
  }

  cerstve.push(ted);
  okna.set(klic, { pokusy: cerstve });

  return { povoleno: true, zkusitZaSekund: 0 };
}

/** Po úspěšném přihlášení nemá smysl držet předchozí neúspěšné pokusy. */
export function vynulovatLimit(klic: string) {
  okna.delete(klic);
}

/**
 * Klíč pro limit. Za reverzní proxy (Caddy) je skutečná IP v X-Forwarded-For –
 * `request.ip` by vracelo adresu proxy, tedy stejnou pro všechny.
 */
export function klientskaIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  return request.headers.get('x-real-ip')?.trim() || 'neznama';
}
