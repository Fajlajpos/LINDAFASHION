'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle, Loader2, Pencil, RefreshCw } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { udajeProServer, usePokladna, useStrazceKroku } from '@/lib/pokladna-kontext';
import { usePrilepenyPanel } from '@/lib/prilepeny-panel';
import { poslatJson } from '@/lib/api-klient';
import { halereNaCzk, type RozpisObjednavky } from '@/lib/penize';
import { nacistKody } from '@/lib/ulozene-kody';
import { NAZEV_PLATBY } from '@/lib/objednavka-popisky';
import { Hlaska, NavigaceKroku } from './prvky';
import { NacitaniKroku } from './NacitaniKroku';

/** Odpověď `/api/pokladna/nahled` – viz `NahledObjednavky` v objednavka.ts. */
interface Nahled {
  polozky: Array<{
    variantId: string;
    mnozstvi: number;
    cenaHaleru: number;
    nazev: string;
    velikost: string;
    barva: string | null;
  }>;
  procentoSlevy: number;
  rozpis: RozpisObjednavky;
}

const kc = (halere: number) => `${halereNaCzk(halere).toLocaleString('cs-CZ')} Kč`;

/** Ve kterém kroku se které pole opravuje – chyba ze serveru odkáže tam. */
const KROK_POLE: Record<string, { href: string; text: string }> = {
  email: { href: '/pokladna', text: 'Upravit údaje' },
  dodaciJmenoPrijmeni: { href: '/pokladna', text: 'Upravit údaje' },
  dodaciUlice: { href: '/pokladna', text: 'Upravit údaje' },
  dodaciMesto: { href: '/pokladna', text: 'Upravit údaje' },
  dodaciPsc: { href: '/pokladna', text: 'Upravit údaje' },
  dodaciTelefon: { href: '/pokladna', text: 'Upravit údaje' },
  poznamka: { href: '/pokladna', text: 'Upravit údaje' },
  zpusobDopravy: { href: '/pokladna/doprava', text: 'Změnit dopravu' },
  vydejniMistoId: { href: '/pokladna/doprava', text: 'Změnit dopravu' },
  zpusobPlatby: { href: '/pokladna/doprava', text: 'Změnit platbu' },
  slevovyKod: { href: '/kosik', text: 'Upravit v košíku' },
  darkovyPoukaz: { href: '/kosik', text: 'Upravit v košíku' },
};

interface ChybaShrnuti {
  zprava: string;
  pole?: Record<string, string>;
}

/**
 * Krok 4 – shrnutí a odeslání objednávky.
 *
 * Tohle je obrazovka, kterou zákon předepisuje: bezprostředně před odesláním
 * musí zákaznice jasně vidět, co kupuje, za kolik celkem včetně dopravy a jak
 * (§ 1826a odst. 1 o. z.), a musí mít možnost chyby v zadání opravit (§ 1826
 * odst. 1 písm. c) – proto u každé části odkaz „Upravit" do příslušného kroku.
 *
 * Částku počítá server stejnou funkcí, kterou ji pak účtuje, a objednávka se
 * odesílá i s ní (`ocekavanaCena`). Když se mezitím změní, server objednávku
 * nezaloží a shrnutí se načte znovu – zákaznice tak nikdy nepotvrdí jinou
 * cenu, než jakou zaplatí.
 */
