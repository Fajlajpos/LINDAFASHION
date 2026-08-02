import React from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Package, Truck } from 'lucide-react';
import { MediaFrame } from './MediaFrame';

/**
 * Úvodní hero: diptych. Vlevo omítnutá stěna se sdělením, vpravo fotografie
 * od kraje ke kraji. Žádný rám, žádná karta, žádné zaoblení – dvě plochy,
 * které se potkávají na jedné svislé spáře.
 *
 * ## Proč zrovna takhle
 *
 * Předchozí verze fotku zarámovaly – nejdřív krémovou kartou přes ni, potom
 * obloukem niky. Rám ale fotografii vždycky zmenší, a tahle si zaslouží plnou
 * plochu: je to jediný skutečný obraz produktu na celé domovské stránce.
 * Diptych navíc dá oběma stranám stejnou váhu – text nekonkuruje snímku
 * o stejné pixely, každý má svou polovinu.
 *
 * Žena na snímku se dívá doleva, tedy do stránky, na text. Kdyby fotka byla
 * vlevo, dívala by se ven z obrazovky a kompozice by čtenáře vyváděla pryč.
 *
 * ## Ostrost
 *
 * Zdrojový snímek má 1672 px na šířku – na půlku velké obrazovky je to málo.
 * Řeší to tři věci dohromady: soubor v `public/` je převzorkovaný lanczosem
 * na 2675 px, `sizes` hlásí reálných `50vw` (jinak Next posílá menší variantu,
 * než displej potřebuje) a `quality={90}` místo výchozích 75. Výřez držíme
 * spíš na šířku – čím vyšší sekce, tím užší pás zdroje se roztahuje přes
 * celou polovinu a tím měkčeji to dopadne. Proto `max-h`.
 *
 * ## Sladění s reliéfem zbytku webu
 *
 * Plochy jsou tu ploché, ne vypouklé, a to je záměr: reliéf si v heru nechávají
 * jen věci, na které se sahá (tlačítka `shadow-neuDark`, kroužek se šipkou
 * `shadow-neu`). Stránka tak čte jasně – vystouplé = ovladatelné. Na spáře
 * stěna vrhá do fotky měkký stín, takže polovina „drží“ druhou fyzicky,
 * ne linkou.
 *
 * Pod `lg` jde fotka nahoru v poměru 4:3 (na 375 px se z ní použije skoro celá
 * šířka zdroje – nikde není ostřejší) a stěna s textem pod ni.
 */
