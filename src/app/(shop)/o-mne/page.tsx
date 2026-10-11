import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Sparkles, ArrowRight, UserRound } from 'lucide-react';
import { Reveal } from '@/components/shop/home/Reveal';
import { Sev } from '@/components/shop/home/Sev';

/**
 * Fotka majitelky. Stačí ji uložit do `public/fotky/` pod jedním z těchhle
 * názvů – kód se nemění. Tvář člověka, který za obchodem stojí, je pro
 * zákaznici nejsilnější důkaz, že na druhé straně je skutečný butik.
 *
 * Hledá se na disku, ne v konstantě: majitelka (nebo kdokoli, kdo jí fotku
 * nahraje) nemusí sahat do kódu. Stránka je statická, takže se to vyhodnotí
 * při buildu – v Dockeru je potřeba image přestavět, ve vývoji stačí reload.
 */
const FOTKA_KANDIDATI = ['majitelka.webp', 'majitelka.jpg', 'majitelka.jpeg', 'majitelka.png'];

function najitFotkuMajitelky(): string | null {
  const nalez = FOTKA_KANDIDATI.find((soubor) =>
    fs.existsSync(path.join(process.cwd(), 'public', 'fotky', soubor))
  );
  return nalez ? `/fotky/${nalez}` : null;
}

/*
 * Koňaková ve stejných rolích jako v katalogu a na detailu produktu: štítek
 * nad nadpisem (tam „Kategorie"), linka pod nadpisem, hlavní tlačítko.
 * Kontrast koňakové na `paper` je 6,6 : 1, takže unese i drobné písmo.
 */
const STITEK = 'mb-1 block text-xs font-semibold uppercase tracking-widest text-linda-cognac';
const NADPIS =
  'border-b border-linda-cognac/30 pb-3 font-serif text-3xl font-normal text-linda-espresso';

/**
 * Stránka o butiku.
 *
 * Záměrně klidná textová stránka, ne druhá domovská – zkoušela se verze
 * s diptychem heru a kapitolami a byla na tenhle obsah přehnaná. Z jazyka
 * domovské stránky si bere jen drobnosti: eyebrow s koňakovou linkou, šev
 * před závěrem a jemné naskočení bloků při skrolu.
 *
 * ## Co se tu smí tvrdit
 *
 * Původní text byl vymyšlený: majitelku jmenoval „Linda" (prodávající je
 * Martina Ludvíková), sliboval zboží „přímo z rodinných dílen v Toskánsku,
 * Miláně a Římě", osobní vzkaz v každém balení a limitované série. Tvrzení
 * o původu zboží a o službách, která neplatí, je klamavá obchodní praktika
 * (§ 5 zák. č. 634/1992 Sb.).
 *
 * Text je proto **návrh v hlasu majitelky** a stojí jen na tom, co víme:
 * oblečení nešije, prodává zboží zavedených značek a vybírá ho sama. Nejsou
 * v něm místa, cesty, roky ani historky. Karty dole plynou z kódu – složení
 * materiálu je u oblečení povinné (`produktSchema`) a kontaktní formulář
 * existuje. Když majitelka text přepíše svými slovy, ať drží stejné pravidlo.
 */