export function KrokShrnuti() {
  const router = useRouter();
  const pripraveno = useStrazceKroku(4);
  const { cart, clearCart } = useCart();
  const { data, koncept, vybranaDoprava, dokonceno, oznacitDokonceno } = usePokladna();
  const panel = usePrilepenyPanel<HTMLDivElement>();

  const [nahled, setNahled] = useState<Nahled | null>(null);
  const [nacitaNahled, setNacitaNahled] = useState(false);
  const [chybaNahledu, setChybaNahledu] = useState<ChybaShrnuti | null>(null);

  const [souhlas, setSouhlas] = useState(false);
  const [chybaSouhlasu, setChybaSouhlasu] = useState<string | null>(null);
  const [odesila, setOdesila] = useState(false);
  const [chyba, setChyba] = useState<ChybaShrnuti | null>(null);

  /** Co z košíku jde na server – klíč pro nové načtení náhledu. */
  const polozky = useMemo(
    () => cart.map((p) => ({ variantId: p.variantId, mnozstvi: p.mnozstvi })),
    [cart]
  );
  const klicPolozek = JSON.stringify(polozky);

  const nacistNahled = useCallback(async () => {
    const kody = nacistKody();

    setNacitaNahled(true);
    setChybaNahledu(null);

    const vysledek = await poslatJson<Nahled>('/api/pokladna/nahled', {
      polozky: JSON.parse(klicPolozek) as typeof polozky,
      zpusobDopravy: koncept.zpusobDopravy,
      slevovyKod: kody.sleva?.kod ?? null,
      darkovyPoukaz: kody.poukaz?.kod ?? null,
    });

    if (vysledek.ok) {
      setNahled(vysledek.data);
    } else {
      setNahled(null);
      setChybaNahledu({ zprava: vysledek.chyba, pole: vysledek.pole });
    }
    setNacitaNahled(false);
  }, [klicPolozek, koncept.zpusobDopravy]);

  useEffect(() => {
    if (!pripraveno || dokonceno || polozky.length === 0) return;
    void nacistNahled();
    // `polozky` se hlídá přes `klicPolozek` uvnitř `nacistNahled`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pripraveno, dokonceno, nacistNahled]);

  const odeslat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (odesila || !nahled) return;

    if (!souhlas) {
      setChybaSouhlasu('Pro dokončení objednávky je nutné souhlasit s obchodními podmínkami.');
      document.getElementById('souhlas-podminky')?.focus();
      return;
    }

    const kody = nacistKody();

    setOdesila(true);
    setChyba(null);

    const vysledek = await poslatJson<{
      cisloObjednavky: string;
      verejnyToken: string;
      /** Adresa platební brány – vyplněná jen u platby kartou. */
      platebniUrl: string | null;
    }>('/api/objednavky', {
      polozky,
      ...udajeProServer(koncept.udaje),
      dodaciZeme: 'CZ',
      zpusobDopravy: koncept.zpusobDopravy,
      vydejniMistoId: koncept.vydejniMisto?.id ?? null,
      vydejniMistoNazev: koncept.vydejniMisto?.nazev ?? null,
      zpusobPlatby: koncept.zpusobPlatby,
      slevovyKod: kody.sleva?.kod ?? null,
      darkovyPoukaz: kody.poukaz?.kod ?? null,
      souhlasPodminky: true,
      // Částka, kterou zákaznice právě vidí. Server ji porovná se svým výpočtem.
      ocekavanaCena: { celkemHaleru: nahled.rozpis.celkem, kUhradeHaleru: nahled.rozpis.kUhrade },
    });

    if (!vysledek.ok) {
      setOdesila(false);

      if (vysledek.pole?.ocekavanaCena) {
        // Cena se změnila – ukázat novou a nechat zákaznici potvrdit znovu.
        // Souhlas se zruší, aby tlačítko nešlo jen znovu odkliknout naslepo.
        setSouhlas(false);
        setChyba({ zprava: vysledek.pole.ocekavanaCena });
        void nacistNahled();
        return;
      }

      setChyba({ zprava: vysledek.chyba, pole: vysledek.pole });
      return;
    }

    /*
     * Nejdřív „dokončeno", pak teprve vyprázdnit košík – jinak by strážce
     * kroku na prázdný košík zareagoval přesměrováním do košíku a zákaznice
     * by na okamžik viděla „Košík je prázdný".
     */
    oznacitDokonceno();
    clearCart();

    /*
     * Platba kartou pokračuje v bráně. `window.location` schválně, ne
     * `router.push` – ten umí jen adresy uvnitř aplikace.
     *
     * Když se platbu nepodařilo založit (výpadek brány), `platebniUrl` je
     * null a objednávka existuje dál; zákaznice pokračuje na potvrzení
     * s údaji k převodu.
     */
    if (vysledek.data.platebniUrl) {
      window.location.assign(vysledek.data.platebniUrl);
      return;
    }

    // V odkazu je náhodný token, ne číslo objednávky – to jde po sobě.
    router.push(`/pokladna/potvrzeni?t=${encodeURIComponent(vysledek.data.verejnyToken)}`);
  };

  if (dokonceno) {
    return (
      <p role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-linda-espresso/80">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Dokončuji objednávku…
      </p>
    );
  }

  if (!pripraveno) return <NacitaniKroku popisek="Načítám shrnutí…" />;

  const obrazky = new Map(cart.map((p) => [p.variantId, p.obrazekUrl]));
  const { udaje } = koncept;
  const prodavajici = [
    data.prodavajici.nazev,
    data.prodavajici.ico && `IČO ${data.prodavajici.ico}`,
    data.prodavajici.adresa,
  ].filter(Boolean);

  const lzeObjednat = Boolean(nahled) && !nacitaNahled && !odesila && !data.objednavaniZablokovano;

  return (
    <form onSubmit={odeslat} noValidate className="grid grid-cols-1 gap-10 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-7">
        {data.zpravaODovolene && <Hlaska>{data.zpravaODovolene}</Hlaska>}

        {/* Zboží */}
        <Oddil nadpis="Zboží" upravit={{ href: '/kosik', text: 'Upravit košík' }}>
          {nahled ? (
            <ul className="divide-y divide-linda-sand/40">
              {nahled.polozky.map((p) => {
                const obrazek = obrazky.get(p.variantId);
                return (
                  <li key={p.variantId} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-linda-sandLight shadow-neuInsetSm">
                      {obrazek && <Image src={obrazek} alt="" fill sizes="64px" className="object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-sm font-medium text-linda-espresso">{p.nazev}</p>
                      <p className="text-[11px] text-linda-espresso/75">
                        Velikost {p.velikost}
                        {p.barva && ` · ${p.barva}`} · {p.mnozstvi} ks × {kc(p.cenaHaleru)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-linda-espresso">
                      {kc(p.cenaHaleru * p.mnozstvi)}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <StavNahledu nacita={nacitaNahled} chyba={chybaNahledu} znovu={() => void nacistNahled()} />
          )}
        </Oddil>

        {/* Kontakt a adresa */}
        <Oddil nadpis="Kontaktní údaje a adresa" upravit={{ href: '/pokladna', text: 'Upravit' }}>
          <dl className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="font-semibold text-linda-espresso">
                {koncept.vydejniMisto ? 'Adresa na doklad' : 'Doručovací adresa'}
              </dt>
              <dd className="text-linda-espresso/85">
                {udaje.dodaciJmenoPrijmeni}
                <br />
                {udaje.dodaciUlice}
                <br />
                {udaje.dodaciPsc} {udaje.dodaciMesto}
                <br />
                Česká republika
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="font-semibold text-linda-espresso">Kontakt</dt>
              <dd className="break-all text-linda-espresso/85">{udaje.email}</dd>
              {udaje.dodaciTelefon && <dd className="text-linda-espresso/85">{udaje.dodaciTelefon}</dd>}
            </div>
            {udaje.poznamka && (
              <div className="space-y-1 sm:col-span-2">
                <dt className="font-semibold text-linda-espresso">Poznámka</dt>
                <dd className="whitespace-pre-line text-linda-espresso/85">{udaje.poznamka}</dd>
              </div>
            )}
          </dl>
        </Oddil>

        {/* Doprava a platba */}
        <Oddil nadpis="Doprava a platba" upravit={{ href: '/pokladna/doprava', text: 'Změnit' }}>
          <dl className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="font-semibold text-linda-espresso">Doprava</dt>
              <dd className="text-linda-espresso/85">
                {vybranaDoprava?.nazev}
                {nahled && ` · ${nahled.rozpis.doprava === 0 ? 'zdarma' : kc(nahled.rozpis.doprava)}`}
              </dd>
              {koncept.vydejniMisto && (
                <dd className="text-linda-espresso/85">Výdejní místo: {koncept.vydejniMisto.nazev}</dd>
              )}
              <dd className="text-[11px] text-linda-espresso/70">{data.dodaciLhuta}</dd>
            </div>
            <div className="space-y-1">
              <dt className="font-semibold text-linda-espresso">Platba</dt>
              <dd className="text-linda-espresso/85">
                {NAZEV_PLATBY[koncept.zpusobPlatby] ?? koncept.zpusobPlatby}
              </dd>
              <dd className="text-[11px] text-linda-espresso/70">
                {koncept.zpusobPlatby === 'gopay'
                  ? 'Po odeslání vás přesměrujeme do zabezpečené platební brány.'
                  : 'Údaje k platbě i QR kód dostanete hned po odeslání.'}
              </dd>
            </div>
          </dl>
        </Oddil>

        <NavigaceKroku zpetHref="/pokladna/doprava" zpetText="Zpět na dopravu a platbu" />
      </div>

      {/* Cena, souhlas a tlačítko */}
      <aside aria-label="Cena a odeslání objednávky" className="lg:col-span-5">
        <div
          ref={panel.ref}
          style={{ top: panel.top }}
          className="space-y-5 rounded-2xl bg-linda-cream p-6 shadow-neuLg lg:sticky"
        >
          <h2 className="font-serif text-2xl text-linda-espresso">Cena objednávky</h2>

          {nahled ? (
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-linda-espresso/75">Zboží</dt>
                <dd className="text-linda-espresso">{kc(nahled.rozpis.mezisoucet)}</dd>
              </div>
              {nahled.rozpis.sleva > 0 && (
                <div className="flex justify-between text-linda-sage">
                  <dt>Sleva kódem ({nahled.procentoSlevy} %)</dt>
                  <dd>−{kc(nahled.rozpis.sleva)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-linda-espresso/75">Doprava – {vybranaDoprava?.nazev}</dt>
                <dd className={nahled.rozpis.doprava === 0 ? 'text-linda-sage' : 'text-linda-espresso'}>
                  {nahled.rozpis.doprava === 0 ? 'Zdarma' : kc(nahled.rozpis.doprava)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-linda-espresso/75">Platba – {NAZEV_PLATBY[koncept.zpusobPlatby]}</dt>
                <dd className="text-linda-sage">Zdarma</dd>
              </div>
              <div className="flex justify-between border-t border-linda-sand/60 pt-2 font-semibold text-linda-espresso">
                <dt>Celková cena</dt>
                <dd>{kc(nahled.rozpis.celkem)}</dd>
              </div>
              {nahled.rozpis.zPoukazu > 0 && (
                <div className="flex justify-between text-linda-sage">
                  <dt>Uhrazeno dárkovým poukazem</dt>
                  <dd>−{kc(nahled.rozpis.zPoukazu)}</dd>
                </div>
              )}
              {/* Nejdůležitější číslo obrazovky má vlastní prohlubeň. */}
              <div className="mt-3 flex items-baseline justify-between rounded-xl bg-linda-sandLight px-4 py-3 text-base font-semibold text-linda-espresso shadow-neuInsetSm">
                <dt>K úhradě</dt>
                <dd className="font-serif text-2xl text-linda-cognac">{kc(nahled.rozpis.kUhrade)}</dd>
              </div>
            </dl>
          ) : (
            <StavNahledu nacita={nacitaNahled} chyba={chybaNahledu} znovu={() => void nacistNahled()} />
          )}

          <p className="text-[11px] text-linda-espresso/70">{data.popisDph}</p>

          {chyba && <ChybaOdeslani chyba={chyba} />}

          {/* Souhlas */}
          <div className="space-y-2 border-t border-linda-sand/60 pt-4">
            <label className="flex cursor-pointer items-start gap-2.5 text-xs">
              <input
                id="souhlas-podminky"
                type="checkbox"
                checked={souhlas}
                disabled={odesila}
                aria-required="true"
                onChange={(e) => {
                  setSouhlas(e.target.checked);
                  if (e.target.checked) setChybaSouhlasu(null);
                }}
                aria-invalid={chybaSouhlasu ? true : undefined}
                aria-describedby={chybaSouhlasu ? 'souhlas-podminky-chyba' : undefined}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-linda-cognac"
              />
              <span className="text-linda-espresso/85">
                Souhlasím s{' '}
                <Link
                  href={data.odkazPodminky}
                  target="_blank"
                  className="font-semibold text-linda-cognac underline"
                >
                  obchodními podmínkami
                  <span className="sr-only"> (otevře se v novém okně)</span>
                </Link>
                . *
              </span>
            </label>

            {chybaSouhlasu && (
              <p
                id="souhlas-podminky-chyba"
                role="alert"
                className="flex items-center gap-1.5 text-[11px] font-medium text-red-800"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {chybaSouhlasu}
              </p>
            )}

            {/*
              Poučení o osobních údajích je oznámení, ne souhlas – zpracování
              kvůli objednávce stojí na čl. 6 odst. 1 písm. b) GDPR (plnění
              smlouvy). Dřív bylo součástí povinného zaškrtávátka, a tím
              budilo dojem, že bez souhlasu se zpracováním nejde nakoupit.
            */}
            <p className="text-[10px] leading-relaxed text-linda-espresso/70">
              Osobní údaje zpracováváme k vyřízení objednávky –{' '}
              <Link href="/ochrana-osobnich-udaju" target="_blank" className="font-semibold text-linda-cognac underline">
                jak s nimi zacházíme
              </Link>
              .
            </p>

            {/*
              Poučení bezprostředně před tlačítkem, ne jen v podmínkách.

              Věta o nákladech na vrácení tu není z opatrnosti: § 1820 odst. 1
              písm. i) o. z. ukládá na ně upozornit **před** uzavřením smlouvy
              a při opomenutí je nese prodávající.
            */}
            <p className="text-[10px] leading-relaxed text-linda-espresso/70">
              Objednávka zavazuje k zaplacení. Od smlouvy můžete odstoupit do 14 dnů od převzetí bez
              udání důvodu –{' '}
              <Link href="/odstoupeni" target="_blank" className="font-semibold text-linda-cognac underline">
                poučení a odstoupení
              </Link>
              ,{' '}
              <Link href="/odstoupeni/formular" target="_blank" className="font-semibold text-linda-cognac underline">
                vzorový formulář
              </Link>
              . Náklady na vrácení zboží nesete vy. Reklamace řeší{' '}
              <Link href="/reklamacni-rad" target="_blank" className="font-semibold text-linda-cognac underline">
                reklamační řád
              </Link>
              .
            </p>

            {prodavajici.length > 0 && (
              <p className="text-[10px] leading-relaxed text-linda-espresso/70">
                Prodávající: {prodavajici.join(', ')}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!lzeObjednat}
            aria-busy={odesila}
            className="flex min-h-touch w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-linda-cognac py-4 text-sm font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm disabled:cursor-not-allowed disabled:opacity-70"
          >
            {odesila ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Odesílám objednávku…
              </>
            ) : data.objednavaniZablokovano ? (
              'Objednávky jsou pozastavené'
            ) : (
              <>
                <CheckCircle className="h-4 w-4" aria-hidden="true" />
                {/*
                  § 1826a odst. 2 o. z.: popisek musí odkazovat na **platbu**,
                  ne jen na závaznost – „objednávka zavazující k platbě“ nebo
                  jiná jednoznačná formulace. ČOI hodnotí právě popisek
                  tlačítka, ne větu pod ním.
                */}
                Objednat a zaplatit
              </>
            )}
          </button>
        </div>
      </aside>
    </form>
  );
}

/* ------------------------------------------------------------------ */

const Oddil: React.FC<{
  nadpis: string;
  upravit: { href: string; text: string };
  children: React.ReactNode;
}> = ({ nadpis, upravit, children }) => (
  <section className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu sm:p-8">
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-serif text-2xl text-linda-espresso">{nadpis}</h2>
      <Link
        href={upravit.href}
        aria-label={`${upravit.text} – ${nadpis.toLowerCase()}`}
        className="inline-flex min-h-touch shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold text-linda-cognac transition-colors duration-200 hover:text-linda-cognacHover hover:underline"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        {upravit.text}
      </Link>
    </div>
    {children}
  </section>
);

/** Náhled se načítá, nebo selhal – v obou případech se objednat nedá. */
const StavNahledu: React.FC<{ nacita: boolean; chyba: ChybaShrnuti | null; znovu: () => void }> = ({
  nacita,
  chyba,
  znovu,
}) => {
  if (chyba) {
    return (
      <div className="space-y-2">
        <ChybaOdeslani chyba={chyba} />
        <button
          type="button"
          onClick={znovu}
          disabled={nacita}
          className="inline-flex min-h-touch cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-linda-cognac underline disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${nacita ? 'animate-spin' : ''}`} aria-hidden="true" />
          Zkusit znovu
        </button>
      </div>
    );
  }

  return (
    <p role="status" className="flex items-center gap-2 py-4 text-xs text-linda-espresso/75">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      Počítám cenu…
    </p>
  );
};

/**
 * Chyba ze serveru s odkazem do kroku, kde se dá opravit.
 *
 * Shrnutí samo žádná pole nemá, takže hláška „Vyplňte PSČ" bez cesty zpátky
 * by zákaznici nechala stát. Každé pole má svůj krok v `KROK_POLE`.
 */
const ChybaOdeslani: React.FC<{ chyba: ChybaShrnuti }> = ({ chyba }) => {
  const polozky = Object.entries(chyba.pole ?? {}).filter(([pole, text]) => text && pole !== 'ocekavanaCena');

  return (
    <div role="alert" className="space-y-2 rounded-xl bg-linda-sandLight p-4 text-xs text-red-800 shadow-neuInsetSm">
      <p className="flex items-start gap-2 font-medium">
        <AlertCircle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
        {chyba.zprava}
      </p>
      {polozky.length > 0 && (
        <ul className="space-y-1 pl-6">
          {polozky.map(([pole, text]) => (
            <li key={pole} className="list-disc">
              {text}{' '}
              {KROK_POLE[pole] && (
                <Link href={KROK_POLE[pole].href} className="font-semibold text-linda-cognac underline">
                  {KROK_POLE[pole].text}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
      {polozky.length === 0 && !chyba.pole?.ocekavanaCena && (
        <Link href="/kosik" className="inline-block pl-6 font-semibold text-linda-cognac underline">
          Zkontrolovat košík
        </Link>
      )}
    </div>
  );
};
