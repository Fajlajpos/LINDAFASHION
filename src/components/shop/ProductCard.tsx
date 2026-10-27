'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Heart, Sparkles, Gift } from 'lucide-react';
import { CategoryGlyph, type CategoryGlyphName } from '@/components/shop/home/CategoryGlyph';
import { CenaProduktu, StitekSlevy, slevaProduktu } from '@/components/shop/CenaProduktu';
import { useFavorites } from '@/lib/favorites-context';
import { stitekZemePuvodu } from '@/lib/zeme-puvodu';

/**
 * Kategorie → ilustrace pro kartu bez fotografie.
 *
 * Párujeme přes název kategorie, ne přes slug: karta ho dostává jako jediný
 * údaj o zařazení. Diakritiku i tvary ošetřují volné regulární výrazy.
 */
const GLYF_PODLE_KATEGORIE: ReadonlyArray<readonly [RegExp, CategoryGlyphName]> = [
  [/pouk|dárk|dark/i, 'poukazy'],
  [/šat|sat/i, 'saty'],
  [/halenk|košil|kosil/i, 'halenky'],
  [/svetr|kardig/i, 'svetry'],
  [/sak|kabát|kabat/i, 'saka'],
];

const vyberGlyf = (kategorie?: string | null, jePoukaz?: boolean): CategoryGlyphName => {
  if (jePoukaz) return 'poukazy';
  const nalez = GLYF_PODLE_KATEGORIE.find(([vzor]) => vzor.test(kategorie ?? ''));
  return nalez ? nalez[1] : 'vse';
};

/**
 * Identita karty je `slug` – ID sem nepatří, karta ho k ničemu nepoužívá
 * a oblíbené se drží také na slugu. Volající ho může klidně rozprostřít
 * (`{...produkt}`), JSX přebytečná pole ignoruje.
 */
export interface ProductCardProps {
  nazev: string;
  slug: string;
  cena: number;
  cenaPoSleve?: number | null;

  /**
   * Nejnižší cena za 30 dnů před slevou v haléřích (§ 12a zák. č. 634/1992 Sb.).
   * Bez ní se sleva na kartě **neinzeruje** – viz `procentoSlevyZReferencni` níž.
   */
  nejnizsiCena30DniHaleru?: number | null;

  znacka?: string | null;
  kategorieNazev?: string | null;
  obrazekUrl?: string | null;
  doporuceny?: boolean;
  jeDarkovyPoukaz?: boolean;

