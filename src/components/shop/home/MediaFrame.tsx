import React from 'react';
import Image from 'next/image';
import { CategoryGlyph, type CategoryGlyphName } from './CategoryGlyph';

export interface MediaFrameProps {
  /** Cesta k fotografii v /public. Když chybí, vykreslí se značková výplň. */
  src?: string | null;
  /**
   * Ilustrace, která zastoupí chybějící fotografii. Bez ní zbyde jen
   * monogram – použijte ji všude, kde se dá plocha tematicky pojmenovat.
   */
  glyph?: CategoryGlyphName;
  /** Popis fotografie. Dekorativní snímky nechte prázdné (`alt=""`). */
  alt?: string;
  /** Předá se do next/image – vždy uveďte reálné breakpointy sekce. */
  sizes: string;
  /** LCP snímek (hero) dostane priority, ostatní se dolazují lazy. */
  priority?: boolean;
  /**
   * Komprese next/image. Výchozích 75 stačí na dlaždice v mřížce; velké plochy
   * (hero přes půl obrazovky) na nich viditelně měknou – tam dávejte 90.
   */
  quality?: number;
  /** Zvětšení snímku při hoveru nad rodičovskou `.group`. */
  zoomOnHover?: boolean;
  /** Kotva výřezu, např. `object-[70%_25%]`. */
  objectPosition?: string;
  className?: string;
}

/**
 * Jednotný rámeček pro obrazovou plochu.
 *
 * Fotografie k jednotlivým sekcím zatím nejsou nafocené, layout na ně ale už
 * počítá s místem. Dokud `src` chybí, vykreslíme na jejich místo **velkou
 * plastickou ilustraci** (`glyph`) – ne drobný monogram uprostřed prázdna.
 * Rozdíl je zásadní: malá značka uprostřed plochy čte jako „chybí obrázek“,
 * ilustrace přes celý rám čte jako záměr. Až fotky přibudou, stačí doplnit
 * cestu v `src/lib/home-data.ts`, komponenty se nemění.
 *
 * Rodič musí mít `position: relative` a určenou výšku (např. `aspect-[4/5]`).
 */
export const MediaFrame: React.FC<MediaFrameProps> = ({
  src,
  glyph,
  alt = '',
  sizes,
  priority = false,
  quality,
  zoomOnHover = false,
  objectPosition = 'object-center',
  className = '',
}) => {
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        quality={quality}
        sizes={sizes}
        className={`object-cover ${objectPosition} ${
          zoomOnHover ? 'transition-transform duration-500 group-hover:scale-105' : ''
        } ${className}`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 overflow-hidden bg-gradient-to-br from-linda-sandLight via-linda-cream to-linda-sand/60 ${className}`}
    >
      {glyph ? (
        <>
          {/* Silueta vyplní rám. `viewBox` je čtvercový a SVG si drží poměr
              stran samo, takže se v širokém ani vysokém rámu nedeformuje. */}
          <CategoryGlyph
            name={glyph}
            className="absolute left-1/2 top-1/2 h-[76%] w-[76%] max-h-[360px] max-w-[360px] -translate-x-1/2 -translate-y-1/2"
          />
          <span className="absolute inset-x-0 bottom-4 text-center text-[10px] font-semibold uppercase tracking-[0.3em] text-linda-espresso/60">
            Moda Italiana
          </span>
        </>
      ) : (
        /* Bez určené ilustrace zbývá klidná značková výplň.
           Krytí /45 a /35 dávalo kolem 2:1 – výplň byla sotva vidět. */
        <div className="flex h-full w-full flex-col items-center justify-center gap-2">
          <span className="font-serif text-3xl leading-none text-linda-cognac/75">L</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-linda-espresso/80">
            Moda Italiana
          </span>
        </div>
      )}
    </div>
  );
};
