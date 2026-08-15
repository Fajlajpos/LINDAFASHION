/**
 * Platební brána GoPay (REST API v3).
 *
 * Do doby, než jsou v `.env` klíče, se brána tváří jako nedostupná
 * (`jeNastaveno() === false`) a e-shop nabízí jen bankovní převod. Volající
 * místa se pak měnit nemusí – stačí vyplnit `GOPAY_*` a karta se zapne sama.
 *
 * ## Co je tady důležité
 *
 * - **Částky jsou v haléřích.** GoPay pracuje v nejmenší jednotce měny, stejně
 *   jako [penize.ts](./penize.ts). Poslat korunovou částku znamená naúčtovat
 *   setinu ceny; kontrola typem `Halere` je proto na místě.
 * - **Stav platby se nikdy nebere z prohlížeče.** Návratová adresa i notifikace
 *   od GoPay nesou jen `id` platby – že je zaplaceno, se musí doptat serverem
 *   na server. Jinak by stačilo otevřít návratovou adresu ručně a objednávka
 *   by se označila jako uhrazená.
 * - **Token se cachuje.** OAuth2 token platí ~30 minut; brát nový ke každému
 *   požadavku znamená dvě kola místo jednoho a zbytečný limit navíc.
 */
import type { Halere } from './penize';

/** Stavy platby, které GoPay vrací. */
export type StavPlatby =
  | 'CREATED'
  | 'PAYMENT_METHOD_CHOSEN'
  | 'PAID'
  | 'AUTHORIZED'
  | 'CANCELED'
  | 'TIMEOUTED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export interface ZalozitPlatbuVstup {
  /** Číslo objednávky – zákaznice ho uvidí ve výpisu z účtu. */
  cisloObjednavky: string;
  /** K úhradě, v haléřích. */
  castka: Halere;
  email: string;
  jmeno?: string | null;
  telefon?: string | null;
  /** Kam se zákaznice vrátí po zaplacení (nebo po zrušení). */
  navratovaUrl: string;
  /** Kam GoPay pošle notifikaci server–server. */
  notifikacniUrl: string;
}

export interface ZalozenaPlatba {
  /** Id platby u GoPay – ukládá se k objednávce jako `platbaId`. */
  id: string;
  /** Adresa platební brány, kam se zákaznice přesměruje. */
  gwUrl: string;
  stav: StavPlatby;
}

export interface StavPlatbyOdpoved {
  id: string;
  stav: StavPlatby;
  /** Číslo objednávky, jak ho brána zná – pojistka proti záměně platby. */
  cisloObjednavky: string | null;
  /** Zaplacená částka v haléřích. */
  castka: Halere;
}

/**
 * `RequestInit` rozšířený o `cache`.
 *
 * `cache` je součást webového standardu, ale typy, se kterými se tenhle
 * soubor kompiluje, ho nemusí znát: v buildu Nextu ano, pod čistým Node
 * (`tsconfig.node.json`, `lib: ES2022` bez DOM) ne – tam se `fetch` popisuje
 * typy z undici, které pole nemají. Bez tohohle rozšíření build workeru padal
 * na TS2353, přestože v prohlížeči i v Nodu je hodnota platná.
 *
 * Vypnutá cache tu není kosmetika: Next 14 GET požadavky ve výchozím stavu
 * cachuje, a odpověď „stav platby" si zapamatovat nesmí.
 */
type PozadavekBezCache = RequestInit & { cache?: 'no-store' };

/** Chyba komunikace s bránou. Volající ji má odlišit od chyby vstupu. */
export class ChybaGoPay extends Error {
  constructor(
    zprava: string,
    public readonly stavHttp?: number
  ) {
    super(zprava);
    this.name = 'ChybaGoPay';
  }
}

interface Konfigurace {
  goId: string;
  clientId: string;
  clientSecret: string;
  zaklad: string;
}

