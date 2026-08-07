'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle, CreditCard, Loader2, MapPin, QrCode, Tag } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { poslatJson } from '@/lib/api-klient';
import { czkNaHalere, halereNaCzk, spocitatObjednavku } from '@/lib/penize';

/* ------------------------------------------------------------------ */
/* Stavební prvky pokladny – tvar nese stav, ne jen barva              */
/* ------------------------------------------------------------------ */

const KrokKarty: React.FC<{ cislo: number; nadpis: string; children: React.ReactNode }> = ({
  cislo,
  nadpis,
  children,
}) => (
  <section className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu sm:p-8">
    <h2 className="flex items-center gap-2 font-serif text-2xl text-linda-espresso">
      <span
        aria-hidden="true"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-linda-cognac font-sans text-xs font-bold text-white shadow-neuOnDark"
      >
        {cislo}
      </span>
      {nadpis}
    </h2>
    {children}
  </section>
);

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
      /* Prohlubeň místo rámečku – tvar sám říká „sem se píše“. */
      className="min-h-touch w-full rounded-xl bg-linda-sandLight px-4 text-xs text-linda-espresso shadow-neuInsetSm transition-shadow placeholder:text-linda-espresso/60 disabled:opacity-60"
    />
    {chyba && (
      <p id={`${id}-chyba`} role="alert" className="mt-1.5 text-[11px] font-medium text-red-800">
        {chyba}
      </p>
    )}
  </div>
);

