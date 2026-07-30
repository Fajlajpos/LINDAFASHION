import React from 'react';
import { HeroSplit } from '@/components/shop/home/HeroSplit';
import { CategoryCircles } from '@/components/shop/home/CategoryCircles';
import { CategoryShowcase } from '@/components/shop/home/CategoryShowcase';
import { PromoBanners } from '@/components/shop/home/PromoBanners';
import { BestSellers } from '@/components/shop/home/BestSellers';
import { TrustBar } from '@/components/shop/home/TrustBar';
import { Newsletter } from '@/components/shop/home/Newsletter';

/**
 * Domovská stránka.
 *
 * Skladba sekcí vychází z editoriálního rozvržení: dělený hero, kruhové
 * zkratky kategorií přesahující přes jeho spodní hranu, dlaždice kategorií,
 * dvojice bannerů, mřížka nejprodávanějších, pruh výhod a newsletter.
 *
 * Obsah sekcí žije v `src/lib/home-data.ts`, komponenty samotné jsou bez dat.
 */
export default function HomePage() {
  return (
    <div className="pb-20">
      <HeroSplit />

      {/* Karta se zkratkami vystupuje nahoru přes spodek heru – proto stojí
          mimo společný rytmus sekcí a odsazení si řeší sama. */}
      <CategoryCircles />

      <div className="space-y-16 pt-16 sm:space-y-24 sm:pt-24">
        <CategoryShowcase />
        <PromoBanners />
        <BestSellers />
        <TrustBar />
        <Newsletter />
      </div>
    </div>
  );
}
