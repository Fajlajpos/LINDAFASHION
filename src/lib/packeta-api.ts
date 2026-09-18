/**
 * API Zásilkovny (Packeta) – zakládání zásilek, štítky a sledování stavu.
 *
 * Doplněk k [packeta.ts](./packeta.ts), který drží jen klíč k widgetu pro
 * výběr výdejního místa. Tady se pracuje s **tajným** `PACKETA_API_PASSWORD`,
 * takže tenhle soubor nesmí nikdy skončit v prohlížeči.
 *
 * ## Proč REST a ne SOAP
 *
 * Zásilkovna nabízí obojí. REST je `POST https://www.zasilkovna.cz/api/rest`
 * s XML tělem, kde kořenový element je název metody – tedy obyčejný `fetch`
 * a pár řádků skládání a čtení XML. SOAP by znamenal klienta navíc
 * v `package.json` kvůli třem voláním.
 *
 * ## Co je tady důležité
 *
 * - **Heslo jde v těle každého požadavku**, ne v hlavičce. O to víc platí, že
 *   se odpovědi ani chyby nesmí posílat dál k uživateli – viz `ChybaPackety`.
 * - **Dobírka je vždy nula.** E-shop ji nenabízí (viz `objednavkaSchema`),
 *   takže `cod` se ani neodvozuje z objednávky – je to konstanta.
 * - **Hmotnost je v kilogramech.** Nastavení ji drží v gramech, protože
 *   „500" se zadává líp než „0,5"; převod je na jednom místě.
 * - **Hmotnost se sem předává jako číslo, ne jako celé `NastaveniWebu`.**
 *   Ten typ žije v `nastaveni.ts`, který používá `cache()` z Reactu – a i pouhý
 *   `import type` stačí, aby ho `tsc` vtáhl do buildu workeru a ten spadl na
 *   „Module 'react' has no exported member 'cache'". Stejná hranice runtimů
 *   jako u `dodavatel.ts`.
 */
const ADRESA_API = 'https://www.zasilkovna.cz/api/rest';

/**
 * `RequestInit` rozšířený o `cache`.
 *
 * Totéž a ze stejného důvodu jako v [gopay.ts](./gopay.ts): `cache` je součást
 * webového standardu, ale pod čistým Node (`tsconfig.worker.json`, `lib: ES2022`
 * bez DOM) se `fetch` popisuje typy z undici, které to pole nemají. V buildu
 * Nextu projde, build workeru padá na TS2353 — a `npm run typecheck` to nechytí,
 * protože jede proti konfiguraci Nextu. Kontroluje to až `npm run build:worker`.
 *
 * Vypnutá cache tu není kosmetika: Next 14 GET požadavky cachuje a stav zásilky
 * si pamatovat nesmí.
 */
type PozadavekBezCache = RequestInit & { cache?: 'no-store' };

/** Chyba komunikace se Zásilkovnou. */
export class ChybaPackety extends Error {
  constructor(
    zprava: string,
    /** Text od Zásilkovny, když ho poslala – k zobrazení obsluze. */
    public readonly detail?: string,
  ) {
    super(zprava);
    this.name = 'ChybaPackety';
  }
}

interface Konfigurace {
  heslo: string;
  /** Interní „Označení" odesílatele z klientské sekce. */
  eshop: string;
}

/**
 * Přečte `.env`. `null` znamená „ještě nezapojeno" – není to chyba.
 *
 * `PACKETA_ESHOP` je součástí podmínky schválně: bez označení odesílatele
 * `createPacket` neprojde, takže nabízet tlačítko by znamenalo slíbit akci,
 * která spolehlivě spadne.
 */
export function nacistKonfiguraci(): Konfigurace | null {
  const heslo = process.env.PACKETA_API_PASSWORD?.trim();
  const eshop = process.env.PACKETA_ESHOP?.trim();

  if (!heslo || !eshop) return null;

  return { heslo, eshop };
}

/** Je zakládání zásilek zapojené? Podle toho se v administraci nabídne tlačítko. */
export function jeNastaveno(): boolean {
  return nacistKonfiguraci() !== null;
}

// --- XML ---------------------------------------------------------------

/**
 * Ošetří text pro vložení do XML.
 *
 * Do zásilky jde jméno a adresa zákaznice, tedy cizí vstup. Bez tohohle by
 * příjmení „Nováková & spol." rozbilo dokument a apostrof v ulici by ho utnul.
 */