const Volba: React.FC<{
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

/* ------------------------------------------------------------------ */

export interface MoznostDopravy {
  id: string;
  nazev: string;
  popis: string;
  cena: number;
  vyzadujeVydejniMisto: boolean;
}

interface Props {
  dopravy: MoznostDopravy[];
  prahDopravaZdarma: number | null;
  /** Předvyplnění pro přihlášenou zákaznici. */
  uzivatel: { email: string; jmeno: string | null } | null;
  objednavaniZablokovano: boolean;
  zpravaODovolene: string | null;
}

interface UplatnenySleva {
  kod: string;
  procentoSlevy: number;
}

interface UplatnenyPoukaz {
  kod: string;
  zustatek: number;
}

export function PokladnaFormular({
  dopravy,
  prahDopravaZdarma,
  uzivatel,
  objednavaniZablokovano,
  zpravaODovolene,
}: Props) {
  const router = useRouter();
  const { cart, totalCartValue, clearCart } = useCart();

  const [zpusobDopravy, setZpusobDopravy] = useState(dopravy[0]?.id ?? '');
  const [zpusobPlatby, setZpusobPlatby] = useState('bankovni_prevod');
  const [vydejniMisto, setVydejniMisto] = useState<{ id: string; nazev: string } | null>(null);
  /** Rozepsaný text pobočky – oddělený od potvrzené volby, ať jde psát plynule. */
  const [vydejniMistoText, setVydejniMistoText] = useState('');

  const [form, setForm] = useState({
    email: uzivatel?.email ?? '',
    dodaciJmenoPrijmeni: uzivatel?.jmeno ?? '',
    dodaciTelefon: '',
    dodaciUlice: '',
    dodaciMesto: '',
    dodaciPsc: '',
    poznamka: '',
    souhlasPodminky: false,
  });

  const [kodVstup, setKodVstup] = useState('');
  const [poukazVstup, setPoukazVstup] = useState('');
  const [sleva, setSleva] = useState<UplatnenySleva | null>(null);
  const [poukaz, setPoukaz] = useState<UplatnenyPoukaz | null>(null);
  const [overujeKod, setOverujeKod] = useState(false);

  const [odesila, setOdesila] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [chybyPoli, setChybyPoli] = useState<Record<string, string>>({});

  const vybranaDoprava = dopravy.find((d) => d.id === zpusobDopravy) ?? null;

  /** Rozpis počítáme v haléřích – stejnou logikou jako server (sekce 6.11). */
  const rozpis = useMemo(() => {
    const polozky = cart.map((p) => ({
      cenaZaKus: czkNaHalere(p.cenaPoSleve ?? p.cena),
      mnozstvi: p.mnozstvi,
    }));

    const bezDopravy = spocitatObjednavku({ polozky, procentoSlevy: sleva?.procentoSlevy ?? 0 });

    const zdarma =
      prahDopravaZdarma !== null &&
      halereNaCzk(bezDopravy.mezisoucet - bezDopravy.sleva) >= prahDopravaZdarma;

    return spocitatObjednavku({
      polozky,
      procentoSlevy: sleva?.procentoSlevy ?? 0,
      doprava: zdarma ? 0 : czkNaHalere(vybranaDoprava?.cena ?? 0),
      zustatekPoukazu: poukaz ? czkNaHalere(poukaz.zustatek) : 0,
    });
  }, [cart, sleva, poukaz, vybranaDoprava, prahDopravaZdarma]);

  const dopravaZdarma = rozpis.doprava === 0 && (vybranaDoprava?.cena ?? 0) > 0;

  const overitKod = async (typ: 'slevovy-kod' | 'darkovy-poukaz') => {
    const kod = typ === 'slevovy-kod' ? kodVstup : poukazVstup;
    if (!kod.trim() || overujeKod) return;

    setOverujeKod(true);
    setChybyPoli((p) => ({ ...p, slevovyKod: '', darkovyPoukaz: '' }));

    const vysledek = await poslatJson<{ procentoSlevy?: number; zustatek?: number; kod: string }>(
      '/api/pokladna/overit-kod',
      { typ, kod }
    );

    if (vysledek.ok) {
      if (typ === 'slevovy-kod') {
        setSleva({ kod: vysledek.data.kod, procentoSlevy: vysledek.data.procentoSlevy ?? 0 });
        setKodVstup('');
      } else {
        setPoukaz({ kod: vysledek.data.kod, zustatek: vysledek.data.zustatek ?? 0 });
        setPoukazVstup('');
      }
    } else {
      setChybyPoli((p) => ({ ...p, ...(vysledek.pole ?? {}) }));
    }

    setOverujeKod(false);
  };

  const odeslat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (odesila) return;

    if (!form.souhlasPodminky) {
      setChybyPoli({ souhlasPodminky: 'Pro dokončení objednávky je nutné souhlasit s obchodními podmínkami.' });
      return;
    }

    if (vybranaDoprava?.vyzadujeVydejniMisto && !vydejniMisto) {
      setChybyPoli({ vydejniMistoId: 'Vyberte prosím výdejní místo.' });
      return;
    }

    setOdesila(true);
    setChyba(null);
    setChybyPoli({});

    const vysledek = await poslatJson<{ cisloObjednavky: string }>('/api/objednavky', {
      polozky: cart.map((p) => ({ variantId: p.variantId, mnozstvi: p.mnozstvi })),
      email: form.email,
      dodaciJmenoPrijmeni: form.dodaciJmenoPrijmeni,
      dodaciUlice: form.dodaciUlice,
      dodaciMesto: form.dodaciMesto,
      dodaciPsc: form.dodaciPsc,
      dodaciZeme: 'CZ',
      dodaciTelefon: form.dodaciTelefon || null,
      zpusobDopravy,
      vydejniMistoId: vydejniMisto?.id ?? null,
      vydejniMistoNazev: vydejniMisto?.nazev ?? null,
      zpusobPlatby,
      slevovyKod: sleva?.kod ?? null,
      darkovyPoukaz: poukaz?.kod ?? null,
      poznamka: form.poznamka || null,
      souhlasPodminky: form.souhlasPodminky,
    });

    if (!vysledek.ok) {
      setChyba(vysledek.chyba);
      setChybyPoli(vysledek.pole ?? {});
      setOdesila(false);
      return;
    }

    clearCart();
    router.push(`/pokladna/potvrzeni?cislo=${encodeURIComponent(vysledek.data.cisloObjednavky)}`);
  };

  if (cart.length === 0) {
    return (
      <div className="space-y-4 rounded-2xl bg-linda-cream p-10 text-center shadow-neu">
        <h2 className="font-serif text-2xl text-linda-espresso">Košík je prázdný</h2>
        <p className="text-xs text-linda-espresso/75">Nejdřív si vyberte nějaký kousek z kolekce.</p>
        <Link
          href="/produkty"
          className="inline-flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
        >
          Zobrazit kolekci
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={odeslat} className="grid grid-cols-1 gap-10 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-7">
        {zpravaODovolene && (
          <p
            role="status"
            className="flex items-start gap-2 rounded-xl bg-linda-sandLight p-4 text-xs font-medium text-linda-espresso shadow-neuInsetSm"
          >
            <AlertCircle className="mt-px h-4 w-4 shrink-0 text-linda-cognac" aria-hidden="true" />
            {zpravaODovolene}
          </p>
        )}

        {chyba && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl bg-linda-sandLight p-4 text-xs font-medium text-red-800 shadow-neuInsetSm"
          >
            <AlertCircle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
            {chyba}
          </p>
        )}

        <KrokKarty cislo={1} nadpis="Kontaktní údaje">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Pole
              id="pokladna-email"
              label="E-mail"
              type="email"
              required
              autoComplete="email"
              placeholder="vas.email@example.cz"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
              disabled={odesila}
              chyba={chybyPoli.email}
            />
            <Pole
              id="pokladna-telefon"
              label="Telefon"
              type="tel"
              autoComplete="tel"
              placeholder="+420 777 888 999"
              value={form.dodaciTelefon}
              onChange={(v) => setForm({ ...form, dodaciTelefon: v })}
              disabled={odesila}
              chyba={chybyPoli.dodaciTelefon}
            />
          </div>

          {!uzivatel && (
            <p className="text-[11px] text-linda-espresso/70">
              Objednávat můžete i bez registrace. Účet si můžete založit až po objednávce.
            </p>
          )}
        </KrokKarty>

        <KrokKarty cislo={2} nadpis="Doručovací adresa">
          <div className="space-y-4">
            <Pole
              id="pokladna-jmeno"
              label="Jméno a příjmení"
              required
              autoComplete="name"
              placeholder="Marie Nováková"
              value={form.dodaciJmenoPrijmeni}
              onChange={(v) => setForm({ ...form, dodaciJmenoPrijmeni: v })}
              disabled={odesila}
              chyba={chybyPoli.dodaciJmenoPrijmeni}
            />
            <Pole
              id="pokladna-ulice"
              label="Ulice a číslo popisné"
              required
              autoComplete="street-address"
              placeholder="Vodičkova 45"
              value={form.dodaciUlice}
              onChange={(v) => setForm({ ...form, dodaciUlice: v })}
              disabled={odesila}
              chyba={chybyPoli.dodaciUlice}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Pole
                id="pokladna-mesto"
                label="Město"
                required
                autoComplete="address-level2"
                placeholder="Praha 1"
                value={form.dodaciMesto}
                onChange={(v) => setForm({ ...form, dodaciMesto: v })}
                disabled={odesila}
                chyba={chybyPoli.dodaciMesto}
              />
              <Pole
                id="pokladna-psc"
                label="PSČ"
                required
                autoComplete="postal-code"
                placeholder="110 00"
                value={form.dodaciPsc}
                onChange={(v) => setForm({ ...form, dodaciPsc: v })}
                disabled={odesila}
                chyba={chybyPoli.dodaciPsc}
              />
            </div>
          </div>
        </KrokKarty>

        <KrokKarty cislo={3} nadpis="Doprava">
          {dopravy.length === 0 ? (
            <p className="rounded-xl bg-linda-sandLight p-4 text-xs text-linda-espresso/85 shadow-neuInsetSm">
              Momentálně nemáme nastavený žádný způsob dopravy. Napište nám prosím a domluvíme se.
            </p>
          ) : (
            <div className="space-y-3">
              {dopravy.map((d) => (
                <Volba
                  key={d.id}
                  name="doprava"
                  value={d.id}
                  checked={zpusobDopravy === d.id}
                  onSelect={() => {
                    setZpusobDopravy(d.id);
                    if (!d.vyzadujeVydejniMisto) setVydejniMisto(null);
                  }}
                  disabled={odesila}
                  nadpis={d.nazev}
                  popis={d.popis}
                  cena={
                    dopravaZdarma ? (
                      <span className="text-linda-sage">Zdarma</span>
                    ) : (
                      `${d.cena.toLocaleString('cs-CZ')} Kč`
                    )
                  }
                />
              ))}

              {vybranaDoprava?.vyzadujeVydejniMisto && (
                <div className="space-y-2 rounded-xl bg-linda-sandLight p-4 shadow-neuInsetSm">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-linda-espresso">
                    <MapPin className="h-3.5 w-3.5 text-linda-cognac" aria-hidden="true" />
                    Výdejní místo
                  </p>

                  {vydejniMisto ? (
                    <p className="flex items-center justify-between gap-2 text-xs text-linda-espresso/85">
                      {vydejniMisto.nazev}
                      <button
                        type="button"
                        onClick={() => setVydejniMisto(null)}
                        className="min-h-touch cursor-pointer text-[11px] font-semibold text-linda-cognac underline"
                      >
                        Změnit
                      </button>
                    </p>
                  ) : (
                    <>
                      {/* Widget Zásilkovny se zapojí, až budou API klíče (sekce 8).
                          Do té doby zadá zákaznice pobočku ručně, ať objednávka projde. */}
                      <Pole
                        id="pokladna-vydejni-misto"
                        label="Název pobočky nebo Z-BOXu"
                        placeholder="Např. Praha 1, Vodičkova 45"
                        value={vydejniMistoText}
                        onChange={(v) => {
                          setVydejniMistoText(v);
                          setVydejniMisto(v.trim() ? { id: v.trim(), nazev: v.trim() } : null);
                        }}
                        disabled={odesila}
                        chyba={chybyPoli.vydejniMistoId}
                      />
                      <p className="text-[10px] text-linda-espresso/70">
                        Výběr z mapy doplníme, jakmile napojíme Zásilkovnu.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </KrokKarty>

        <KrokKarty cislo={4} nadpis="Platba">
          <div className="space-y-3">
            <Volba
              name="platba"
              value="bankovni_prevod"
              checked={zpusobPlatby === 'bankovni_prevod'}
              onSelect={() => setZpusobPlatby('bankovni_prevod')}
              disabled={odesila}
              nadpis={
                <>
                  <QrCode className="h-3.5 w-3.5 text-linda-cognac" aria-hidden="true" />
                  Bankovní převod
                </>
              }
              popis="Údaje k platbě i QR kód dostanete hned po odeslání objednávky."
              cena={<span className="text-linda-sage">Zdarma</span>}
            />

            {/* GoPay se zpřístupní, až budou v .env klíče (sekce 8). */}
            <Volba
              name="platba"
              value="gopay"
              checked={false}
              onSelect={() => undefined}
              disabled
              nadpis={
                <>
                  <CreditCard className="h-3.5 w-3.5 text-linda-cognac" aria-hidden="true" />
                  Platba kartou
                </>
              }
              popis="Připravujeme – zatím prosím využijte bankovní převod."
              cena="—"
            />
          </div>

          <Pole
            id="pokladna-poznamka"
            label="Poznámka k objednávce"
            placeholder="Např. přání k dárku nebo prosba o dárkové balení"
            value={form.poznamka}
            onChange={(v) => setForm({ ...form, poznamka: v })}
            disabled={odesila}
          />
        </KrokKarty>
      </div>

      {/* Souhrn */}
      <aside className="lg:col-span-5">
        <div className="sticky top-24 space-y-5 rounded-2xl bg-linda-cream p-6 shadow-neu">
          <h2 className="font-serif text-2xl text-linda-espresso">Souhrn objednávky</h2>

          <ul className="space-y-3">
            {cart.map((p) => (
              <li key={p.variantId} className="flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-linda-sandLight shadow-neuInsetSm">
                  {p.obrazekUrl && (
                    <Image src={p.obrazekUrl} alt="" fill sizes="56px" className="object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-linda-espresso">{p.nazev}</p>
                  <p className="text-[11px] text-linda-espresso/70">
                    {p.velikost} · {p.mnozstvi} ks
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-linda-espresso">
                  {((p.cenaPoSleve ?? p.cena) * p.mnozstvi).toLocaleString('cs-CZ')} Kč
                </span>
              </li>
            ))}
          </ul>

          {/* Slevový kód a poukaz */}
          <div className="space-y-3 border-t border-linda-sand/60 pt-4">
            {sleva ? (
              <p className="flex items-center justify-between gap-2 rounded-xl bg-linda-sageLight p-3 text-xs font-medium text-linda-sage">
                <span className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                  Kód {sleva.kod} · −{sleva.procentoSlevy} %
                </span>
                <button
                  type="button"
                  onClick={() => setSleva(null)}
                  className="min-h-touch cursor-pointer underline"
                >
                  Odebrat
                </button>
              </p>
            ) : (
              <div className="flex gap-2">
                <input
                  aria-label="Slevový kód"
                  value={kodVstup}
                  onChange={(e) => setKodVstup(e.target.value)}
                  placeholder="Slevový kód"
                  disabled={odesila}
                  className="min-h-touch flex-1 rounded-xl bg-linda-sandLight px-4 text-xs uppercase text-linda-espresso shadow-neuInsetSm placeholder:normal-case placeholder:text-linda-espresso/60"
                />
                <button
                  type="button"
                  onClick={() => void overitKod('slevovy-kod')}
                  disabled={overujeKod || odesila}
                  className="min-h-touch cursor-pointer rounded-xl bg-linda-cream px-4 text-xs font-semibold text-linda-cognac shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm disabled:opacity-60"
                >
                  Uplatnit
                </button>
              </div>
            )}
            {chybyPoli.slevovyKod && (
              <p role="alert" className="text-[11px] font-medium text-red-800">
                {chybyPoli.slevovyKod}
              </p>
            )}

            {poukaz ? (
              <p className="flex items-center justify-between gap-2 rounded-xl bg-linda-sageLight p-3 text-xs font-medium text-linda-sage">
                <span>Poukaz {poukaz.kod}</span>
                <button
                  type="button"
                  onClick={() => setPoukaz(null)}
                  className="min-h-touch cursor-pointer underline"
                >
                  Odebrat
                </button>
              </p>
            ) : (
              <div className="flex gap-2">
                <input
                  aria-label="Dárkový poukaz"
                  value={poukazVstup}
                  onChange={(e) => setPoukazVstup(e.target.value)}
                  placeholder="Dárkový poukaz"
                  disabled={odesila}
                  className="min-h-touch flex-1 rounded-xl bg-linda-sandLight px-4 text-xs uppercase text-linda-espresso shadow-neuInsetSm placeholder:normal-case placeholder:text-linda-espresso/60"
                />
                <button
                  type="button"
                  onClick={() => void overitKod('darkovy-poukaz')}
                  disabled={overujeKod || odesila}
                  className="min-h-touch cursor-pointer rounded-xl bg-linda-cream px-4 text-xs font-semibold text-linda-cognac shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm disabled:opacity-60"
                >
                  Uplatnit
                </button>
              </div>
            )}
            {chybyPoli.darkovyPoukaz && (
              <p role="alert" className="text-[11px] font-medium text-red-800">
                {chybyPoli.darkovyPoukaz}
              </p>
            )}
          </div>

          {/* Rozpis */}
          <dl className="space-y-2 border-t border-linda-sand/60 pt-4 text-xs">
            <div className="flex justify-between">
              <dt className="text-linda-espresso/75">Mezisoučet</dt>
              <dd className="text-linda-espresso">{halereNaCzk(rozpis.mezisoucet).toLocaleString('cs-CZ')} Kč</dd>
            </div>

            {rozpis.sleva > 0 && (
              <div className="flex justify-between text-linda-sage">
                <dt>Sleva</dt>
                <dd>−{halereNaCzk(rozpis.sleva).toLocaleString('cs-CZ')} Kč</dd>
              </div>
            )}

            <div className="flex justify-between">
              <dt className="text-linda-espresso/75">Doprava</dt>
              <dd className={dopravaZdarma ? 'text-linda-sage' : 'text-linda-espresso'}>
                {rozpis.doprava === 0 ? 'Zdarma' : `${halereNaCzk(rozpis.doprava).toLocaleString('cs-CZ')} Kč`}
              </dd>
            </div>

            {rozpis.zPoukazu > 0 && (
              <div className="flex justify-between text-linda-sage">
                <dt>Uhrazeno poukazem</dt>
                <dd>−{halereNaCzk(rozpis.zPoukazu).toLocaleString('cs-CZ')} Kč</dd>
              </div>
            )}

            <div className="flex justify-between border-t border-linda-sand/60 pt-2 text-base font-semibold text-linda-espresso">
              <dt>K úhradě</dt>
              <dd>{halereNaCzk(rozpis.kUhrade).toLocaleString('cs-CZ')} Kč</dd>
            </div>
          </dl>

          {prahDopravaZdarma !== null && !dopravaZdarma && (
            <p className="rounded-xl bg-linda-sandLight p-3 text-[11px] text-linda-espresso/75 shadow-neuInsetSm">
              Do dopravy zdarma zbývá{' '}
              <strong>
                {(prahDopravaZdarma - halereNaCzk(rozpis.mezisoucet - rozpis.sleva)).toLocaleString('cs-CZ')} Kč
              </strong>
              .
            </p>
          )}

          {/* Souhlasy */}
          <div className="space-y-2 border-t border-linda-sand/60 pt-4">
            <label className="flex cursor-pointer items-start gap-2.5 text-xs">
              <input
                type="checkbox"
                required
                checked={form.souhlasPodminky}
                disabled={odesila}
                onChange={(e) => {
                  setForm({ ...form, souhlasPodminky: e.target.checked });
                  if (e.target.checked) setChybyPoli((p) => ({ ...p, souhlasPodminky: '' }));
                }}
                aria-invalid={chybyPoli.souhlasPodminky ? true : undefined}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-linda-cognac"
              />
              <span className="text-linda-espresso/85">
                Souhlasím s{' '}
                <Link href="/obchodni-podminky" target="_blank" className="font-semibold text-linda-cognac underline">
                  obchodními podmínkami
                </Link>{' '}
                a beru na vědomí{' '}
                <Link
                  href="/ochrana-osobnich-udaju"
                  target="_blank"
                  className="font-semibold text-linda-cognac underline"
                >
                  poučení o zpracování údajů
                </Link>
                . *
              </span>
            </label>

            {chybyPoli.souhlasPodminky && (
              <p role="alert" className="flex items-center gap-1.5 text-[11px] font-medium text-red-800">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {chybyPoli.souhlasPodminky}
              </p>
            )}

            <p className="text-[10px] leading-relaxed text-linda-espresso/70">
              Objednávka zavazuje k zaplacení. Od smlouvy můžete odstoupit do 14 dnů bez udání důvodu –
              podrobnosti a formulář najdete v obchodních podmínkách.
            </p>
          </div>

          <button
            type="submit"
            disabled={odesila || objednavaniZablokovano || dopravy.length === 0}
            aria-busy={odesila}
            className="flex min-h-touch w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-linda-cognac py-4 text-sm font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm disabled:cursor-not-allowed disabled:opacity-70"
          >
            {odesila ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Odesílám objednávku…
              </>
            ) : objednavaniZablokovano ? (
              'Objednávky jsou pozastavené'
            ) : (
              <>
                <CheckCircle className="h-4 w-4" aria-hidden="true" />
                Objednat závazně
              </>
            )}
          </button>
        </div>
      </aside>
    </form>
  );
}
