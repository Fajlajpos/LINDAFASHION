import React from 'react';
import { Truck, Package, ShieldCheck, Headset, Store, type LucideIcon } from 'lucide-react';
import { vyhody, type HomeTrustItem } from '@/lib/home-data';
import type { KratkaLhuta } from '@/lib/nastaveni';

/** Mapa názvů ikon z `home-data` na komponenty lucide. */
const IKONY: Record<HomeTrustItem['icon'], LucideIcon> = {
  truck: Truck,
  package: Package,
  shield: ShieldCheck,
  headset: Headset,
  store: Store,
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
 * `lhutaOdeslani` přichází z `Settings` přes `kratkaLhutaOdeslani` (předává ji
 * homepage) a v režimu dovolené je `null` – dlaždice pak zmizí.
 *
 * Stejně tak dlaždice platby kartou, která se ukáže jen se zapojenou bránou.
 *
 * A dlaždice kamenné prodejny, jen když je v administraci adresa provozovny.
 *
 * Sloupců je proto dva až pět podle toho, kolik položek zbude –
 * `lg:grid-cols-4` by u tří položek nechalo prázdné čtvrté pole.
 * Třídy jsou vypsané celé, protože Tailwind skládané názvy nenajde.
 */
const SLOUPCE: Record<number, string> = {
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'xl:grid-cols-4',
  5: 'xl:grid-cols-5',
};

/*
 * Čtyři a víc dlaždic jdou do jedné řady až od `xl` (1280 px). Na 1024 px by
 * se každý popisek lámal na tři řádky a pruh by ztloustl – pod `xl` proto
 * zůstanou dva sloupce. Vlasové linky mezi sloupci kreslí `divide-x` jen
 * v jedné řadě; ve dvou sloupcích by druhý řádek začínal linkou na kraji.
 */
const ODDELOVACE_RADA = 'lg:divide-x lg:divide-linda-sand';
const ODDELOVACE_SIROKA = 'xl:divide-x xl:divide-linda-sand';
const POLOZKA_RADA = 'lg:px-6 lg:first:pl-0 lg:last:pr-0';
const POLOZKA_SIROKA = 'xl:px-6 xl:first:pl-0 xl:last:pr-0';

export const TrustBar: React.FC<{
  lhutaOdeslani: KratkaLhuta | null;
  platbaKartouDostupna: boolean;
  mestoProdejny?: string | null;
}> = ({ lhutaOdeslani, platbaKartouDostupna, mestoProdejny = null }) => {
  const polozky = vyhody(lhutaOdeslani, platbaKartouDostupna, mestoProdejny);
  const siroka = polozky.length >= 4;

  return (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="rounded-2xl bg-linda-sandLight px-6 py-8 shadow-neuInset sm:px-10">
      {/* Na lg oddělují sloupce vlasové linky; `divide-x` nekreslí čáru před prvním prvkem. */}
      <ul
        className={`grid grid-cols-1 gap-6 sm:grid-cols-2 ${
          siroka ? ODDELOVACE_SIROKA : ODDELOVACE_RADA
        } ${SLOUPCE[polozky.length] ?? 'xl:grid-cols-4'}`}
      >
        {polozky.map((vyhoda) => {
          const Ikona = IKONY[vyhoda.icon];

          return (
            <li
              key={vyhoda.title}
              className={`flex items-start gap-3 ${siroka ? POLOZKA_SIROKA : POLOZKA_RADA}`}
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