function xmlText(hodnota: string | number): string {
  return String(hodnota)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function xmlPrvky(pole: Record<string, string | number | null | undefined>): string {
  return Object.entries(pole)
    .filter(([, hodnota]) => hodnota !== null && hodnota !== undefined && hodnota !== '')
    .map(([nazev, hodnota]) => `<${nazev}>${xmlText(hodnota as string | number)}</${nazev}>`)
    .join('');
}

/**
 * Vytáhne obsah prvního výskytu prvku.
 *
 * Plnohodnotný parser tu není potřeba: odpovědi Zásilkovny jsou ploché
 * a čtou se z nich dvě až tři hodnoty. Přidávat kvůli tomu XML knihovnu
 * do závislostí by bylo nepoměrné.
 */
function vyctiPrvek(xml: string, nazev: string): string | null {
  const shoda = xml.match(new RegExp(`<${nazev}[^>]*>([\\s\\S]*?)</${nazev}>`, 'i'));
  return shoda ? shoda[1].trim() : null;
}

/**
 * Pošle požadavek a vrátí tělo odpovědi.
 *
 * Zásilkovna odpovídá `<status>ok</status>`, nebo `<status>fault</status>`
 * s popisem ve `<fault>` a `<string>`. HTTP kód přitom bývá 200 i u chyby,
 * takže se na něj nedá spolehnout a musí se číst `status`.
 */
async function volat(metoda: string, telo: string): Promise<string> {
  const cfg = nacistKonfiguraci();
  if (!cfg) throw new ChybaPackety('Zásilkovna není nastavená.');

  const dokument = `<?xml version="1.0" encoding="utf-8"?><${metoda}><apiPassword>${xmlText(
    cfg.heslo,
  )}</apiPassword>${telo}</${metoda}>`;

  let odpoved: Response;
  try {
    /*
     * Objekt se skládá do proměnné, ne přímo do volání: u literálu se
     * kontrolují přebytečné vlastnosti proti `RequestInit`, takže `cache`
     * by build workeru shodila i s tímhle typem.
     */
    const pozadavek: PozadavekBezCache = {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
      body: dokument,
      cache: 'no-store',
    };

    odpoved = await fetch(ADRESA_API, pozadavek);
  } catch (err) {
    console.error(`[packeta] ${metoda}: spojení selhalo:`, err);
    throw new ChybaPackety('Zásilkovna je nedostupná. Zkuste to prosím za chvíli.');
  }

  const text = await odpoved.text();

  if (!odpoved.ok) {
    // Tělo jde do logu, ne k obsluze – nese heslo i identifikaci obchodníka.
    console.error(`[packeta] ${metoda} → HTTP ${odpoved.status}: ${text.slice(0, 500)}`);
    throw new ChybaPackety('Zásilkovna odpověděla chybou.');
  }

  if (vyctiPrvek(text, 'status')?.toLowerCase() !== 'ok') {
    const duvod = vyctiPrvek(text, 'string') ?? vyctiPrvek(text, 'fault') ?? 'neuvedený důvod';
    console.error(`[packeta] ${metoda} odmítnuto: ${text.slice(0, 500)}`);

    // Tenhle jediný detail se ukazuje obsluze: bývá to „chybí telefon"
    // nebo „neplatné výdejní místo", tedy něco, co umí sama opravit.
    throw new ChybaPackety('Zásilkovna zásilku nepřijala.', duvod);
  }

  return text;
}

// --- Zakládání zásilky --------------------------------------------------

/** Objednávka v rozsahu, který Zásilkovna potřebuje. */
export interface PodkladZasilky {
  cisloObjednavky: string;
  dodaciJmenoPrijmeni: string;
  email: string | null;
  dodaciTelefon: string | null;
  /** Id výdejního místa z widgetu. */
  vydejniMistoId: string;
  /** Hodnota zásilky v korunách – pojistné plnění při ztrátě. */
  hodnota: number;
  /** Celkový počet kusů v objednávce. */
  pocetKusu: number;
}

/**
 * Rozdělí „Marie Nováková" na jméno a příjmení.
 *
 * Dělí se na **poslední** mezeře: e-shop má jedno pole a zákaznice do něj
 * píše i prostřední jména nebo tituly. Příjmení je skoro vždycky poslední
 * slovo, kdežto první slovo bývá titul.
 *
 * Jednoslovný zápis nechává příjmení prázdné – Zásilkovna si poradí líp
 * s chybějícím příjmením než s tím, že se celé jméno zopakuje dvakrát.
 */
export function rozdelitJmeno(cele: string): { jmeno: string; prijmeni: string } {
  const casti = cele.trim().split(/\s+/).filter(Boolean);

  if (casti.length === 0) return { jmeno: '', prijmeni: '' };
  if (casti.length === 1) return { jmeno: casti[0], prijmeni: '' };

  return {
    jmeno: casti.slice(0, -1).join(' '),
    prijmeni: casti[casti.length - 1],
  };
}

/**
 * Hmotnost zásilky v kilogramech.
 *
 * Nastavení drží hmotnost **jednoho kusu v gramech** – zadat „500" je míň
 * práce a míň příležitostí k překlepu než „0,5". Zásilkovna chce kilogramy,
 * takže převod patří sem, na jedno místo.
 */
export function hmotnostKg(hmotnostKusuGramu: number, pocetKusu: number): number {
  const gramy = hmotnostKusuGramu * Math.max(1, pocetKusu);
  return Math.round(gramy) / 1000;
}

/**
 * Založí zásilku a vrátí její číslo.
 *
 * Číslo zásilky je zároveň sledovací kód, který vidí zákaznice – ukládá se
 * do `Order.cisloZasilky`.
 */
export async function vytvoritZasilku(
  podklad: PodkladZasilky,
  /** Hmotnost jednoho kusu v gramech ze `Settings`. */
  hmotnostKusuGramu: number,
): Promise<string> {
  const cfg = nacistKonfiguraci();
  if (!cfg) throw new ChybaPackety('Zásilkovna není nastavená.');

  const { jmeno, prijmeni } = rozdelitJmeno(podklad.dodaciJmenoPrijmeni);

  const atributy = xmlPrvky({
    // Podle čísla objednávky to majitelka dohledá v klientské sekci.
    number: podklad.cisloObjednavky,
    name: jmeno,
    surname: prijmeni,
    email: podklad.email,
    phone: podklad.dodaciTelefon,
    addressId: podklad.vydejniMistoId,
    // Dobírka se v e-shopu nenabízí vůbec, takže konstanta, ne odvozená hodnota.
    cod: 0,
    value: podklad.hodnota,
    weight: hmotnostKg(hmotnostKusuGramu, podklad.pocetKusu),
    eshop: cfg.eshop,
  });

  const odpoved = await volat('createPacket', `<packetAttributes>${atributy}</packetAttributes>`);
  const id = vyctiPrvek(odpoved, 'id');

  if (!id) {
    console.error(`[packeta] createPacket neposlal id: ${odpoved.slice(0, 500)}`);
    throw new ChybaPackety('Zásilkovna nevrátila číslo zásilky.');
  }

  return id;
}

// --- Štítek -------------------------------------------------------------

/**
 * Štítek k zásilce jako PDF.
 *
 * `format` je rozměr archu; `A6 on A4` tiskne jeden štítek na běžný papír,
 * což je jediná varianta, kterou obchod bez štítkovačky utiskne.
 * `offset` je pozice na archu – nula, tedy vlevo nahoře.
 */
export async function stitekPdf(cisloZasilky: string): Promise<Buffer> {
  const odpoved = await volat(
    'packetLabelPdf',
    xmlPrvky({ packetId: cisloZasilky, format: 'A6 on A4', offset: 0 }),
  );

  const base64 = vyctiPrvek(odpoved, 'result');
  if (!base64) {
    console.error(`[packeta] packetLabelPdf neposlal štítek: ${odpoved.slice(0, 300)}`);
    throw new ChybaPackety('Zásilkovna nevrátila štítek.');
  }

  return Buffer.from(base64.replace(/\s+/g, ''), 'base64');
}

// --- Sledování ----------------------------------------------------------

export interface StavZasilky {
  /** Kód stavu od Zásilkovny, např. `delivered`. */
  kod: string;
  /** Text k zobrazení, když ho Zásilkovna pošle. */
  popis: string | null;
}

/**
 * Stavy, které znamenají, že zásilka je u zákaznice.
 *
 * Od převzetí běží čtrnáctidenní lhůta pro odstoupení (§ 1829), takže tenhle
 * seznam rozhoduje o `datumDoruceni`. Je proto úzký schválně: raději lhůta
 * začne běžet o den později, než aby začala u zásilky, kterou si zákaznice
 * ještě nevyzvedla.
 *
 * `delivered` je vyzvednutí na výdejním místě i doručení kurýrem.
 */
const STAVY_DORUCENO = new Set(['delivered']);

/** Je zásilka v tomhle stavu skutečně u zákaznice? */
export function jeDoruceno(kod: string): boolean {
  return STAVY_DORUCENO.has(kod.trim().toLowerCase());
}

/** Zeptá se Zásilkovny, kde zásilka je. */
export async function stavZasilky(cisloZasilky: string): Promise<StavZasilky> {
  const odpoved = await volat('packetStatus', xmlPrvky({ packetId: cisloZasilky }));

  return {
    kod: vyctiPrvek(odpoved, 'codeText') ?? vyctiPrvek(odpoved, 'statusCode') ?? '',
    popis: vyctiPrvek(odpoved, 'statusText'),
  };
}
