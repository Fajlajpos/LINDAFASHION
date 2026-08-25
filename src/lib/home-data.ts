/**
 * Obsah homepage na jednom místě.
 *
 * Fotografie zatím nemáme nafocené – všechna pole `obrazek` proto zůstávají
 * `null` a `MediaFrame` na jejich místě vykreslí značkovou výplň. Až fotky
 * přibudou do /public, stačí doplnit cestu sem, komponenty se nemění.
 *
 * Kategorie vedou na vlastní cestu `/produkty/[kategorie]`. Query tvar
 * `/produkty?kategorie=…` pochází z doby, kdy ta routa neexistovala, a
 * zbytečně zdržoval: `<Link>` přednačítá podle cesty, takže se z pěti dlaždic
 * rozcestníku dala přednačíst nanejvýš jedna.
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
 * Rozcestník kategorií v pruhu pod herem.
 *
 * Pět polí: na `lg` si každé vezme pětinu šířky obrazovky, pod ním se pruh
 * posouvá vodorovně. „Vše“ tu není – na celý katalog vede hlavní tlačítko
 * v heru i položka „Kolekce“ v hlavičce, třetí odkaz na totéž místo by byl
 * jen šum.
 */
export const KATEGORIE_ROZCESTNIK: HomeCategoryRow[] = [
  { label: 'Šaty', href: '/produkty/saty', glyph: 'saty' },
  { label: 'Halenky', href: '/produkty/halenky-a-kosile', glyph: 'halenky' },
  { label: 'Svetry', href: '/produkty/svetry-a-kardigany', glyph: 'svetry' },
  { label: 'Saka', href: '/produkty/saka-a-kabaty', glyph: 'saka' },
  {
    label: 'Poukazy',
    href: '/produkty/darkove-poukazy',
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
    cta: { label: 'Vybrat poukaz', href: '/produkty/darkove-poukazy' },
    obrazek: null,
    glyph: 'poukazy',
    alt: '',
  },
];

/**
 * Nákupní jistoty pod herem.
 *
 * Je to **funkce nastavení**, ne konstanta. „Doprava zdarma – při nákupu nad
 * 2 500 Kč" tu stálo natvrdo, zatímco skutečný práh drží
 * `Settings.prahDopravaZdarma` a ten klidně může být prázdný. Homepage tak
 * mohla slibovat dopravu zdarma, kterou pokladna nikdy nedala – a to není
 * nepřesnost, to je nekalá obchodní praktika.
 *
 * Číslo formátuje `toLocaleString('cs-CZ')`, které mezi řády vkládá
 * nezlomitelnou mezeru samo; „2 500 Kč“ se tedy neláme uprostřed čísla.
 */
export function vyhody(prahDopravaZdarma: number | null): HomeTrustItem[] {
  return [
    // Bez nastaveného prahu se dlaždice vynechá celá – slib, který pokladna
    // nedodrží, je horší než chybějící dlaždice.
    ...(prahDopravaZdarma === null
      ? []
      : [
          {
            icon: 'truck' as const,
            title: 'Doprava zdarma',
            description: `Při nákupu nad ${prahDopravaZdarma.toLocaleString('cs-CZ')} Kč`,
          },
        ]),
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
}