export default function OMnePage() {
  const fotka = najitFotkuMajitelky();

  return (
    <div className="mx-auto max-w-5xl space-y-16 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-4 text-center">
        <p className="flex items-center justify-center gap-3 text-xs font-semibold uppercase tracking-widest text-linda-cognac">
          <span aria-hidden="true" className="h-px w-8 bg-linda-cognac" />
          O butiku LINDA FASHION
          <span aria-hidden="true" className="h-px w-8 bg-linda-cognac" />
        </p>
        {/* Druhá půlka v koňakové – stejný tah jako „pro každý den" v heru
            domovské stránky. */}
        <h1 className="font-serif text-4xl leading-tight text-linda-espresso sm:text-6xl">
          Dámská móda <span className="text-linda-cognac">s italským půvabem</span>
        </h1>
        <p className="font-serif text-lg italic text-linda-espresso/75">Vítejte v mém butiku.</p>
      </div>

      {/* Běžný řez místo `font-light` a /85 místo /80: tenké světlé písmo na
          krémové působilo vybledle, příběh má číst jako hlas, ne jako poznámka
          pod čarou. */}
      <div className="space-y-12 text-base leading-relaxed text-linda-espresso/85">
        <Reveal>
          <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-5 md:gap-12">
            {/* Rám je prohlubeň – fotka do stránky patří vsazená, ne nalepená.
                Na výšku 4:5, jak se portréty fotí; šířka omezená, aby na mobilu
                nezabrala celou obrazovku. Dokud fotka není, drží místo tichá
                silueta bez textu – žádné „sem přijde fotka" pro zákaznici. */}
            <figure className="mx-auto w-full max-w-[15rem] sm:max-w-xs md:col-span-2 md:max-w-none">
              <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-linda-sandLight shadow-neuInset">
                {fotka ? (
                  <Image
                    src={fotka}
                    alt="Majitelka butiku LINDA FASHION"
                    fill
                    sizes="(min-width: 768px) 360px, (min-width: 640px) 320px, 240px"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="flex h-24 w-24 items-center justify-center rounded-full bg-linda-cream shadow-neu">
                      <UserRound
                        className="h-12 w-12 stroke-[1.25] text-linda-espresso/40"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                )}
              </div>
            </figure>

            <div className="space-y-4 md:col-span-3">
              <div>
                <span className={STITEK}>Začátky</span>
                <h2 className={NADPIS}>Jak to začalo</h2>
              </div>
              <p>
                Oblečení mě baví odjakživa. Ne kvůli trendům, které za jednu sezónu vystřídají
                další, ale kvůli tomu, co dokáže dobře padnoucí kousek: změnit náladu celého dne
                a dodat jistotu, se kterou člověk vchází do místnosti.
              </p>
              <p>
                Z té radosti vznikl{' '}
              <strong className="font-medium text-linda-cognac">LINDA FASHION</strong> – malý
                butik s dámskou módou, kde nabízím šaty, halenky, svetry, saka a kabáty. Kousky,
                které se dají nosit každý den i na výjimečnou příležitost.
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <div className="mx-auto max-w-3xl space-y-4">
            <div>
              <span className={STITEK}>Výběr</span>
              <h2 className={NADPIS}>Proč právě tyhle kousky</h2>
            </div>
            <p>
              Oblečení nešiju, vybírám ho. Procházím kolekce zavedených značek a do butiku beru jen
              to, co mě opravdu zaujme: střih, který dobře sedí, materiál příjemný na těle a barvy,
              které se dají snadno kombinovat s tím, co už máte ve skříni.
            </p>
            {/* Pointa odstavce – v serifu a v koňakové, ať si ji čtenářka
                odnese, i když zbytek jen přelétne. Koňaková linka vlevo ji
                odsadí jako citát; je to obyčejný text, ne reliéfní plocha,
                takže pravidlo „rámeček + stín" se jí netýká. */}
            <p className="!mt-6 border-l-2 border-linda-cognac pl-5 font-serif text-xl italic leading-relaxed text-linda-cognac sm:text-2xl">
              Nechci mít v nabídce všechno. Chci mít kousky, za kterými si stojím a které bych
              s klidným svědomím doporučila kamarádce.
            </p>

            {/* Podpis – text je v první osobě, tak ať je vidět čí. Jméno je
                prodávající ze `Settings` (Martina Ludvíková), tady jen křestní,
                jak se podepisuje dopis. */}
            <div className="!mt-8 text-right">
              <p className="font-serif text-3xl italic text-linda-espresso">Martina</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-linda-cognac">
                majitelka butiku
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="space-y-3 rounded-2xl bg-linda-cream p-6 shadow-neu">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-linda-cream shadow-neuSm">
                <Sparkles className="h-6 w-6 text-linda-cognac" aria-hidden="true" />
              </span>
              <h3 className="font-serif text-xl text-linda-espresso">Víte, co kupujete</h3>
              <p className="text-sm leading-relaxed text-linda-espresso/75">
                U každého kousku najdete přesné materiálové složení v procentech, a pokud je známa,
                i zemi původu.
              </p>
            </div>

            <div className="space-y-3 rounded-2xl bg-linda-cream p-6 shadow-neu">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-linda-cream shadow-neuSm">
                <Heart className="h-6 w-6 text-linda-cognac" aria-hidden="true" />
              </span>
              <h3 className="font-serif text-xl text-linda-espresso">Ráda poradím</h3>
              <p className="text-sm leading-relaxed text-linda-espresso/75">
                Nevíte si rady s velikostí nebo s kombinací? Napište mi přes{' '}
                <Link
                  href="/kontakt"
                  className="underline underline-offset-2 transition-colors duration-200 hover:text-linda-cognac"
                >
                  kontaktní formulář
                </Link>{' '}
                a poradím vám.
              </p>
            </div>
          </div>
        </Reveal>
      </div>

      {/* Šev místo vlasové linky – stejný předěl jako mezi sekcemi domovské
          stránky. `Sev` si nese vlastní boční odsazení a tahle stránka taky,
          záporný okraj ho vrací na šířku karet nad ním. */}
      <div className="space-y-12">
        <Sev id="sev-o-mne" className="-mx-4 w-auto sm:-mx-6 lg:-mx-8" />

        <Reveal>
          <div className="space-y-5 text-center">
            <span className={STITEK}>Kolekce</span>
            <h2 className="!mt-0 font-serif text-3xl text-linda-espresso">Prohlédněte si kolekci</h2>
            <p className="text-sm text-linda-espresso/75">Podívejte se, co je právě skladem.</p>
            {/* Koňakové tlačítko jako „Do košíku" na detailu produktu. */}
            <Link
              href="/produkty"
              className="group inline-flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-linda-cognac px-8 py-4 text-sm font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
            >
              Objevit kolekci
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none"
                aria-hidden="true"
              />
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
