import React from 'react';
import { siteKey } from '@/lib/captcha';
import { HeroSplit } from '@/components/shop/home/HeroSplit';
import { CategoryBar } from '@/components/shop/home/CategoryBar';
import { BestSellers } from '@/components/shop/home/BestSellers';
import { PromoBanners } from '@/components/shop/home/PromoBanners';
import { TrustBar } from '@/components/shop/home/TrustBar';
import { Newsletter } from '@/components/shop/home/Newsletter';
import { Reveal } from '@/components/shop/home/Reveal';
import { Sev } from '@/components/shop/home/Sev';
import { kratkaLhutaOdeslani, nacistNastaveni } from '@/lib/nastaveni';
import { jeNastaveno as platbaKartouNastavena } from '@/lib/gopay';
import { odkazNaMapu, rozlozitAdresu } from '@/lib/prodejna';
import { najitFotku } from '@/lib/fotky';
import { ProdejnaSekce } from '@/components/shop/home/ProdejnaSekce';

/**
 * Domovská stránka.
 *
 *   hero (přes celou šířku, fotka) → karta s kategoriemi (zanořená do heru)
 *   → nejprodávanější (mřížka) → šev → promo bannery → šev
 *   → nákupní jistoty → newsletter → šev → kamenná prodejna
 *
 * Obsah sekcí žije v `src/lib/home-data.ts`, komponenty samotné jsou bez dat.
 */
export default async function HomePage() {
  /* Lhůta odeslání se propisuje do heru i do pruhu s jistotami – z `Settings`,
     ne natvrdo, a v režimu dovolené vůbec. Dřív tu byla doprava zdarma
     (`prahDopravaZdarma`); ta se dnes ukazuje jen v košíku a v pokladně. */
  const nastaveni = await nacistNastaveni();
  const lhutaOdeslani = kratkaLhutaOdeslani(nastaveni);
  const adresaProdejny = rozlozitAdresu(nastaveni.adresaProvozovny);

  return (
    <div className="pb-20">
      <HeroSplit lhutaOdeslani={lhutaOdeslani} />

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
            <TrustBar
              lhutaOdeslani={lhutaOdeslani}
              platbaKartouDostupna={platbaKartouNastavena()}
              mestoProdejny={adresaProdejny?.mesto ?? null}
            />
          </Reveal>

          <Reveal>
            <Newsletter captchaSiteKey={siteKey()} />
          </Reveal>
        </div>

        {/* Kamenná prodejna jako poslední blok před patičkou – jiná povaha než
            servisní pás, proto velká mezera se švem. Bez adresy provozovny
            v administraci se nevykreslí ani šev. */}
        {adresaProdejny && (
          <>
            <Sev id="sev-prodejna" className="my-12 sm:my-16" />
            <Reveal>
              <ProdejnaSekce
                adresa={adresaProdejny}
                oteviraciDoba={nastaveni.oteviraciDoba}
                mapa={odkazNaMapu(nastaveni.adresaProvozovny)}
                fotka={najitFotku('prodejna')}
              />
            </Reveal>
          </>
        )}
      </div>
    </div>
  );
}