/**
 * Přečte `.env`. `null` znamená „brána není zapojená" – není to chyba,
 * je to očekávaný stav, dokud majitelka nemá smlouvu s GoPay.
 */
export function nacistKonfiguraci(): Konfigurace | null {
  const goId = process.env.GOPAY_GOID?.trim();
  const clientId = process.env.GOPAY_CLIENT_ID?.trim();
  const clientSecret = process.env.GOPAY_CLIENT_SECRET?.trim();

  if (!goId || !clientId || !clientSecret) return null;

  return {
    goId,
    clientId,
    clientSecret,
    /*
     * `production` se schválně vyžaduje doslova. Výchozí větev je sandbox,
     * takže překlep v `GOPAY_ENV` skončí u testovací brány – tam se nic
     * neúčtuje. Opačné nastavení (výchozí produkce) by z překlepu udělalo
     * skutečné strhávání peněz.
     */
    zaklad:
      process.env.GOPAY_ENV?.trim() === 'production'
        ? 'https://gate.gopay.cz'
        : 'https://gw.sandbox.gopay.com',
  };
}

/** Je brána zapojená? Podle toho se nabízí platba kartou. */
export function jeNastaveno(): boolean {
  return nacistKonfiguraci() !== null;
}

// --- OAuth2 token -----------------------------------------------------------

interface Token {
  hodnota: string;
  /** Kdy vyprší (ms epoch). */
  platiDo: number;
}

let token: Token | null = null;

/**
 * Vrátí platný přístupový token.
 *
 * Od skutečné expirace se odečítá 60 s. Token, kterému zbývá vteřina, projde
 * kontrolou a mezi jejím výsledkem a odesláním požadavku vyprší – odpověď je
 * pak 401 uprostřed platby, což vypadá jako výpadek brány.
 */
