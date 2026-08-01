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

/** Pole rozcestníku kategorií pod herem. */
export interface HomeCategoryRow {
  /** Krátký název – pole pruhu je úzké, delší text by se lámal. */
  label: string;
  href: string;
  glyph: GlyphName;
  /** Poukazy nejsou kategorie oblečení – pole se odliší tmavým podkladem. */
  accent?: boolean;
}

export interface HomePromo {
  eyebrow: string;
  /** Dvouřádkový titulek; zalomení řídí pole `titleLines`. */
  titleLines: [string, string];
  cta: { label: string; href: string };
  obrazek: string | null;
  /** Ilustrace, která drží obrazovou plochu, dokud není fotka. */
  glyph: GlyphName;
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

/**
 * Rozcestník kategorií v pruhu pod herem.
 *
 * Pět polí: na `lg` si každé vezme pětinu šířky obrazovky, pod ním se pruh
 * posouvá vodorovně. „Vše“ tu není – na celý katalog vede hlavní tlačítko
 * v heru i položka „Kolekce“ v hlavičce, třetí odkaz na totéž místo by byl
 * jen šum.
 */
export const KATEGORIE_ROZCESTNIK: HomeCategoryRow[] = [
  { label: 'Šaty', href: '/produkty?kategorie=saty', glyph: 'saty' },
  { label: 'Halenky', href: '/produkty?kategorie=halenky-a-kosile', glyph: 'halenky' },
  { label: 'Svetry', href: '/produkty?kategorie=svetry-a-kardigany', glyph: 'svetry' },
  { label: 'Saka', href: '/produkty?kategorie=saka-a-kabaty', glyph: 'saka' },
  {
    label: 'Poukazy',
    href: '/produkty?kategorie=darkove-poukazy',
    glyph: 'poukazy',
    accent: true,
  },
];

/** Dvojice bannerů pod dlaždicemi kategorií. */
export const PROMO_BANNERY: HomePromo[] = [
  {
    eyebrow: 'Nová kolekce',
    titleLines: ['Novinky sezóny', 'právě dorazily'],
    cta: { label: 'Prohlédnout novinky', href: '/produkty' },
    obrazek: null,
    glyph: 'saty',
    alt: '',
  },
  {
    eyebrow: 'Tip na dárek',
    titleLines: ['Dárkový poukaz', 'potěší vždy'],
    cta: { label: 'Vybrat poukaz', href: '/produkty?kategorie=darkove-poukazy' },
    obrazek: null,
    glyph: 'poukazy',
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
 *
 * Šest položek, ne čtyři: ve třech sloupcích tvoří dvě plné řady. Čtyři kusy
 * na čtyři sloupce dávaly jediný řádek a sortiment vypadal prázdně.
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
  {
    id: 'p5',
    nazev: 'Hedvábná halenka Amalfi',
    slug: 'hedvabna-halenka-amalfi',
    cena: 2290,
    znacka: 'Toscana Style',
    kategorieNazev: 'Halenky & Košile',
    doporuceny: false,
  },
  {
    id: 'p6',
    nazev: 'Kašmírový kardigan Siena',
    slug: 'kasmirovy-kardigan-siena',
    cena: 3690,
    cenaPoSleve: 2990,
    znacka: 'Roma Knitwear',
    kategorieNazev: 'Svetry & Kardigany',
    doporuceny: false,
  },
];
