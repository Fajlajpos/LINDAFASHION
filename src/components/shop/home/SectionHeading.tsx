import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export interface SectionHeadingProps {
  /** Drobný nadpis nad titulkem, verzálky s prostrkáním. */
  eyebrow: string;
  /** Titulek sekce. Zalomení na dva řádky se řeší přes `<br />` v `title`. */
  title: React.ReactNode;
  /** Volitelný odkaz vpravo („Zobrazit vše“). */
  action?: { href: string; label: string };
  /** Úroveň nadpisu – na homepage je H1 v heru, sekce tedy jedou jako H2. */
  as?: 'h2' | 'h3';
  className?: string;
}

/**
 * Hlavička sekce homepage: eyebrow + serifový titulek vlevo, odkaz vpravo.
 * Na mobilu se odkaz zalomí pod titulek, aby zůstal v dosahu palce.
 */
export const SectionHeading: React.FC<SectionHeadingProps> = ({
  eyebrow,
  title,
  action,
  as: Tag = 'h2',
  className = '',
}) => (
  <div
    className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${className}`}
  >
    <div>
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-linda-espresso/70">
        {eyebrow}
      </span>
      {/* 42 px bylo jen o kousek pod herem – rozdíl tak malý, že hero
          nedominoval. Sekce jdou na 36 px, hero na `xl` nahoru na 72 px;
          teprve mezi těmi dvěma je vidět, co je hlavní nadpis stránky. */}
      <Tag className="font-serif text-[1.75rem] leading-[1.15] text-linda-espresso sm:text-4xl">
        {title}
      </Tag>
    </div>

    {action && (
      <Link
        href={action.href}
        className="group inline-flex min-h-touch shrink-0 items-center gap-2 rounded-sm text-sm font-medium text-linda-espresso transition-colors hover:text-linda-cognac"
      >
        {action.label}
        <ArrowRight
          className="h-4 w-4 transition-transform group-hover:translate-x-1"
          aria-hidden="true"
        />
      </Link>
    )}
  </div>
);