export const HeroSplit: React.FC = () => (
  <section aria-label="Nová kolekce" className="relative w-full bg-linda-cream">
    <div className="grid lg:h-[calc(100vh-6rem)] lg:min-h-[34rem] lg:max-h-[45rem] lg:grid-cols-2">
      {/* ------------------------------------------------------------------ */}
      {/* Fotografie                                                         */}
      {/* ------------------------------------------------------------------ */}
      {/* V DOMu první, na `lg` ale vpravo. Na mobilu tím pořadí v kódu sedí
          na pořadí na obrazovce; na desktopu je prohozený jen obrázek, který
          se nedá zaostřit ani proklikat, takže navigaci klávesnicí to nemíchá. */}
      <div className="relative aspect-[4/3] w-full sm:aspect-[16/10] lg:order-last lg:aspect-auto lg:h-full">
        <MediaFrame
          src="/hero-amalfi.jpg"
          alt="Žena v lněných šatech opřená o omítnutou zeď nad mořem"
          sizes="(min-width: 1024px) 50vw, 100vw"
          priority
          quality={90}
          /* 65 % drží ženu na pravé třetině pásu a nechá u spáry kus moře –
             jediná studená barva na celé stránce, hned vedle teplé omítky. */
          objectPosition="object-[65%_center]"
        />

        {/* Stín, který stěna vrhá do fotky. Fyzikálně sedí na světlo zleva
            shora, kterým jede celý web, a spáru vysvětlí bez jediné linky. */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 hidden w-24 bg-gradient-to-r from-linda-espresso/20 to-transparent lg:block"
        />
        {/* Pod `lg` je stěna pod fotkou, takže stín padá dolů. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-linda-espresso/20 to-transparent lg:hidden"
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Stěna se sdělením                                                  */}
      {/* ------------------------------------------------------------------ */}
      {/* `isolate` uzavírá stacking context, aby `mix-blend-multiply` textury
          míchalo s krémem téhle poloviny a ne s čímkoli pod sekcí. */}
      <div className="relative isolate flex items-center bg-linda-cream">
        <MediaFrame
          src="/textures/plaster-wall.jpg"
          alt=""
          sizes="(min-width: 1024px) 50vw, 100vw"
          quality={85}
          className="texture-plaster -z-10"
        />

        {/* Od `lg` je sloupec zarovnaný na pravou hranu poloviny a omezený na
            40rem. Díky tomu jeho levý okraj padne přesně na `max-w-7xl px-8`
            zbytku stránky – nadpis heru stojí ve stejné ose jako nadpisy sekcí
            pod ním. Ověřeno na 1024 / 1280 / 1440 / 1600 px.

            Pod `lg` je stěna přes celou šířku, takže žádné zarovnání doprava:
            text drží stejný okraj jako ostatní sekce.

            Spodní odsazení je větší než horní schválně. Obsah je svisle na
            střed a karta kategorií se zespoda zanořuje 64 px do sekce –
            bez toho přesahu by na ni řádek s nákupními jistotami dosedl. */}
        <div className="w-full px-4 pb-28 pt-14 sm:px-6 sm:pt-16 lg:ml-auto lg:max-w-[40rem] lg:px-8 lg:pb-32 lg:pt-16">
          <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-linda-espresso/70">
            <span aria-hidden="true" className="h-px w-8 bg-linda-cognac" />
            Nová kolekce
          </p>

          {/* Cormorant je displejové písmo, ve 48 px působí krotce. Teprve
              tahle velikost dělá hierarchii, ve které hero vede nad nadpisy
              sekcí (36 px).

              Zalomení je pevné na všech šířkách. Automatické lámání dělalo na
              mobilu z posledního řádku osamocené „den“ – u nadpisu téhle
              velikosti je každý zlom vidět, takže si ho řídíme sami. Tři řádky
              se ve 44 px vejdou i na 320px displej. */}
          <h1 className="mt-7 font-serif text-[2.75rem] leading-[0.98] tracking-[-0.01em] text-linda-espresso sm:text-6xl lg:text-[4.5rem]">
            Nadčasová
            <br />
            elegance
            <br />
            <span className="text-linda-cognac">pro každý den</span>
          </h1>

          <p className="mt-8 max-w-sm text-base leading-relaxed text-linda-espresso/75">
            Kousky z tradičních italských dílen. Přírodní materiály, poctivé krejčovství a
            styl, který vydrží roky.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link
              href="/produkty"
              className="group inline-flex min-h-touch min-w-touch cursor-pointer items-center gap-2 rounded-full bg-linda-espresso px-8 py-4 text-sm font-medium text-linda-cream shadow-neuDark transition-all duration-200 hover:bg-linda-cognac active:shadow-neuSm"
            >
              Prohlédnout kolekci
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none"
                aria-hidden="true"
              />
            </Link>

            <Link
              href="/o-mne"
              className="group inline-flex min-h-touch min-w-touch cursor-pointer items-center gap-3 rounded-full text-sm font-medium text-linda-espresso transition-colors duration-200 hover:text-linda-cognacHover"
            >
              {/* Šipka slibuje to, co se opravdu stane – odkaz vede na textovou
                  stránku, ne na video. */}
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-linda-cream shadow-neu transition-all duration-200 group-hover:bg-linda-cognac group-hover:text-white group-hover:shadow-neuSm">
                <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
              </span>
              Příběh značky
            </Link>
          </div>

          {/* Nákupní jistoty jen jako jeden tichý řádek – tytéž položky nese
              `TrustBar` níž na stránce, opakovat celý výčet dvakrát nemá smysl.
              Nezlomitelné mezery drží „2 500 Kč“ i „14 dnů“ pohromadě. */}
          <div className="mt-10 flex max-w-sm flex-wrap items-center gap-x-5 gap-y-2 border-t border-linda-sand pt-6 text-xs text-linda-espresso/75">
            <span className="inline-flex items-center gap-2">
              <Truck className="h-4 w-4 shrink-0 text-linda-sage" aria-hidden="true" />
              Doprava zdarma nad 2 500 Kč
            </span>
            <span aria-hidden="true" className="hidden h-3 w-px bg-linda-sand sm:block" />
            <span className="inline-flex items-center gap-2">
              <Package className="h-4 w-4 shrink-0 text-linda-sage" aria-hidden="true" />
              Vrácení do 14 dnů
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
);
