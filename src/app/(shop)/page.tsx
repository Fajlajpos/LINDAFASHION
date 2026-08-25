import React from 'react';
import { HeroSplit } from '@/components/shop/home/HeroSplit';
import { CategoryBar } from '@/components/shop/home/CategoryBar';
import { BestSellers } from '@/components/shop/home/BestSellers';
import { PromoBanners } from '@/components/shop/home/PromoBanners';
import { TrustBar } from '@/components/shop/home/TrustBar';
import { Newsletter } from '@/components/shop/home/Newsletter';
import { Reveal } from '@/components/shop/home/Reveal';
import { Sev } from '@/components/shop/home/Sev';
import { nacistNastaveni } from '@/lib/nastaveni';

/**
 * Domovská stránka.
 *
 *   hero (přes celou šířku, fotka) → karta s kategoriemi (zanořená do heru)
 *   → nejprodávanější (mřížka) → šev → promo bannery → šev
 *   → nákupní jistoty → newsletter
 *
 * Obsah sekcí žije v `src/lib/home-data.ts`, komponenty samotné jsou bez dat.
 */
export default async function HomePage() {
  /* Práh dopravy zdarma se propisuje do heru i do pruhu s jistotami. Obojí
     ho mělo natvrdo jako 2 500 Kč, zatímco skutečná hodnota žije v `Settings`
     a klidně chybí – homepage pak slibovala poštovné zdarma, které pokladna
     neúčtovala. */
  const nastaveni = await nacistNastaveni();

  return (
    <div className="pb-20">
      <HeroSplit prahDopravaZdarma={nastaveni.prahDopravaZdarma} />

      {/* Karta se zespoda zanořuje do heru záporným marginem, odsazení si
          proto řeší sama. Bez `Reveal`: je nad ohybem, kde by naskakování
          jen zdrželo. */}
      <CategoryBar />

      {/* Dvě velikosti mezer, ne jedna.
          Předtím byl mezi všemi sekcemi stejný odstup, takže stránka neřekla
          nic o tom, co k čemu patří. Velká mezera (24 / 32) odděluje bloky
          různé povahy – nabídku, akční bannery, servis; malá (10 / 14) drží
          k sobě jistoty a newsletter, které tvoří jeden servisní pás.

          Švy stojí přesně na těch velkých mezerách a nesou je: odstup zůstal
          zhruba stejný (12+12 kolem švu místo 24), ale mezera přestala být
          prázdnem a stala se předělem. Malou mezeru mezi jistotami
          a newsletterem šev **nedostane** – ty dva tvoří jeden servisní pás
          a šev by ho rozřízl. */}
      <div className="pt-16 sm:pt-24">
        <Reveal>
          <BestSellers />
        </Reveal>

        {/* Oba švy jsou stejné. Dřív běžely proti sobě a každý přetékal přes
            jinou hranu okna, jenže tím se z předělu stal směrový prvek –
            a šev má stránku sešívat, ne ukazovat, kam jít. Ve stejné šířce
            jako karty se čte jako steh, který drží dva díly u sebe. */}
        <Sev id="sev-nabidka" className="my-12 sm:my-16" />

        <Reveal>
          <PromoBanners />
        </Reveal>

        <Sev id="sev-servis" className="my-12 sm:my-16" />

        <div className="space-y-10 sm:space-y-14">
          <Reveal>
            <TrustBar prahDopravaZdarma={nastaveni.prahDopravaZdarma} />
          </Reveal>

          <Reveal>
            <Newsletter />
          </Reveal>
        </div>
      </div>
    </div>
  );
}
