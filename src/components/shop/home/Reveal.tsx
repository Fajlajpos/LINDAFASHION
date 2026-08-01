'use client';

import React, { useEffect, useRef, useState } from 'react';

export interface RevealProps {
  children: React.ReactNode;
  /** Zpoždění v ms – pro postupné naskakování sousedních bloků. */
  delay?: number;
  className?: string;
}

/**
 * Jemné naskočení sekce při vstupu do viewportu.
 *
 * Domovská stránka byla staticky nalitá naráz; drobný pohyb při skrolu ji
 * oživí, aniž by ubral na klidu. Animujeme jen `opacity` a `transform`, takže
 * běh drží kompozitor a nevzniká layout thrashing.
 *
 * Přehráváme jednou (`disconnect` po prvním protnutí) – opakované mizení a
 * naskakování při skrolu nahoru je rušivé.
 *
 * `prefers-reduced-motion` řešíme přímo tady: globální pravidlo v
 * `globals.css` cílí na `hover:scale`, ne na tenhle vstupní posun, a obsah
 * musí zůstat viditelný i bez animace.
 */
export const Reveal: React.FC<RevealProps> = ({ children, delay = 0, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const bezPohybu =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (bezPohybu || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      // Spouštíme až je sekce kousek nad spodní hranou – jinak animace
      // proběhne dřív, než ji uživatel stihne vidět.
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={visible && delay ? { transitionDelay: `${delay}ms` } : undefined}
      /* `js-reveal`: háček pro `<noscript>` pravidlo v layoutu, které blok
         zviditelní, když se JavaScript nespustí. */
      className={`js-reveal transition-[opacity,transform] duration-500 ease-out ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
      } ${className}`}
    >
      {children}
    </div>
  );
};
