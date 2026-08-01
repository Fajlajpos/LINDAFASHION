import React from 'react';
import { HeroSplit } from '@/components/shop/home/HeroSplit';
import { CategoryBar } from '@/components/shop/home/CategoryBar';
import { BestSellers } from '@/components/shop/home/BestSellers';
import { PromoBanners } from '@/components/shop/home/PromoBanners';
import { TrustBar } from '@/components/shop/home/TrustBar';
import { Newsletter } from '@/components/shop/home/Newsletter';
import { Reveal } from '@/components/shop/home/Reveal';

/**
 * Domovská stránka.
 *
 *   hero (přes celou šířku, fotka) → karta s kategoriemi (zanořená do heru)
 *   → nejprodávanější (mřížka) → promo bannery → nákupní jistoty → newsletter
 *
 * Obsah sekcí žije v `src/lib/home-data.ts`, komponenty samotné jsou bez dat.
 */
export default function HomePage() {
  return (
    <div className="pb-20">
      <HeroSplit />

      {/* Karta se zespoda zanořuje do heru záporným marginem, odsazení si
          proto řeší sama. Bez `Reveal`: je nad ohybem, kde by naskakování
          jen zdrželo. */}
      <CategoryBar />

      {/* Dvě velikosti mezer, ne jedna.
          Předtím byl mezi všemi sekcemi stejný odstup, takže stránka neřekla
          nic o tom, co k čemu patří. Velká mezera (24 / 32) odděluje bloky
          různé povahy – nabídku, akční bannery, servis; malá (10 / 14) drží
          k sobě jistoty a newsletter, které tvoří jeden servisní pás. */}
      <div className="pt-16 sm:pt-24">
        <Reveal>
          <BestSellers />
        </Reveal>

        <div className="mt-24 sm:mt-32">
          <Reveal>
            <PromoBanners />
          </Reveal>
        </div>

        <div className="mt-24 space-y-10 sm:mt-32 sm:space-y-14">
          <Reveal>
            <TrustBar />
          </Reveal>

          <Reveal>
            <Newsletter />
          </Reveal>
        </div>
      </div>
    </div>
  );
}
