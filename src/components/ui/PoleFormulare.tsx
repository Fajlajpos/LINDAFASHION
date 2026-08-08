'use client';

import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Pole formulářů v zákaznickém účtu.
 *
 * `AuthField` vedle toho zůstává pro přihlášení a registraci – ten má ikonu
 * povinnou, protože tam je jich jen pár a nesou význam. Tady by ikona
 * u deseti polí za sebou byla jen šum, takže je nepovinná.
 *
 * Vzhledově je pole prohlubeň v krémové kartě: tvar sám říká „sem se píše“,
 * takže rámeček odpadá. Prstenec fokusu řeší globální `:focus-visible`
 * v `globals.css` a inset stín přebije – to je záměr, prstenec musí vyhrát.
 */

interface SpolecneProps {
  id: string;
  label: string;
  /** Chybová hláška ze serveru pro tohle konkrétní pole. */
  chyba?: string;
  /** Vysvětlení pod polem tam, kde není zřejmé, co se čeká. */
  napoveda?: string;
  required?: boolean;
  disabled?: boolean;
}

function Obal({
  id,
  label,
  chyba,
  napoveda,
  required,
  children,
}: SpolecneProps & { children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-linda-espresso">
        {label}
        {!required && <span className="ml-1 font-normal text-linda-espresso/60">(nepovinné)</span>}
      </label>

      {children}

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
}

const TRIDY_VSTUPU =
  'w-full rounded-xl bg-linda-sandLight px-4 text-xs text-linda-espresso shadow-neuInsetSm transition-shadow placeholder:text-linda-espresso/60 disabled:cursor-not-allowed disabled:opacity-60';

export interface PoleFormulareProps extends SpolecneProps {
  value: string;
  onChange: (hodnota: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: 'text' | 'tel' | 'email' | 'numeric';
  maxLength?: number;
}

export const PoleFormulare: React.FC<PoleFormulareProps> = ({
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
  inputMode,
  maxLength,
  ...spolecne
}) => (
  <Obal {...spolecne}>
    <input
      id={spolecne.id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      inputMode={inputMode}
      maxLength={maxLength}
      required={spolecne.required}
      disabled={spolecne.disabled}
      aria-invalid={spolecne.chyba ? true : undefined}
      aria-describedby={
        spolecne.chyba
          ? `${spolecne.id}-chyba`
          : spolecne.napoveda
            ? `${spolecne.id}-napoveda`
            : undefined
      }
      className={`min-h-touch py-2.5 ${TRIDY_VSTUPU}`}
    />
  </Obal>
);

export interface OblastFormulareProps extends SpolecneProps {
  value: string;
  onChange: (hodnota: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}

export const OblastFormulare: React.FC<OblastFormulareProps> = ({
  value,
  onChange,
  placeholder,
  rows = 4,
  maxLength,
  ...spolecne
}) => (
  <Obal {...spolecne}>
    <textarea
      id={spolecne.id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      maxLength={maxLength}
      required={spolecne.required}
      disabled={spolecne.disabled}
      aria-invalid={spolecne.chyba ? true : undefined}
      aria-describedby={
        spolecne.chyba
          ? `${spolecne.id}-chyba`
          : spolecne.napoveda
            ? `${spolecne.id}-napoveda`
            : undefined
      }
      className={`resize-y py-3 ${TRIDY_VSTUPU}`}
    />
  </Obal>
);

/**
 * Oznámení nad formulářem.
 *
 * Chyba je zapuštěná (`sandLight` + inset) – patří k obsahu karty, ne nad ni.
 * Úspěch dostává světle olivovou plochu bez reliéfu: je dočasný, nemá si
 * v hierarchii ploch nárokovat vlastní úroveň.
 */
export function Hlaska({ druh, children }: { druh: 'chyba' | 'uspech'; children: React.ReactNode }) {
  const jeChyba = druh === 'chyba';
  const Ikona = jeChyba ? AlertCircle : CheckCircle;

  return (
    <p
      role={jeChyba ? 'alert' : 'status'}
      className={`flex animate-fadeIn items-start gap-2 rounded-xl p-3 text-xs font-medium ${
        jeChyba
          ? 'bg-linda-sandLight text-red-800 shadow-neuInsetSm'
          : 'bg-linda-sageLight text-linda-sage'
      }`}
    >
      <Ikona className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}
