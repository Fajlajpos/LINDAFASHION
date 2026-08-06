import React from 'react';

export interface SevProps {
  /**
   * Musí být na stránce jedinečné – jde do `id` masky, na kterou se odkazuje
   * `mask="url(#…)"`. Dvě stejná `id` sice prohlížeč přežije (vezme první),
   * ale je to nevalidní dokument.
   */
  id: string;
  /** Odsazení od sousedních sekcí. */
  className?: string;
}

const VYSKA = 24;
/** Svislý střed pásu – řada stehů. */
const Y = 12;

/**
 * Steh 14 px, mezera 9 px.
 *
 * Perioda 23 px dává na 1216px švu 53 stehů. Kratší steh se z odstupu slije
 * do čáry, delší přestane být stehem a začne být čárkováním.
 */
const STEH = '14 9';

/**
 * Rozestup stěn důlku od jeho osy a síla vlasové čáry.
 *
 * Původně se rýha kreslila „sendvičem“: široký tmavý tah, široký bílý tah
 * a přes ně krycí tah v barvě země, který měl nechat vykouknout jen lemy.
 * **Nefungovalo to** a stálo to čtyři kola ladění – změřeno vodorovným řezem
 * screenshotu, reliéf vylezl jen v ~3px shluku na konci každého stehu
 * (tam, kde kulaté zakončení přečnívalo krycí tah vodorovně), po délce stehu
 * nikde. Atributy přitom seděly, takže to nebyla překlep, ale špatný nápad.
 *
 * Tohle je jednodušší a hlavně to nemá jak selhat: obě stěny se kreslí
 * rovnou, každá vlastní čárou, a nic je nepřekrývá. Mezi nimi zůstane
 * proužek země, což je dno důlku.
 */
const STENA = 1.5;
const VLAS = 1.8;
/** Vodorovný posun stěn – světlo jde zleva shora, ne svisle. */
const UKOS = 0.6;

/**
 * Šev – klasická řada stehů, vylisovaná do povrchu.
 *
 * ## Proč ne `border-t`
 *
 * Sekce od sebe dělila jen mezera a stránka pak čte jako komín nesouvisejících
 * karet. Vlasová linka by to spravila, ale nic neřekne. Tady je obchod
 * s oblečením – když je předělem šev, není to dekorace, ale sdělení o tom,
 * co se prodává.
 *
 * ## Proč je steh z reliéfu, a ne z barvy
 *
 * Nit má **přesně barvu podkladu** (`paper`). Vidět je jen dvoupixelový lem
 * na hraně tahu: stín na horní levé, světlo na spodní pravé. Steh je tedy
 * prohlubeň, ne kresba – stejná fyzika jako `neuInset*` v `tailwind.config.ts`,
 * jen v SVG a otočená na tenký tvar.
 *
 * Dvě věci to řeší najednou:
 *
 *   1. **Nestojí to ani jednu úroveň jasu.** Rozpočet je sedm úrovní mezi
 *      `cream` a `sandLight` (viz `body` v `globals.css`) a plocha přes celou
 *      šířku stránky je to poslední, co si z něj smí ukrojit. Stín nekrade nic.
 *   2. **Sedí to na zbytek webu.** Kolem dokola jsou plochy oddělené jenom
 *      stínem; barevná čárkovaná čára by byla jediný prvek na stránce, který
 *      je nakreslený, ne vymodelovaný.
 *
 * Kreslí se dvěma tahy: tmavá vlasová čára nad osou a bílá pod ní, obě
 * čárkované stejným rytmem. Mezi nimi zůstane proužek země – dno důlku.
 *
 * ## Předchozí pokusy
 *
 * Byl tu ruční prošev, řetízkový steh, stonkový steh, herringbone a nakonec
 * dvouřadý džínový šev s rýhou. Všechny byly složitější a žádný nevypadal
 * líp. Steh nepotřebuje vymyslet, potřebuje jen správný materiál – a ten na
 * tomhle webu není barva, ale světlo.
 *
 * ## Šířka
 *
 * Šev drží šířku obsahu, tedy lícuje s produktovými kartami nad ním i pod ním.
 * Konce jsou změkčené maskou (poslední ~2 % šířky) – jinak řada skončí
 * uprostřed stehu.
 *
 * `aria-hidden`: je to povrch, ne obsah. A je to statické – dřív se nit
 * dokreslovala podle skrolu, což z předělu dělalo blikání.
 */
export const Sev: React.FC<SevProps> = ({ id, className = '' }) => {
  const maskId = `${id}-dobeh`;

  /** Společné pro obě stěny – liší se jen barvou a posunem. */
  const stena = {
    x1: '0',
    x2: '100%',
    strokeWidth: VLAS,
    strokeDasharray: STEH,
    strokeLinecap: 'round',
  } as const;

  return (
    <div className={`w-full ${className}`.trim()} aria-hidden="true">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <svg width="100%" height={VYSKA} className="block" focusable="false">
          <defs>
            <linearGradient id={`${maskId}-prechod`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="black" />
              <stop offset="2%" stopColor="white" />
              <stop offset="98%" stopColor="white" />
              <stop offset="100%" stopColor="black" />
            </linearGradient>
            <mask id={maskId}>
              <rect width="100%" height={VYSKA} fill={`url(#${maskId}-prechod)`} />
            </mask>
          </defs>

          <g mask={`url(#${maskId})`}>
            {/* Horní stěna důlku – odvrácená od světla, tedy ve stínu. */}
            <line
              {...stena}
              y1={Y - STENA}
              y2={Y - STENA}
              transform={`translate(${-UKOS} 0)`}
              stroke="var(--color-espresso)"
              strokeOpacity="0.26"
            />
            {/* Dolní stěna – nastavená světlu. */}
            <line
              {...stena}
              y1={Y + STENA}
              y2={Y + STENA}
              transform={`translate(${UKOS} 0)`}
              stroke="white"
              strokeOpacity="1"
            />
          </g>
        </svg>
      </div>
    </div>
  );
};
