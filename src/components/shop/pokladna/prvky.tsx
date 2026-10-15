import React from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Stavební prvky pokladny – tvar nese stav, ne jen barva              */
/* ------------------------------------------------------------------ */

export const KrokKarty: React.FC<{ nadpis: string; ikona?: React.ReactNode; children: React.ReactNode }> = ({
  nadpis,
  ikona,
  children,
}) => (
  <section className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu sm:p-8">
    <h2 className="flex items-center gap-2 font-serif text-2xl text-linda-espresso">
      {ikona}
      {nadpis}
    </h2>
    {children}
  </section>
);

export const Pole: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  /** Klávesnice na telefonu. `type` necháváme `text`, ať se nepřidají šipky. */
  inputMode?: 'text' | 'tel' | 'email' | 'numeric';
  required?: boolean;
  disabled?: boolean;
  chyba?: string;
  napoveda?: string;
}> = ({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
  inputMode,
  required,
  disabled,
  chyba,
  napoveda,
}) => {
  const popsano = [chyba ? `${id}-chyba` : null, napoveda ? `${id}-napoveda` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-linda-espresso">
        {label}
        {required && ' *'}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        aria-required={required || undefined}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={chyba ? true : undefined}
        aria-describedby={popsano || undefined}
        /* Prohlubeň místo rámečku – tvar sám říká „sem se píše“. */
        className="min-h-touch w-full rounded-xl bg-linda-sandLight px-4 text-sm text-linda-espresso shadow-neuInsetSm transition-shadow placeholder:text-linda-espresso/60 disabled:opacity-60"
      />
      {napoveda && !chyba && (
        <p id={`${id}-napoveda`} className="mt-1.5 text-[11px] text-linda-espresso/70">
          {napoveda}
        </p>
      )}
      {chyba && (
        <p id={`${id}-chyba`} role="alert" className="mt-1.5 text-[11px] font-medium text-red-800">
          {chyba}
        </p>
      )}
    </div>
  );
};

export const Volba: React.FC<{
  name: string;
  value: string;
  checked: boolean;
  onSelect: () => void;
  nadpis: React.ReactNode;
  popis: string;
  cena: React.ReactNode;
  disabled?: boolean;
}> = ({ name, value, checked, onSelect, nadpis, popis, cena, disabled }) => (
  <label
    className={`flex items-center justify-between gap-3 rounded-xl p-4 transition-all duration-200 ${
      disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
    } ${checked ? 'bg-linda-sandLight shadow-neuInsetSm' : 'bg-linda-cream shadow-neuSm hover:shadow-neu'}`}
  >
    <div className="flex items-center gap-3">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
        className="h-4 w-4 shrink-0 cursor-pointer accent-linda-cognac"
      />
      <div>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-linda-espresso">{nadpis}</span>
        <p className="text-[11px] text-linda-espresso/70">{popis}</p>
      </div>
    </div>
    <span className="shrink-0 text-xs font-semibold">{cena}</span>
  </label>
);

/** Hláška přes celou šířku – chyba odeslání, dovolená. */
export const Hlaska: React.FC<{ chyba?: boolean; children: React.ReactNode }> = ({ chyba, children }) => (
  <p
    role={chyba ? 'alert' : 'status'}
    className={`flex items-start gap-2 rounded-xl bg-linda-sandLight p-4 text-xs font-medium shadow-neuInsetSm ${
      chyba ? 'text-red-800' : 'text-linda-espresso'
    }`}
  >
    <AlertCircle
      className={`mt-px h-4 w-4 shrink-0 ${chyba ? '' : 'text-linda-cognac'}`}
      aria-hidden="true"
    />
    <span>{children}</span>
  </p>
);

/**
 * „Zpět" a „Pokračovat" pod formulářem kroku.
 *
 * Zpět je odkaz, ne `history.back()` – zákaznice mohla na krok přijít odkazem
 * ze shrnutí a „zpět" má vést na předchozí krok, ne zpátky na shrnutí.
 */
export const NavigaceKroku: React.FC<{
  zpetHref: string;
  zpetText: string;
  children?: React.ReactNode;
}> = ({ zpetHref, zpetText, children }) => (
  <div className="flex flex-col-reverse items-stretch gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
    <Link
      href={zpetHref}
      className="inline-flex min-h-touch cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-xs font-semibold text-linda-espresso/80 transition-colors duration-200 hover:text-linda-cognac"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {zpetText}
    </Link>
    {children}
  </div>
);

/** Hlavní tlačítko kroku – stejná tmavá výplň jako „Objednat a zaplatit". */
export const TRIDY_HLAVNIHO_TLACITKA =
  'flex min-h-touch cursor-pointer items-center justify-center gap-2 rounded-full bg-linda-cognac px-8 py-4 text-sm font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm disabled:cursor-not-allowed disabled:opacity-70';