  /** `Product.zemePuvodu` – z ní se skládá štítek „Vyrobeno v …". */
  zemePuvodu?: string | null;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  nazev,
  slug,
  cena,
  cenaPoSleve,
  nejnizsiCena30DniHaleru,
  znacka,
  kategorieNazev,
  obrazekUrl,
  doporuceny,
  jeDarkovyPoukaz,
  zemePuvodu,
}) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const jeOblibeny = isFavorite(slug);
  const stitekPuvodu = stitekZemePuvodu(zemePuvodu);

  /*
   * § 12a zákona o ochraně spotřebitele – rozhoduje `slevaKZobrazeni`
   * (přes `slevaProduktu`): procento i přeškrtnutá cena jsou z nejnižší ceny
   * za 30 dnů, a bez ní se sleva neoznamuje vůbec. Dřív karta přeškrtávala
   * `cena`, jakmile byla vyplněná `cenaPoSleve`, a schovávala jen procento.
   */
  const sleva = slevaProduktu(cena, cenaPoSleve, nejnizsiCena30DniHaleru);

  return (
    /* Karta má stejnou barvu jako stránka – od podkladu ji dělí jen reliéf.
       Rámeček by hranu ohraničil podruhé, proto tu není.

       **Stín je stejný u karty s fotkou i bez ní** – `neu` jako každá jiná
       vyvýšená plocha na webu. Žádná odchylka pro fotky, žádná podmínka.

       Byly tu na to postupně dva vlastní tokeny a ani jeden neobstál.
       Vycházely z úvahy, že se stín čte jako propad proti okraji karty, a
       protože fotka končí u okraje tmavá, propad prý nevznikne. Jenže stín
       nedopadá na fotku, dopadá vedle karty na papír, a tam se dvě sousední
       karty v mřížce porovnávají navzájem. Naměřeno na `/produkty`: krytí
       0.34 srazilo podklad na 187 proti 223 u sousedky, což vedle každé
       karty s fotkou udělalo tmavý pruh.

       A hlavně: okraj fotky měřil 99 u tmavých šatů a 197 u světlého
       svetru. Veličina, kterou to mělo dorovnávat, se s každým nahraným
       snímkem mění, takže jedna pevná hodnota je správně nanejvýš pro jednu
       fotku. Kdyby hrana snímku někdy vadila, patří to řešit u hrany –
       krémovým lemem kolem fotky – ne stínem, který leží vedle karty. */
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-linda-cream shadow-neu transition-all duration-300 hover:shadow-neuLg">
      {/* Badges */}
      {/* `pointer-events-none`: štítky leží nad odkazem přes celou kartu
          a kliknutí na ně má otevřít detail jako kdekoli jinde. */}
      <div className="pointer-events-none absolute top-2 left-2 sm:top-3 sm:left-3 z-10 flex flex-col gap-1.5 items-start">
        {doporuceny && (
          /* Na telefonu bez jiskřiček a s užším prostrkáním – v kartě široké
             ~165 px jinak štítek zajel pod srdíčko vpravo nahoře. */
          <span className="bg-linda-sage text-white text-[9px] sm:text-[10px] uppercase tracking-wide sm:tracking-wider font-semibold px-2 sm:px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 border border-white/20">
            <Sparkles className="hidden w-3 h-3 text-linda-sand sm:block" aria-hidden="true" />
            Nová kolekce
          </span>
        )}
        {sleva && <StitekSlevy procento={sleva.procento} className="shadow-sm" />}
        {/* Země původu je z dat produktu. Dřív tu natvrdo stálo „100% Italský
            materiál“ u každého kusu bez ohledu na složení – viz `zeme-puvodu.ts`.
            Ve dvojici s „Nová kolekce“ nebo slevou by ze štítků byl shluk,
            proto jen tam, kde karta jiný štítek nemá. */}
        {jeDarkovyPoukaz ? (
          <span className="bg-linda-espresso text-linda-sand text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
            <Gift className="w-3 h-3 text-linda-sand" aria-hidden="true" />
            Dárkový poukaz
          </span>
        ) : (
          !doporuceny &&
          !sleva &&
          stitekPuvodu && (
            <span className="bg-linda-sageLight text-linda-sage text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md border border-linda-sage/25">
              {stitekPuvodu}
            </span>
          )
        )}
      </div>

      {/* Favorite Heart button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          toggleFavorite({
            slug,
            nazev,
            cena,
            cenaPoSleve,
            // Bez referenční ceny by karta na `/oblibene` inzerovala slevu,
            // kterou nemá čím doložit (§ 12a). Otisk musí nést obojí.
            nejnizsiCena30DniHaleru,
            znacka,
            kategorieNazev,
            obrazekUrl,
            jeDarkovyPoukaz,
            zemePuvodu,
          });
        }}
        /* Srdíčko leží na fotce. Plně bílé (majitel, 2026-10): poloprůhledný
           krém přes fotku zešedl. Stín `neuFloat`, protože bílý odlesk
           ostatních `neu*` by nad fotkou kreslil mléčnou svatozář.
           Uložený stav = zamáčknuté tlačítko, stejně jako na detailu – bílé
           zůstává i zamáčknuté; šedý byl jen dřívější `sandLight`. Stav nese
           tvar i výplň srdíčka, ne jenom barva. */
        className={`absolute right-2 top-2 z-10 flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-full bg-white transition-all duration-200 ${
          jeOblibeny
            ? 'text-linda-cognac shadow-neuInsetSm'
            : 'text-linda-espresso shadow-neuFloat hover:text-linda-cognac active:shadow-neuInsetSm'
        }`}
        aria-pressed={jeOblibeny}
        aria-label={
          jeOblibeny
            ? `Odebrat ${nazev} z oblíbených`
            : `Přidat ${nazev} do oblíbených`
        }
      >
        {/* Srdíčko se při uložení nadechne a při odebrání zase splaskne.
            Je to jediná zpětná vazba, kterou kliknutí má – karta se jinak
            nehne a stránka nikam nepřejde. Přechod běží ze stavu do stavu,
            ne jako animace při namountování: mřížka dvanácti uložených kusů
            by jinak při každém načtení `/oblibene` naráz poskočila. */}
        <Heart
          className={`w-4 h-4 transition-transform duration-200 ease-out ${
            jeOblibeny ? 'scale-110 fill-linda-cognac text-linda-cognac' : 'scale-100'
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Image container with link */}
      <Link
        href={`/produkt/${slug}`}
        tabIndex={-1}
        aria-hidden="true"
        className="block relative aspect-[3/4] bg-linda-cream overflow-hidden"
      >
        {obrazekUrl ? (
          <>
            <Image
              src={obrazekUrl}
              alt=""
              fill
              sizes="(max-width: 1024px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {/* Světelný spád přes nahranou fotografii – přidá se sám každému
                produktu s obrázkem, nic se nikde nenastavuje.

                Zástupná plocha níž má takový přechod od začátku a právě ten
                jí dává tvar; fotka bez něj vedle ní leží jako plochý obdélník
                nalepený na kartu. Odstín i síla jsou v tokenu `nikaFoto`.

                Vlastní vrstva nad snímkem, ne jeho vlastnost: `object-cover`
                fotku při najetí zvětšuje, kdežto tahle vrstva se **neškáluje**
                – světlo tedy zůstává na kartě a pohybuje se jen snímek pod
                ním. Kdyby se zvětšovala s fotkou, jel by s ní i spád a efekt
                by se rozjel k jednomu rohu.

                `pointer-events-none`, aby vrstva nebrala kliknutí odkazu pod
                sebou, a `aria-hidden`, protože nenese žádnou informaci. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-nikaFoto"
            />
          </>
        ) : (
          /* Zástupná plocha bez fotografie.
             Dřív tu byla ikonka jiskřiček a pod ní dvakrát název značky –
             na mřížce šesti karet vedle sebe vznikla řada identických polí,
             která čtou jako „chybí obrázek“. Teď plochu drží silueta kousku
             podle jeho kategorie: karty se od sebe liší, plocha vypadá
             záměrně a hned je vidět, o jaký typ oblečení jde. */
          <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-linda-sandLight via-linda-cream to-linda-sand/60">
            <CategoryGlyph
              name={vyberGlyf(kategorieNazev, jeDarkovyPoukaz)}
              className="absolute left-1/2 top-1/2 h-[74%] w-[74%] -translate-x-1/2 -translate-y-1/2 transition-transform duration-500 group-hover:scale-105"
            />
            <span className="absolute inset-x-0 bottom-4 text-center text-[10px] font-semibold uppercase tracking-[0.3em] text-linda-espresso/60">
              Moda Italiana
            </span>
          </div>
        )}
      </Link>

      {/* Product Content info */}
      {/* Na telefonu jsou karty ve dvou sloupcích (~165 px), proto menší
          odsazení, menší název a bez značky a „Zobrazit detail" – klikací je
          stejně celá karta. Od `sm` zpátky plná podoba. */}
      <div className="p-3 sm:p-5 flex flex-col flex-1 justify-between">
        <div>
          {/* Category & Brand */}
          <div className="flex items-center justify-between gap-2 text-xs text-linda-cognac font-medium tracking-wide mb-1">
            <span className="truncate">{kategorieNazev || 'Dámská móda'}</span>
            {znacka && <span className="hidden truncate text-linda-espresso/75 font-serif italic sm:inline">{znacka}</span>}
          </div>

          {/* Title */}
          {/* Odkaz z názvu se pseudoprvkem `after` roztáhne přes celou kartu,
              takže na detail vede kliknutí kamkoli – i na cenu nebo kategorii,
              ne jen na fotku, název a „Zobrazit detail". Je to pořád jeden
              odkaz s textem názvu, čtečka i Tab tedy narazí na kartu jednou.
              Srdíčko (`z-10`) leží nad ním a dál funguje samostatně. */}
          <h3 className="font-serif text-base sm:text-xl text-linda-espresso font-medium line-clamp-2 leading-snug">
            <Link
              href={`/produkt/${slug}`}
              className="rounded-sm hover:text-linda-cognac transition-colors after:absolute after:inset-0 after:rounded-2xl"
            >
              {nazev}
            </Link>
          </h3>
        </div>

        {/* Pricing & CTA */}
        <div className="mt-3 sm:mt-4 pt-3 border-t border-linda-sand/40 flex items-center justify-between gap-3">
          {/* Štítek „−20 %" je na fotce, u ceny by byl podruhé. Větu § 12a
              nese `CenaProduktu` – karta je oznámení slevy stejně jako detail. */}
          <div className="min-w-0">
            <CenaProduktu
              cena={cena}
              cenaPoSleve={cenaPoSleve}
              nejnizsiCena30DniHaleru={nejnizsiCena30DniHaleru}
              velikost="karta"
              bezStitku
            />
          </div>

          {/* Šipka se posune při najetí na celou kartu, ne až na odkaz:
              hoverovaným cílem je karta (zvětšuje se fotka i reliéf) a odkaz
              je jen její konec. Posun je 2 px – má naznačit směr, ne upoutat.
              `shrink-0` na ikoně, ať se v úzkém sloupci nezplacatí. */}
          {/* Už jen vizuální pobídka, ne samostatný odkaz – klikací je celá
              karta přes odkaz v názvu, druhý cíl by byl pro Tab navíc. */}
          <span
            aria-hidden="true"
            className="hidden shrink-0 sm:flex items-center gap-1 min-h-touch text-xs font-medium text-linda-cognac group-hover:text-linda-espresso underline underline-offset-4 tracking-wide transition-colors"
          >
            Zobrazit detail
            <ArrowRight
              className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </span>
        </div>
      </div>
    </div>
  );
};
