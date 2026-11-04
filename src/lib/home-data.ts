/**
 * Obsah homepage na jednom místě.
 *
 * Fotografie zatím nemáme nafocené – všechna pole `obrazek` proto zůstávají
 * `null` a `MediaFrame` na jejich místě vykreslí značkovou výplň. Až fotky
 * přibudou do /public, stačí doplnit cestu sem, komponenty se nemění.
 *
 * Kategorie tu nejsou – rozcestník, menu i patička je čtou z databáze
 * (`nacistNavigaci` v katalog.ts).
 */

import type { KratkaLhuta } from './nastaveni';

/** Název plastické ilustrace z `CategoryGlyph`. */
export type GlyphName = 'vse' | 'saty' | 'halenky' | 'svetry' | 'saka' | 'poukazy';

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
  icon: 'truck' | 'package' | 'shield' | 'headset' | 'store';
  title: string;
  description: string;
}


/**
 * Promo bannery pod dlaždicemi kategorií.
 *
 * Banner s poukazem je vidět vždy; kam vede, rozhoduje `odkazNaPoukaz`
 * v katalog.ts (poukaz → kategorie → kontakt), aby nikdy nekončil na 404.
 */
export function promoBannery(odkazNaPoukaz: string): HomePromo[] {
  return [
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
      cta: { label: 'Vybrat poukaz', href: odkazNaPoukaz },
      obrazek: null,
      glyph: 'poukazy',
      alt: '',
    },
  ];
}

/**
 * Nákupní jistoty pod herem.
 *
 * Je to **funkce nastavení**, ne konstanta. „Doprava zdarma – při nákupu nad
 * 2 500 Kč" tu nejdřív stála natvrdo, pak se četla z `prahDopravaZdarma`,
 * a nakonec ji majitel webu z úvodní stránky vyřadil úplně. Místo ní je
 * lhůta odeslání (`kratkaLhutaOdeslani`): platí pro každou objednávku, ne jen
 * pro tu nad prahem. Doprava zdarma, je-li nastavená, se dál ukazuje tam, kde
 * se o ní rozhoduje – v košíku, v pokladně a na stránce Doprava a platba.
 * V režimu dovolené lhůta neplatí, takže se dlaždice vynechá.
 *
 * Totéž platí pro „Bezpečná platba – Ověřená brána". Bez klíčů GoPay žádná
 * brána není a pokladna nabízí jen převod, takže dlaždice svítila u obchodu,
 * který kartou platit vůbec neumí. Řídí se proto `jeNastaveno()` z `gopay.ts`,
 * stejně jako dlaždice na `/doprava-a-platba` a volba v pokladně.
 */
export function vyhody(
  lhutaOdeslani: KratkaLhuta | null,
  platbaKartouDostupna: boolean,
  /**
   * Město kamenné prodejny z `Settings.adresaProvozovny`, `null` = dlaždice
   * se nevykreslí. Text stojí na tom, že prodejna má **jiný výběr** než
   * e-shop – to je důvod přijít, ne zkoušení zboží z e-shopu.
   */
  mestoProdejny: string | null = null,
): HomeTrustItem[] {
  return [
    ...(lhutaOdeslani === null
      ? []
      : [
          {
            icon: 'truck' as const,
            // Stejný tvar jako „Vrácení do 14 dnů" vedle. Žádné „rychlé" –
            // lhůtu nastavuje majitelka a u čtrnácti dnů by to neplatilo.
            title: `Odeslání ${lhutaOdeslani.lhuta}`,
            // Jen tolik, kolik slib potřebuje: „do 24 hodin" platí ve všední
            // dny, delší lhůta se týká zboží skladem.
            description: lhutaOdeslani.jenPracovniDny ? 'Ve všední dny' : 'U zboží skladem',
          },
        ]),
    {
      icon: 'package',
      title: 'Vrácení do 14 dnů',
      description: 'Bez udání důvodu',
    },
    ...(mestoProdejny
      ? [
          {
            icon: 'store' as const,
            // Krátce, na jeden řádek: s městem v nadpisu a delším popisem se
            // dlaždice lámala na čtyři řádky a natahovala celý pruh. Adresu
            // nese sekce prodejny dole na stránce.
            title: 'Kamenná prodejna',
            description: 'Jiný výběr než online',
          },
        ]
      : []),
    ...(platbaKartouDostupna
      ? [
          {
            icon: 'shield' as const,
            title: 'Bezpečná platba',
            description: 'Ověřená brána',
          },
        ]
      : []),
    {
      icon: 'headset',
      title: 'Osobní poradenství',
      description: 'Poradíme s velikostí',
    },
  ];
}
