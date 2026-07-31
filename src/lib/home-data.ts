/**
 * Obsah homepage na jednom místě.
 *
 * Fotografie zatím nemáme nafocené – všechna pole `obrazek` proto zůstávají
 * `null` a `MediaFrame` na jejich místě vykreslí značkovou výplň. Až fotky
 * přibudou do /public, stačí doplnit cestu sem, komponenty se nemění.
 *
 * Kategorie se filtrují přes query parametr (`/produkty?kategorie=…`),
 * protože route `/produkty/[slug]` v aplikaci neexistuje.
 */

/** Název plastické ilustrace z `CategoryGlyph`. */
export type GlyphName = 'vse' | 'saty' | 'halenky' | 'svetry' | 'saka' | 'poukazy';

export interface HomeCategoryChip {
  label: string;
  href: string;
  obrazek: string | null;
  glyph: GlyphName;
  /** Tmavý akcentní chip na konci řady (v předloze „SALE“). */
  accent?: boolean;
}

export interface HomeCategoryTile {
  title: string;
  href: string;
  obrazek: string | null;
  glyph: GlyphName;
  /** Krátký doplněk pod názvem – co v kategorii uživatel najde. */
  popis: string;
  /** Popis fotografie pro čtečky – prázdný u dekorativní výplně. */
  alt: string;
}

export interface HomePromo {
  eyebrow: string;
  /** Dvouřádkový titulek; zalomení řídí pole `titleLines`. */
  titleLines: [string, string];
  cta: { label: string; href: string };
  obrazek: string | null;
  alt: string;
}

export interface HomeTrustItem {
  /** Název ikony z lucide-react, mapuje se v komponentě. */
  icon: 'truck' | 'package' | 'shield' | 'headset';
  title: string;
  description: string;
}

/**
 * Tvar odpovídá props komponenty `ProductCard`, aby se dal rovnou rozprostřít.
 * Homepage a katalog tak ukazují úplně stejnou kartu.
 */
export interface HomeProduct {
  id: string;
  nazev: string;
  slug: string;
  cena: number;
  cenaPoSleve?: number | null;
  znacka?: string | null;
  kategorieNazev: string;
  obrazekUrl?: string | null;
  doporuceny?: boolean;
  jeDarkovyPoukaz?: boolean;
}

/** Kruhové zkratky nad úvodní sekcí. Všechny cíle vedou na existující route. */
export const KATEGORIE_CHIPY: HomeCategoryChip[] = [
  { label: 'Vše', href: '/produkty', obrazek: null, glyph: 'vse' },
  { label: 'Šaty', href: '/produkty?kategorie=saty', obrazek: null, glyph: 'saty' },
  {
    label: 'Halenky',
    href: '/produkty?kategorie=halenky-a-kosile',
    obrazek: null,
    glyph: 'halenky',
  },
  {
    label: 'Svetry',
    href: '/produkty?kategorie=svetry-a-kardigany',
    obrazek: null,
    glyph: 'svetry',
  },
  { label: 'Saka', href: '/produkty?kategorie=saka-a-kabaty', obrazek: null, glyph: 'saka' },
  {
    label: 'Poukazy',
    href: '/produkty?kategorie=darkove-poukazy',
    obrazek: null,
    glyph: 'poukazy',
    accent: true,
  },
];

/** Velké dlaždice sekce „Najděte svůj styl“. */
export const KATEGORIE_DLAZDICE: HomeCategoryTile[] = [
  {
    title: 'Šaty',
    href: '/produkty?kategorie=saty',
    obrazek: null,
    glyph: 'saty',
    popis: 'Hedvábí a len na celý rok',
    alt: '',
  },
  {
    title: 'Halenky & Košile',
    href: '/produkty?kategorie=halenky-a-kosile',
    obrazek: null,
    glyph: 'halenky',
    popis: 'Základ, který obléknete denně',
    alt: '',
  },
  {
    title: 'Svetry & Kardigany',
    href: '/produkty?kategorie=svetry-a-kardigany',
    obrazek: null,
    glyph: 'svetry',
    popis: 'Kašmír a jemná merino vlna',
    alt: '',
  },
  {
    title: 'Saka & Kabáty',
    href: '/produkty?kategorie=saka-a-kabaty',
    obrazek: null,
    glyph: 'saka',
    popis: 'Střihy z italských dílen',
    alt: '',
  },
];

/** Dvojice bannerů pod dlaždicemi kategorií. */
export const PROMO_BANNERY: HomePromo[] = [
  {
    eyebrow: 'Nová kolekce',
    titleLines: ['Novinky sezóny', 'právě dorazily'],
    cta: { label: 'Prohlédnout novinky', href: '/produkty' },
    obrazek: null,
    alt: '',
  },
  {
    eyebrow: 'Tip na dárek',
    titleLines: ['Dárkový poukaz', 'potěší vždy'],
    cta: { label: 'Vybrat poukaz', href: '/produkty?kategorie=darkove-poukazy' },
    obrazek: null,
    alt: '',
  },
];

/**
 * Kompaktní verze pro úzký pruh v heru (jen první tři položky).
 *
 * V částce je nezlomitelná mezera (` `) – jinak se „2 500 Kč“ v úzkém
 * sloupci láme uprostřed čísla, což je typografická chyba.
 */
export const VYHODY: HomeTrustItem[] = [
  {
    icon: 'truck',
    title: 'Doprava zdarma',
    description: 'Při nákupu nad 2 500 Kč',
  },
  {
    icon: 'package',
    title: 'Vrácení do 14 dnů',
    description: 'Bez udání důvodu',
  },
  {
    icon: 'shield',
    title: 'Bezpečná platba',
    description: 'Ověřená brána',
  },
  {
    icon: 'headset',
    title: 'Osobní poradenství',
    description: 'Poradíme s velikostí',
  },
];

/**
 * Nejoblíbenější kousky – ukázková data, než se napojí katalog z databáze.
 * Záznamy odpovídají produktům v `/produkty`, aby slugy a značky seděly.
 */
export const NEJPRODAVANEJSI: HomeProduct[] = [
  {
    id: 'p1',
    nazev: 'Hedvábné šaty Bellissima',
    slug: 'hedvabne-saty-bellissima',
    cena: 3490,
    znacka: 'Milano Elegance',
    kategorieNazev: 'Šaty',
    doporuceny: true,
  },
  {
    id: 'p2',
    nazev: 'Lněná halenka Firenze',
    slug: 'lnena-halenka-firenze',
    cena: 1890,
    znacka: 'Toscana Style',
    kategorieNazev: 'Halenky & Košile',
    doporuceny: false,
  },
  {
    id: 'p3',
    nazev: 'Kašmírový svetr Roma',
    slug: 'kasmirovy-svetr-roma',
    cena: 2990,
    cenaPoSleve: 2390,
    znacka: 'Roma Knitwear',
    kategorieNazev: 'Svetry & Kardigany',
    doporuceny: true,
  },
  {
    id: 'p4',
    nazev: 'Vlněný kabát Venezia',
    slug: 'vlneny-kabat-venezia',
    cena: 5490,
    znacka: 'Venezia Tailoring',
    kategorieNazev: 'Saka & Kabáty',
    doporuceny: true,
  },
];
