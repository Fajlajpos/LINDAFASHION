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
  /**
   * Okamžik, po kterém záznam určitě nikoho neomezuje.
   *
   * Bez něj úklid mazal všechno starší deseti minut – jenže limity na
   * newsletter a kontaktní formulář mají okno hodinové. Hodinový limit se tím
   * fakticky smrskl na deset minut a stačilo počkat, aby se pět pokusů
   * obnovilo.
   */
  platiDo: number;
}

const okna = new Map<string, Okno>();

/** Jak často se mapa protřepe, ať u dlouho běžícího procesu neroste. */
const INTERVAL_UKLIDU_MS = 10 * 60 * 1000;
let posledniUklid = 0;

function uklidit(ted: number) {
  if (ted - posledniUklid < INTERVAL_UKLIDU_MS) return;
  posledniUklid = ted;

  for (const [klic, okno] of okna) {
    if (ted > okno.platiDo) okna.delete(klic);
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

  const okno = okna.get(klic);
  const cerstve = (okno?.pokusy ?? []).filter((t) => ted - t < oknoMs);

  /* Stejný klíč může chodit z víc endpointů s různě dlouhým oknem, proto
     platnost jen prodlužujeme, nikdy nezkracujeme. */
  const platiDo = Math.max(okno?.platiDo ?? 0, ted + oknoMs);

  if (cerstve.length >= maxPokusu) {
    const nejstarsi = Math.min(...cerstve);
    okna.set(klic, { pokusy: cerstve, platiDo });

    return {
      povoleno: false,
      zkusitZaSekund: Math.max(1, Math.ceil((oknoMs - (ted - nejstarsi)) / 1000)),
    };
  }

  cerstve.push(ted);
  okna.set(klic, { pokusy: cerstve, platiDo });

  return { povoleno: true, zkusitZaSekund: 0 };
}

/** Po úspěšném přihlášení nemá smysl držet předchozí neúspěšné pokusy. */
export function vynulovatLimit(klic: string) {
  okna.delete(klic);
}

/**
 * Klíč pro limit. Za reverzní proxy (Caddy) je skutečná IP v X-Forwarded-For –
 * `request.ip` by vracelo adresu proxy, tedy stejnou pro všechny.
 *
 * **Bere se poslední položka, ne první.** Proxy k příchozí hlavičce svoji
 * představu o klientovi *připojuje na konec*, nepřepisuje ji. Když si tedy
 * útočník do požadavku sám vloží `X-Forwarded-For: 1.2.3.4`, dorazí sem
 * `1.2.3.4, <skutečná IP>` – a čtení první položky by znamenalo, že si klíč
 * limitu vybírá sám a při každém pokusu jiný. Brzda na přihlašování tím šla
 * obejít i za správně nasazenou proxy.
 *
 * Poslední položku zapsala nejbližší proxy, tedy ta naše. Platí to za
 * předpokladu, že před `web` stojí právě jedna – což `docker-compose.yml`
 * zajišťuje tím, že port 3000 publikuje jen na localhost (viz `WEB_BIND`).
 * Caddyfile navíc hlavičku přepisuje na `{remote_host}`, takže se sem
 * podvržená hodnota nedostane vůbec; tohle je druhá vrstva.
 */
export function klientskaIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');

  if (forwarded) {
    const polozky = forwarded
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const posledni = polozky[polozky.length - 1];
    if (posledni) return posledni;
  }

  return request.headers.get('x-real-ip')?.trim() || 'neznama';
}
