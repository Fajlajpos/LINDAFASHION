import React from 'react';
import { Truck, Package, ShieldCheck, Headset, type LucideIcon } from 'lucide-react';
import { vyhody, type HomeTrustItem } from '@/lib/home-data';

/** Mapa názvů ikon z `home-data` na komponenty lucide. */
const IKONY: Record<HomeTrustItem['icon'], LucideIcon> = {
  truck: Truck,
  package: Package,
  shield: ShieldCheck,
  headset: Headset,
};

/**
 * Klidný pískový pruh s nákupními jistotami (doprava, vrácení, platba, poradenství).
 *
 * Panel je **zapuštěný**, ne vyvýšený. Na stránce byl předtím každý blok
 * vyvýšený stejně vysoko – produktové karty, bannery, jistoty i newsletter –
 * a když je zdůrazněné všechno, není zdůrazněné nic. Reliéf teď nese
 * hierarchii: vyvýšené je zboží, na které se sahá, servisní a informativní
 * plochy jsou do stránky zapuštěné.
 *
 * Položky jsou čistě informativní – nikam nevedou, takže tu nejsou odkazy ani
 * tlačítka. Ikona stojí vedle vlastního viditelného popisku, proto je pro
 * čtečky skrytá.
 */
/**
 * `prahDopravaZdarma` přichází z `Settings` (předává ho homepage). Bez něj by
 * se tu vrátil natvrdo zapsaný slib „doprava zdarma nad 2 500 Kč", který
 * pokladna nemusí dodržet.
 *
 * Sloupců je proto tři nebo čtyři podle toho, jestli je práh nastavený –
 * `lg:grid-cols-4` by u tří položek nechalo prázdné čtvrté pole.
 */
export const TrustBar: React.FC<{ prahDopravaZdarma: number | null }> = ({
  prahDopravaZdarma,
}) => {
  const polozky = vyhody(prahDopravaZdarma);

  return (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="rounded-2xl bg-linda-sandLight px-6 py-8 shadow-neuInset sm:px-10">
      {/* Na lg oddělují sloupce vlasové linky; `divide-x` nekreslí čáru před prvním prvkem. */}
      <ul
        className={`grid grid-cols-1 gap-6 sm:grid-cols-2 lg:divide-x lg:divide-linda-sand ${
          polozky.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
        }`}
      >
        {polozky.map((vyhoda) => {
          const Ikona = IKONY[vyhoda.icon];

          return (
            <li
              key={vyhoda.title}
              className="flex items-start gap-3 lg:px-6 lg:first:pl-0 lg:last:pr-0"
            >
              {/* Terč je vystouplý, protože panel kolem něj je teď prohlubeň –
                  dvě úrovně proti sobě, ne dvě stejné pod sebou. Barva je
                  `sage`: olivová z palety se jinde na stránce neobjevuje,
                  ačkoli patří do brandu, a klidné informace jsou její role. */}
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-linda-sandLight shadow-neuSm">
                <Ikona className="h-5 w-5 text-linda-sage" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-linda-espresso">{vyhoda.title}</p>
                <p className="text-sm text-linda-espresso/75">{vyhoda.description}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  </div>
  );
};
