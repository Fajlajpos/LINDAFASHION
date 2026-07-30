import React from 'react';
import Image from 'next/image';

export interface MediaFrameProps {
  /** Cesta k fotografii v /public. Když chybí, vykreslí se značková výplň. */
  src?: string | null;
  /** Popis fotografie. Dekorativní snímky nechte prázdné (`alt=""`). */
  alt?: string;
  /** Předá se do next/image – vždy uveďte reálné breakpointy sekce. */
  sizes: string;
  /** LCP snímek (hero) dostane priority, ostatní se dolazují lazy. */
  priority?: boolean;
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
 * počítá s místem. Dokud `src` chybí, vykreslíme klidnou pískovou výplň
 * s monogramem – stránka tak nikde nepadá do prázdného obdélníku a přidání
 * fotky je později jen doplnění cesty v `src/lib/home-data.ts`.
 *
 * Rodič musí mít `position: relative` a určenou výšku (např. `aspect-[4/5]`).
 */
export const MediaFrame: React.FC<MediaFrameProps> = ({
  src,
  alt = '',
  sizes,
  priority = false,
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
      className={`absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-linda-sandLight via-linda-cream to-linda-sand/60 ${className}`}
    >
      <span className="font-serif text-3xl leading-none text-linda-cognac/45">L</span>
      <span className="text-[9px] font-semibold uppercase tracking-[0.3em] text-linda-espresso/35">
        Moda Italiana
      </span>
    </div>
  );
};
