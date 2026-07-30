import React from 'react';
import Link from 'next/link';
import { MediaFrame } from './MediaFrame';
import { KATEGORIE_CHIPY } from '@/lib/home-data';

/**
 * Kruhové zkratky kategorií v bílé kartě, která se zespoda zanořuje do heru.
 *
 * Na užších displejích se řada posouvá vodorovně (snap), aby se položky
 * nelámaly a hlavně aby nikdy nevznikl vodorovný scroll celé stránky.
 * Akcentní chip nemá fotku – místo ní nese popisek přímo v tmavém kruhu.
 */
export const CategoryCircles: React.FC = () => (
  <section className="relative z-10 -mt-20 lg:-mt-24">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-white px-4 py-8 shadow-elevated sm:px-8">
        <ul className="-mx-4 flex snap-x items-start gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-8 sm:px-8 lg:mx-0 lg:justify-between lg:overflow-x-visible lg:px-0">
          {KATEGORIE_CHIPY.map((chip) => (
            <li key={chip.href} className="shrink-0 snap-start">
              <Link
                href={chip.href}
                className="group flex min-h-touch cursor-pointer flex-col items-center gap-3 px-2 text-center"
              >
                {chip.accent ? (
                  /* Tmavý akcent – popisek je uvnitř kruhu, pod ním se neopakuje */
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-linda-espresso px-2 text-[11px] font-semibold uppercase leading-tight tracking-widest text-linda-cream transition-colors duration-200 group-hover:bg-linda-cognac sm:h-24 sm:w-24">
                    {chip.label}
                  </span>
                ) : (
                  <>
                    <span className="relative block h-20 w-20 overflow-hidden rounded-full bg-linda-sandLight ring-1 ring-linda-sand transition-shadow duration-200 group-hover:ring-linda-cognac sm:h-24 sm:w-24">
                      <MediaFrame src={chip.obrazek} sizes="96px" zoomOnHover />
                    </span>
                    <span className="text-xs text-linda-espresso transition-colors duration-200 group-hover:text-linda-cognac sm:text-sm">
                      {chip.label}
                    </span>
                  </>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);
