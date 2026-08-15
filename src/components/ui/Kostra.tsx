import React from 'react';

/**
 * Zástupné plochy, které drží tvar stránky, než dorazí data ze serveru.
 *
 * Kostra je **prohlubeň**, ne vyvýšená plocha: je to místo, kam se něco vloží,
 * a přesně to zapuštěný povrch v reliéfu webu znamená. Skládá se proto vždy
 * jako zem → vyvýšená `cream` karta → `sandLight` prohlubně uvnitř, aby se
 * prohlubeň nikdy nezanořila do prohlubně (viz CLAUDE.md).
 *
 * `animate-pulse` hýbe jen `opacity` – běží na kompozitoru a pod
 * `prefers-reduced-motion` ji globální pravidlo v globals.css zastaví po
 * prvním průchodu.
 */
export function Kostra({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-linda-sandLight shadow-neuInsetSm ${className}`}
    />
  );
}

/**
 * Obal kostry. Odečítač obrazovky se z něj dozví, že se čeká – vizuální
 * kostra sama o sobě je pro něj prázdné místo.
 */
export function KostraObal({
  popisek = 'Načítám obsah…',
  className = '',
  children,
}: {
  popisek?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{popisek}</span>
      {children}
    </div>
  );
}

/** Karta produktu – stejné proporce jako `ProductCard`, ať mřížka neposkočí. */
export function KostraKarty() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-linda-cream shadow-neu">
      <Kostra className="aspect-[3/4] w-full rounded-none" />
      <div className="flex flex-1 flex-col p-5">
        <Kostra className="h-3 w-1/3" />
        <Kostra className="mt-3 h-5 w-4/5" />
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-linda-sand/40 pt-3">
          <Kostra className="h-5 w-24" />
          <Kostra className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
}

/** Mřížka karet. `pocet` se řídí tím, kolik jich na stránce obvykle je. */
export function KostraMrizky({ pocet = 6, className = 'sm:grid-cols-2 lg:grid-cols-3' }) {
  return (
    <div className={`grid grid-cols-1 gap-6 ${className}`}>
      {Array.from({ length: pocet }, (_, i) => (
        <KostraKarty key={i} />
      ))}
    </div>
  );
}
