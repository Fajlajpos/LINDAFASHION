import React from 'react';
import { Truck, Package, ShieldCheck, Headset, type LucideIcon } from 'lucide-react';
import { VYHODY, type HomeTrustItem } from '@/lib/home-data';

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
 * Položky jsou čistě informativní – nikam nevedou, takže tu nejsou odkazy ani
 * tlačítka. Ikona stojí vedle vlastního viditelného popisku, proto je pro
 * čtečky skrytá.
 */
export const TrustBar: React.FC = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="rounded-2xl bg-linda-sandLight px-6 py-8 sm:px-10">
      {/* Na lg oddělují sloupce vlasové linky; `divide-x` nekreslí čáru před prvním prvkem. */}
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-linda-sand">
        {VYHODY.map((vyhoda) => {
          const Ikona = IKONY[vyhoda.icon];

          return (
            <li
              key={vyhoda.title}
              className="flex items-start gap-3 lg:px-6 lg:first:pl-0 lg:last:pr-0"
            >
              <Ikona className="h-6 w-6 shrink-0 text-linda-espresso/70" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-linda-espresso">{vyhoda.title}</p>
                <p className="text-sm text-linda-espresso/65">{vyhoda.description}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  </div>
);
