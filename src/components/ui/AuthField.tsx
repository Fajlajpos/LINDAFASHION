import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface AuthFieldProps {
  id: string;
  label: string;
  /** Ikona v levé části pole – jen dekorace, popisek nese `label`. */
  Ikona: LucideIcon;
  value: string;
  onChange: (hodnota: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  disabled?: boolean;
  /** Chybová hláška ze serveru pro tohle konkrétní pole. */
  chyba?: string;
  /** Volitelný odkaz vpravo v řádku popisku („Zapomněli jste heslo?“). */
  akce?: React.ReactNode;
}

/**
 * Pole přihlašovacích formulářů.
 *
 * Přihlášení i registrace měly stejné pole opsané pětkrát a `<label>` v nich
 * stál vedle inputu bez `htmlFor` – odečítač obrazovky ho tak nepřečetl
 * a kliknutí na popisek pole nezaostřilo. Tady je vazba jednou a správně.
 *
 * Vzhledově je pole prohlubeň v krémové kartě: tvar sám říká „sem se píše“,
 * takže rámeček odpadá. Prstenec fokusu řeší globální `:focus-visible`
 * v `globals.css` a inset stín přebije.
 */
export const AuthField: React.FC<AuthFieldProps> = ({
  id,
  label,
  Ikona,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
  required,
  minLength,
  disabled,
  chyba,
  akce,
}) => (
  <div>
    <div className="mb-1 flex items-center justify-between gap-2">
      <label htmlFor={id} className="block text-xs font-semibold text-linda-espresso">
        {label}
      </label>
      {akce}
    </div>

    <div className="relative">
      <input
        id={id}
        type={type}
        required={required}
        minLength={minLength}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={chyba ? true : undefined}
        aria-describedby={chyba ? `${id}-chyba` : undefined}
        className="min-h-touch w-full rounded-xl bg-linda-sandLight py-2.5 pl-10 pr-4 text-xs text-linda-espresso shadow-neuInsetSm transition-shadow placeholder:text-linda-espresso/60 disabled:cursor-not-allowed disabled:opacity-60"
      />
      <Ikona
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-linda-cognac"
        aria-hidden="true"
      />
    </div>

    {chyba && (
      <p id={`${id}-chyba`} role="alert" className="mt-1.5 text-[11px] font-medium text-red-800">
        {chyba}
      </p>
    )}
  </div>
);