async function ziskatToken(cfg: Konfigurace, scope: string): Promise<string> {
  if (token && token.platiDo > Date.now()) return token.hodnota;

  const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');

  const odpoved = await fetch(`${cfg.zaklad}/api/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope }),
    // Platební brána nesmí viset na cache Nextu.
    cache: 'no-store',
  } satisfies PozadavekBezCache);

  if (!odpoved.ok) {
    throw new ChybaGoPay('Přihlášení k platební bráně selhalo.', odpoved.status);
  }

  const telo = (await odpoved.json()) as { access_token?: string; expires_in?: number };

  if (!telo.access_token) {
    throw new ChybaGoPay('Platební brána nevrátila přístupový token.');
  }

  const platnost = typeof telo.expires_in === 'number' ? telo.expires_in : 1800;
  token = {
    hodnota: telo.access_token,
    platiDo: Date.now() + Math.max(0, platnost - 60) * 1000,
  };

  return token.hodnota;
}

/** Zapomene uložený token – po 401 má smysl zkusit jednou znovu. */
function zahoditToken(): void {
  token = null;
}

// --- Volání API -------------------------------------------------------------

async function volat<T>(
  cfg: Konfigurace,
  cesta: string,
  scope: string,
  init: { method: 'GET' | 'POST'; telo?: unknown },
  jePokusPoObnove = false
): Promise<T> {
  const pristup = await ziskatToken(cfg, scope);

  const odpoved = await fetch(`${cfg.zaklad}${cesta}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${pristup}`,
      Accept: 'application/json',
      ...(init.telo ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init.telo ? JSON.stringify(init.telo) : undefined,
    cache: 'no-store',
  } satisfies PozadavekBezCache);

  // Token mohl mezitím padnout na straně brány (restart, odvolání). Jeden
  // pokus s čerstvým tokenem; víc ne, ať se z chyby nestane smyčka.
  if (odpoved.status === 401 && !jePokusPoObnove) {
    zahoditToken();
    return volat<T>(cfg, cesta, scope, init, true);
  }

  if (!odpoved.ok) {
    const detail = await odpoved.text().catch(() => '');
    // Detail jde do logu, ne k zákaznici – nese identifikátory obchodníka.
    console.error(`[gopay] ${init.method} ${cesta} → ${odpoved.status}: ${detail.slice(0, 500)}`);
    throw new ChybaGoPay('Platební brána odpověděla chybou.', odpoved.status);
  }

  return (await odpoved.json()) as T;
}

interface OdpovedPlatby {
  id?: number | string;
  gw_url?: string;
  state?: string;
  order_number?: string;
  amount?: number;
}

/**
 * Založí platbu a vrátí adresu brány, kam se zákaznice přesměruje.
 *
 * `order_number` je číslo objednávky – při dohledávání reklamace v GoPay je to
 * jediný údaj, podle kterého se majitelka orientuje.
 */
export async function zalozitPlatbu(vstup: ZalozitPlatbuVstup): Promise<ZalozenaPlatba> {
  const cfg = nacistKonfiguraci();
  if (!cfg) throw new ChybaGoPay('Platební brána není nastavená.');

  if (!Number.isInteger(vstup.castka) || vstup.castka <= 0) {
    throw new ChybaGoPay('Částka k úhradě musí být kladné celé číslo haléřů.');
  }

  const odpoved = await volat<OdpovedPlatby>(cfg, '/api/payments/payment', 'payment-create', {
    method: 'POST',
    telo: {
      payer: {
        default_payment_instrument: 'PAYMENT_CARD',
        allowed_payment_instruments: ['PAYMENT_CARD', 'BANK_ACCOUNT'],
        contact: {
          email: vstup.email,
          ...(vstup.jmeno ? { first_name: vstup.jmeno.split(' ')[0] } : {}),
          ...(vstup.telefon ? { phone_number: vstup.telefon } : {}),
        },
      },
      target: { type: 'ACCOUNT', goid: Number(cfg.goId) },
      // GoPay počítá v nejmenší jednotce měny, tedy v haléřích.
      amount: vstup.castka,
      currency: 'CZK',
      order_number: vstup.cisloObjednavky,
      order_description: `Objednavka ${vstup.cisloObjednavky}`,
      callback: {
        return_url: vstup.navratovaUrl,
        notification_url: vstup.notifikacniUrl,
      },
      lang: 'CS',
    },
  });

  if (!odpoved.id || !odpoved.gw_url) {
    throw new ChybaGoPay('Platební brána nevrátila odkaz na platbu.');
  }

  return {
    id: String(odpoved.id),
    gwUrl: odpoved.gw_url,
    stav: (odpoved.state as StavPlatby) ?? 'CREATED',
  };
}

/**
 * Zjistí stav platby u brány.
 *
 * Tohle je jediný zdroj pravdy o tom, že je zaplaceno. Notifikace i návratová
 * adresa nesou pouze `id`; obojí si umí kdokoliv otevřít sám.
 */
export async function zjistitStavPlatby(platbaId: string): Promise<StavPlatbyOdpoved> {
  const cfg = nacistKonfiguraci();
  if (!cfg) throw new ChybaGoPay('Platební brána není nastavená.');

  // `payment-all` pokrývá čtení i zakládání; brána scope u tokenu kontroluje.
  const odpoved = await volat<OdpovedPlatby>(
    cfg,
    `/api/payments/payment/${encodeURIComponent(platbaId)}`,
    'payment-all',
    { method: 'GET' }
  );

  return {
    id: String(odpoved.id ?? platbaId),
    stav: (odpoved.state as StavPlatby) ?? 'CREATED',
    cisloObjednavky: odpoved.order_number ?? null,
    castka: typeof odpoved.amount === 'number' ? odpoved.amount : 0,
  };
}

/** Je platba v tomhle stavu skutečně uhrazená? */
export function jeUhrazeno(stav: StavPlatby): boolean {
  return stav === 'PAID';
}
