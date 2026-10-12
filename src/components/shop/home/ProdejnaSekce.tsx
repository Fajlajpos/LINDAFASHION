import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, MapPin, Navigation, Store } from 'lucide-react';
import { radkyOteviraciDoby, type RozlozenaAdresa } from '@/lib/prodejna';
import { OteviraciDobaTabulka } from '@/components/shop/OteviraciDobaTabulka';

interface Props {
  adresa: RozlozenaAdresa;
  oteviraciDoba: string | null;
  mapa: string | null;
  /** `/fotky/prodejna.jpg` – viz `najitFotku`. `null` = rám s ikonou. */
  fotka: string | null;
  /**
   * Text pod nadpisem. Úvodní stránka mluví za obchod, „O mně" v první osobě
   * majitelky – jinak je sekce na obou místech stejná.
   */
  text?: React.ReactNode;
  /** Jedinečné na stránce – nese ho `aria-labelledby`. */
  idNadpisu?: string;
  /**
   * Bez vnějšího `max-w-7xl` a bočního odsazení – pro stránku, která má
   * vlastní kontejner („O mně"). Jinak by se okraje sečetly.
   */
  bezKontejneru?: boolean;
}

const VYCHOZI_TEXT = (
  <>
    Na prodejně najdete{' '}
    <strong className="font-semibold text-linda-espresso">i kousky, které na e-shopu nejsou</strong>.
    Zastavte se, vyzkoušejte si je a nechte si poradit s velikostí i kombinací.
  </>
);

/**
 * Kamenná prodejna – na konci úvodní stránky nad patičkou a na „O mně".
 * Jedna komponenta pro obě místa, ať se nerozejdou.
 *
 * ## Reliéf
 *
 * Sekce je **zapuštěná** (`sandLight` + `shadow-neuInset`) – stejně jako pruh
 * s výhodami a newsletter; servisní a informativní plochy jsou prohlubně,
 * vystouplé je zboží. Vystouplá karta tu byla první verze a majitel webu ji
 * chtěl zapuštěnou.
 *
 * Do prohlubně se nesmí dát další prohlubeň (CLAUDE.md), takže rám na fotku
 * je naopak **vystouplá krémová pasparta** (`cream` + `shadow-neu`, okraj
 * `p-3`) a fotka v ní leží jako obraz v rámu. Fotka rám nevyplňuje od kraje
 * ke kraji – lem pasparty musí zůstat vidět, jinak fotka zakryje reliéf
 * a vypadá nalepeně, jediný plochý prvek na vymodelované stránce.
 *
 * Terče ikon mají barvu podkladu (`sandLight` + `shadow-neuSm`) jako v pruhu
 * s výhodami – vystouplá plocha musí mít barvu toho, z čeho vystupuje.
 *
 * ## Text
 *
 * Prodejna má **jiný výběr než e-shop** – to je důvod přijít. Nikde ji
 * nepodávat jako místo, kde si zákaznice vyzkouší zboží z e-shopu.
 */
export function ProdejnaSekce({
  adresa,
  oteviraciDoba,
  mapa,
  fotka,
  text = VYCHOZI_TEXT,
  idNadpisu = 'prodejna-uvod-nadpis',
  bezKontejneru = false,
}: Props) {
  const radkyDoby = radkyOteviraciDoby(oteviraciDoba);

  return (
    <section
      aria-labelledby={idNadpisu}
      className={bezKontejneru ? undefined : 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'}
    >
      {/* Kompaktní: menší okraje a mezery než ostatní sekce. Pravý sloupec
          byl s nadpisem 4xl, velkými terči a časy pod sebou mnohem vyšší než
          fotka a táhl celou kartu dolů. */}
      <div className="grid grid-cols-1 items-center gap-6 rounded-3xl bg-linda-sandLight p-5 shadow-neuInset sm:p-7 lg:grid-cols-2 lg:gap-10 lg:p-8">
        {/* Pasparta na fotku obchodu – vystouplá z prohlubně sekce */}
        <div className="rounded-2xl bg-linda-cream p-3 shadow-neu">
          {fotka ? (
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
              <Image
                src={fotka}
                alt={`Kamenná prodejna LINDA FASHION${adresa.mesto ? `, ${adresa.mesto}` : ''}`}
                fill
                sizes="(min-width: 1280px) 560px, (min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
            </div>
          ) : (
            /* Bez fotky tichá ikona na vystouplém terči – žádné „sem přijde
               fotka" pro zákaznici. */
            <div className="flex aspect-[4/3] items-center justify-center">
              <span className="flex h-24 w-24 items-center justify-center rounded-full bg-linda-cream shadow-neuSm">
                <Store className="h-11 w-11 stroke-[1.25] text-linda-espresso/40" aria-hidden="true" />
              </span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-linda-espresso/70">
              Kamenná prodejna
            </span>
            <h2
              id={idNadpisu}
              className="font-serif text-[1.75rem] leading-[1.15] text-linda-espresso sm:text-3xl"
            >
              Přijďte se podívat <span className="text-linda-cognac">osobně</span>
            </h2>
          </div>

          <p className="text-[0.9375rem] leading-relaxed text-linda-espresso/85">{text}</p>

          {/* Ikony na vystouplých terčích – stejně jako pruh s výhodami
              a kontakt; odliší je reliéf, ne další barva. */}
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linda-sandLight shadow-neuSm">
                <MapPin className="h-4 w-4 text-linda-cognac" aria-hidden="true" />
              </span>
              <div className="pt-0.5">
                <h3 className="font-sans text-[11px] font-semibold uppercase tracking-widest text-linda-cognac">
                  Adresa
                </h3>
                <p className="mt-1 text-linda-espresso">
                  {[adresa.ulice, [adresa.psc, adresa.mesto].filter(Boolean).join(' ')]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </div>
            </div>

            {radkyDoby.length > 0 && (
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linda-sandLight shadow-neuSm">
                  <Clock className="h-4 w-4 text-linda-cognac" aria-hidden="true" />
                </span>
                {/* `max-w-xs` – na širokém sloupci by časy utekly daleko od dnů. */}
                <div className="min-w-0 max-w-xs flex-1 pt-0.5">
                  <h3 className="font-sans text-[11px] font-semibold uppercase tracking-widest text-linda-cognac">
                    Otevírací doba
                  </h3>
                  <div className="mt-1">
                    <OteviraciDobaTabulka radky={radkyDoby} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {mapa && (
              <a
                href={mapa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-linda-cognac px-6 py-3 text-sm font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
              >
                <Navigation className="h-4 w-4" aria-hidden="true" />
                Navigovat do prodejny
                <span className="sr-only"> (otevře mapu v novém okně)</span>
              </a>
            )}
            <Link
              href="/kontakt"
              className="inline-flex min-h-touch items-center text-sm font-medium text-linda-espresso underline underline-offset-4 transition-colors duration-200 hover:text-linda-cognac"
            >
              Kontakt a telefon
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
