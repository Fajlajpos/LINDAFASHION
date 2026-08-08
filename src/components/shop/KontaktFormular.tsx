'use client';

import React, { useState } from 'react';
import { AlertCircle, Loader2, Send } from 'lucide-react';
import { poslatJson } from '@/lib/api-klient';

/**
 * Kontaktní formulář.
 *
 * Dřív jen přepnul stav na „odesláno" a zprávu zahodil. Teď ji `POST /api/kontakt`
 * uloží do databáze a zařadí notifikaci majitelce – zpráva se tedy neztratí ani
 * dokud nejsou SMTP přístupy.
 */
export function KontaktFormular() {
  const [form, setForm] = useState({ jmeno: '', email: '', predmet: '', zprava: '' });
  const [odesila, setOdesila] = useState(false);
  const [hotovo, setHotovo] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [chybyPoli, setChybyPoli] = useState<Record<string, string>>({});

  const odeslat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (odesila) return;

    setOdesila(true);
    setChyba(null);
    setChybyPoli({});

    const vysledek = await poslatJson<{ zprava: string }>('/api/kontakt', {
      jmeno: form.jmeno,
      email: form.email,
      predmet: form.predmet || undefined,
      zprava: form.zprava,
    });

    if (vysledek.ok) {
      setHotovo(true);
    } else {
      setChyba(vysledek.chyba);
      setChybyPoli(vysledek.pole ?? {});
    }

    setOdesila(false);
  };

  if (hotovo) {
    return (
      <div
        role="status"
        className="space-y-2 rounded-2xl bg-linda-sageLight p-6 text-center text-xs text-linda-espresso shadow-neuInset"
      >
        <p className="font-serif text-xl text-linda-sage">Děkujeme za vaši zprávu!</p>
        <p className="text-linda-espresso/75">Odpovíme vám v nejkratším možném čase na váš e-mail.</p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void odeslat(e)} className="space-y-4">
      {chyba && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-linda-sandLight p-3 text-xs font-medium text-red-800 shadow-neuInsetSm"
        >
          <AlertCircle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
          {chyba}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Popisky jsou svázané přes `htmlFor`/`id` – dřív stály vedle polí
            bez vazby, takže je odečítač nepřečetl. */}
        <Pole
          id="kontakt-jmeno"
          label="Vaše jméno"
          required
          autoComplete="name"
          placeholder="Marie Nováková"
          value={form.jmeno}
          onChange={(v) => setForm({ ...form, jmeno: v })}
          disabled={odesila}
          chyba={chybyPoli.jmeno}
        />

        <Pole
          id="kontakt-email"
          label="Váš e-mail"
          type="email"
          required
          autoComplete="email"
          placeholder="vas.email@example.cz"
          value={form.email}
          onChange={(v) => setForm({ ...form, email: v })}
          disabled={odesila}
          chyba={chybyPoli.email}
        />
      </div>

      <Pole
        id="kontakt-predmet"
        label="Předmět"
        placeholder="Např. dotaz k velikosti"
        value={form.predmet}
        onChange={(v) => setForm({ ...form, predmet: v })}
        disabled={odesila}
        chyba={chybyPoli.predmet}
      />

      <div>
        <label htmlFor="kontakt-zprava" className="mb-1 block text-xs font-semibold text-linda-espresso">
          Zpráva *
        </label>
        <textarea
          id="kontakt-zprava"
          required
          rows={5}
          value={form.zprava}
          onChange={(e) => setForm({ ...form, zprava: e.target.value })}
          placeholder="S čím vám můžeme pomoci?"
          disabled={odesila}
          aria-invalid={chybyPoli.zprava ? true : undefined}
          aria-describedby={chybyPoli.zprava ? 'kontakt-zprava-chyba' : undefined}
          className="w-full rounded-xl bg-linda-sandLight px-4 py-2.5 text-xs text-linda-espresso shadow-neuInsetSm transition-shadow placeholder:text-linda-espresso/60 disabled:opacity-60"
        />
        {chybyPoli.zprava && (
          <p id="kontakt-zprava-chyba" role="alert" className="mt-1.5 text-[11px] font-medium text-red-800">
            {chybyPoli.zprava}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={odesila}
        aria-busy={odesila}
        className="flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-linda-cognac px-8 text-xs font-semibold uppercase tracking-wider text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm disabled:cursor-not-allowed disabled:opacity-70"
      >
        {odesila ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Odesílám…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" aria-hidden="true" />
            Odeslat zprávu
          </>
        )}
      </button>
    </form>
  );
}

const Pole: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
  chyba?: string;
}> = ({ id, label, value, onChange, type = 'text', placeholder, autoComplete, required, disabled, chyba }) => (
  <div>
    <label htmlFor={id} className="mb-1 block text-xs font-semibold text-linda-espresso">
      {label}
      {required && ' *'}
    </label>
    <input
      id={id}
      type={type}
      required={required}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      aria-invalid={chyba ? true : undefined}
      aria-describedby={chyba ? `${id}-chyba` : undefined}
      className="min-h-touch w-full rounded-xl bg-linda-sandLight px-4 text-xs text-linda-espresso shadow-neuInsetSm transition-shadow placeholder:text-linda-espresso/60 disabled:opacity-60"
    />
    {chyba && (
      <p id={`${id}-chyba`} role="alert" className="mt-1.5 text-[11px] font-medium text-red-800">
        {chyba}
      </p>
    )}
  </div>
);
