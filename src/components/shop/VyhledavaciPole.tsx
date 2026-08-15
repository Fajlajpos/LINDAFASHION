'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Search, Tag } from 'lucide-react';
import { nacist } from '@/lib/api-klient';
import type { VysledekNaseptavace } from '@/lib/katalog';

/**
 * Hledání v hlavičce s napovídáním při psaní.
 *
 * Do téhle chvíle to byl obyčejný formulář: napiš, odešli, čekej na celou
 * stránku katalogu. Kdo netrefil název, dostal „Nic jsme nenašli" a neměl
 * z čeho poznat, jestli takový kousek neexistuje, nebo ho jen pojmenoval
 * jinak. Návrhy pod polem odpovídají dřív, než se stihne rozhodnout odeslat.
 *
 * Tři věci, na kterých takové pole obvykle stojí nebo padá:
 *
 * 1. **Rušení předchozího dotazu.** Bez `AbortController` se odpovědi vracejí
 *    v pořadí, v jakém je stihne server – odpověď na „sat" tak umí dorazit
 *    až po odpovědi na „saty" a přepsat ji zpátky na horší výsledky.
 * 2. **Klávesnice.** Šipky, Enter a Escape; bez nich je seznam použitelný
 *    jen myší a odečítač obrazovky o něm neví (odtud `role="combobox"`
 *    a `aria-activedescendant`).
 * 3. **Escape ve dvou krocích.** První zavře nabídku, druhý celé hledání.
 *    Kdyby první Escape zavřel obojí, zmizí i to, co zákaznice právě napsala.
 */

/** 1 výsledek, 2–4 výsledky, 5+ výsledků. */
function tvarVysledku(pocet: number): string {
  if (pocet === 1) return 'výsledek';
  if (pocet >= 2 && pocet <= 4) return 'výsledky';
  return 'výsledků';
}

/** Kratší dotaz nemá cenu posílat – vrátil by skoro celý katalog. */
const MIN_ZNAKU = 2;

/** Prodleva po posledním stisku. Pod 150 ms se posílá dotaz na každé písmeno. */
const PRODLEVA_MS = 200;

interface Props {
  /** Zavře celé vyhledávání a vrátí fokus na jeho spouštěč v hlavičce. */
  onZavrit: () => void;
}

type Polozka =
  | { druh: 'produkt'; klic: string; href: string; data: VysledekNaseptavace['produkty'][number] }
  | { druh: 'kategorie'; klic: string; href: string; nazev: string }
  | { druh: 'vse'; klic: string; href: string; celkem: number };

const PRAZDNE: VysledekNaseptavace = {
  produkty: [],
  kategorie: [],
  celkem: 0,
  volnaShoda: false,
};

export const VyhledavaciPole: React.FC<Props> = ({ onZavrit }) => {
  const router = useRouter();
  const idSeznamu = useId();

  const [dotaz, setDotaz] = useState('');
  const [navrhy, setNavrhy] = useState<VysledekNaseptavace>(PRAZDNE);
  const [nacitam, setNacitam] = useState(false);
  const [otevreno, setOtevreno] = useState(false);
  const [zvyrazneny, setZvyrazneny] = useState(-1);

  const obalRef = useRef<HTMLDivElement>(null);
  const poleRef = useRef<HTMLInputElement>(null);

  const orezany = dotaz.trim();
  const dostDlouhy = orezany.length >= MIN_ZNAKU;

  // Pole se montuje až otevřením hledání v hlavičce, takže fokus patří sem –
  // `autoFocus` by se spustil i při prvním vykreslení celé stránky.
  useEffect(() => {
    poleRef.current?.focus();
  }, []);

  /* Dotaz na server: prodleva + zrušení toho předchozího.
     Úklidová funkce efektu dělá obojí najednou, takže při každém stisku
     spolehlivě odejde jak naplánovaný dotaz, tak ten už běžící. */
  useEffect(() => {
    if (!dostDlouhy) {
      setNavrhy(PRAZDNE);
      setNacitam(false);
      return;
    }

    const rizeni = new AbortController();
    const casovac = setTimeout(async () => {
      setNacitam(true);

      const vysledek = await nacist<VysledekNaseptavace>(
        `/api/vyhledavani?q=${encodeURIComponent(orezany)}`,
        rizeni.signal
      );

      // Zrušený dotaz nepřepisuje nic: jeho místo už zabral novější.
      if (vysledek.ok === false && vysledek.zruseno) return;

      setNacitam(false);
      setNavrhy(vysledek.ok ? vysledek.data : PRAZDNE);
      setZvyrazneny(-1);
      setOtevreno(true);
    }, PRODLEVA_MS);

    return () => {
      clearTimeout(casovac);
      rizeni.abort();
    };
  }, [orezany, dostDlouhy]);

  // Kliknutí mimo nabídku ji zavře. `mousedown`, ne `click`: na `click` by
  // stihl proběhnout blur a odkaz pod prstem by se ztratil dřív, než se na
  // něj klikne.
  useEffect(() => {
    if (!otevreno) return;

    const zavritMimo = (e: MouseEvent) => {
      if (!obalRef.current?.contains(e.target as Node)) setOtevreno(false);
    };

    document.addEventListener('mousedown', zavritMimo);
    return () => document.removeEventListener('mousedown', zavritMimo);
  }, [otevreno]);

  const odkazNaVse = `/produkty?hledat=${encodeURIComponent(orezany)}`;

  /* Jeden plochý seznam pro klávesnici, i když se vykresluje ve třech
     skupinách. Šipka dolů musí projít vším odshora dolů; dvě samostatná
     počítadla by se rozešla hned, jak by některá skupina zůstala prázdná. */
  const polozky = useMemo<Polozka[]>(() => {
    if (!dostDlouhy) return [];

    const seznam: Polozka[] = navrhy.produkty.map((p) => ({
      druh: 'produkt',
      klic: p.id,
      href: `/produkt/${p.slug}`,
      data: p,
    }));

    for (const k of navrhy.kategorie) {
      seznam.push({
        druh: 'kategorie',
        klic: `kategorie-${k.slug}`,
        href: `/produkty/${k.slug}`,
        nazev: k.nazev,
      });
    }

    /* Řádek „zobrazit vše" jen tehdy, když se všechno do nabídky nevešlo.
       U dvou nalezených kousků, které jsou oba vidět, by slibovalo stránku
       s tímtéž obsahem. */
    if (navrhy.celkem > navrhy.produkty.length) {
      seznam.push({ druh: 'vse', klic: 'vse', href: odkazNaVse, celkem: navrhy.celkem });
    }

    return seznam;
  }, [dostDlouhy, navrhy, odkazNaVse]);

  const nicSeNenaslo = dostDlouhy && !nacitam && polozky.length === 0;
  const zobrazitNabidku = otevreno && dostDlouhy && (polozky.length > 0 || nicSeNenaslo);

  const prejit = (href: string) => {
    setOtevreno(false);
    onZavrit();
    router.push(href);
  };

  /* Escape ve dvou krocích – a celý na jednom místě.
   *
   * Původně to bylo rozdělené: nabídku zavírala obsluha `onKeyDown` tady
   * a hlavička k tomu měla vlastní posluchač na `document`. Nefungovalo to.
   * Next.js v App Routeru hydratuje celý dokument, takže React má své
   * delegované posluchače **taky na `document`** – a `stopPropagation()`
   * mezi dvěma posluchači téhož uzlu nic nezastaví (na to je
   * `stopImmediatePropagation`). První Escape tak zavřel obojí najednou
   * a napsaný dotaz zmizel s ním.
   *
   * Rozhodnutí proto dělá jediný posluchač. Na `document`, ne na poli:
   * po Tabu z pole ven Escape stejně musí hledání zavřít.
   */
  useEffect(() => {
    const naEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;

      if (zobrazitNabidku) {
        /* `preventDefault` drží napsaný dotaz v poli. `input type="search"`
           má totiž vlastní výchozí chování: Escape ho v Chromu i Safari
           vyprázdní. První Escape by tak zavřel nabídku a rovnou smazal to,
           kvůli čemu se otvírala. */
        e.preventDefault();
        setOtevreno(false);
        setZvyrazneny(-1);
        return;
      }

      onZavrit();
    };

    document.addEventListener('keydown', naEscape);
    return () => document.removeEventListener('keydown', naEscape);
  }, [zobrazitNabidku, onZavrit]);

  const naKlavesu = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (polozky.length === 0) return;
      e.preventDefault();

      if (!otevreno) {
        setOtevreno(true);
        return;
      }

      const posun = e.key === 'ArrowDown' ? 1 : -1;
      // Modulo přes délku: ze spodku seznamu se šipkou dolů vrátíme nahoru.
      setZvyrazneny((i) => (i + posun + polozky.length) % polozky.length);
      return;
    }

    if (e.key === 'Enter' && zvyrazneny >= 0 && polozky[zvyrazneny]) {
      // Vybraný návrh má přednost před odesláním formuláře – jinak by Enter
      // nad zvýrazněnými šaty otevřel výpis místo těch šatů.
      e.preventDefault();
      prejit(polozky[zvyrazneny].href);
    }
  };

  const idPolozky = (index: number) => `${idSeznamu}-navrh-${index}`;

  return (
    <div id="vyhledavani" ref={obalRef} className="animate-fadeIn relative py-3">
      <form
        action="/produkty"
        method="GET"
        role="search"
        className="relative mx-auto max-w-md"
        onSubmit={() => setOtevreno(false)}
      >
        <label htmlFor="hledat" className="sr-only">
          Hledat v nabídce
        </label>
        <input
          ref={poleRef}
          id="hledat"
          type="search"
          name="hledat"
          value={dotaz}
          onChange={(e) => setDotaz(e.target.value)}
          onKeyDown={naKlavesu}
          onFocus={() => polozky.length > 0 && setOtevreno(true)}
          placeholder="Hledat šaty, len, kašmír…"
          autoComplete="off"
          role="combobox"
          aria-expanded={zobrazitNabidku}
          aria-controls={idSeznamu}
          aria-autocomplete="list"
          aria-activedescendant={zvyrazneny >= 0 ? idPolozky(zvyrazneny) : undefined}
          /* Pole je prohlubeň v liště – rámeček by reliéf jen zdvojil. */
          className="w-full rounded-full bg-linda-sandLight py-2.5 pl-4 pr-20 text-sm text-linda-espresso shadow-neuInsetSm placeholder:text-linda-espresso/60"
        />

        {/* Vřetánko sedí vedle lupy, ne místo ní: kdyby se tlačítko na dobu
            načítání měnilo na spinner, mizel by pod kurzorem cíl kliknutí. */}
        {nacitam && (
          <Loader2
            className="pointer-events-none absolute right-12 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-linda-cognac"
            aria-hidden="true"
          />
        )}

        <button
          type="submit"
          className="group absolute right-1 top-1/2 flex min-h-touch min-w-touch -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-linda-cognac transition-colors hover:text-linda-espresso"
          aria-label="Vyhledat"
        >
          <Search
            className="h-4 w-4 transition-transform duration-200 ease-out group-hover:scale-110 group-active:scale-90"
            aria-hidden="true"
          />
        </button>
      </form>

      {/* Odečítač obrazovky nabídku „nevidí“ – počet návrhů mu musí někdo
          říct. `polite`, ať to nepřerušuje psaní. */}
      <p role="status" aria-live="polite" className="sr-only">
        {dostDlouhy && !nacitam
          ? navrhy.celkem > 0
            ? `Nalezeno ${navrhy.celkem} ${tvarVysledku(navrhy.celkem)}, šipkami vyberte návrh.`
            : 'Nic jsme nenašli.'
          : ''}
      </p>

      {zobrazitNabidku && (
        /* Vyvýšená karta nad obsahem stránky. `max-h` + rolování: při šesti
           produktech, třech kategoriích a řádku „zobrazit vše“ by nabídka na
           malém displeji přerostla obrazovku. */
        <div className="absolute inset-x-0 top-full z-50 mx-auto max-w-md">
          <ul
            id={idSeznamu}
            role="listbox"
            aria-label="Návrhy k hledání"
            className="animate-fadeInUp max-h-[70vh] overflow-y-auto overflow-x-hidden rounded-2xl bg-linda-cream p-2 shadow-neuLg"
          >
            {navrhy.volnaShoda && (
              <li
                role="presentation"
                className="mb-1 rounded-xl bg-linda-sandLight px-3 py-2 text-[11px] text-linda-espresso/75 shadow-neuInsetSm"
              >
                Přesnou shodu jsme nenašli. Tohle je nejbližší, co máme.
              </li>
            )}

            {nicSeNenaslo && (
              <li
                role="presentation"
                className="px-3 py-4 text-center text-xs text-linda-espresso/75"
              >
                Nic jsme nenašli. Zkuste jiné slovo – třeba „šaty“ nebo „len“.
              </li>
            )}

            {polozky.map((polozka, index) => {
              const vybrany = index === zvyrazneny;

              /* Zvýrazněná položka je zamáčknutá do karty, ne jen jinak
                 barevná – stejný slovník jako u filtrů v katalogu. */
              const trida = `flex min-h-touch w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left transition-all duration-200 ${
                vybrany ? 'bg-linda-sandLight shadow-neuInsetSm' : 'hover:bg-linda-sandLight/60'
              }`;

              return (
                <li key={polozka.klic} role="none">
                  <button
                    type="button"
                    id={idPolozky(index)}
                    role="option"
                    aria-selected={vybrany}
                    // Myš nesmí sebrat fokus poli – jinak se nabídka zavře
                    // dřív, než kliknutí dorazí.
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setZvyrazneny(index)}
                    onClick={() => prejit(polozka.href)}
                    className={trida}
                  >
                    {polozka.druh === 'produkt' && (
                      <>
                        {/* Nika pro fotku: zapuštěná ploška drží rozměr i tehdy,
                            když produkt fotku nemá – jinak by se řádky v seznamu
                            střídavě zkracovaly. */}
                        <span className="relative h-12 w-9 shrink-0 overflow-hidden rounded-lg bg-linda-sandLight shadow-neuInsetSm">
                          {polozka.data.obrazekUrl && (
                            <Image
                              src={polozka.data.obrazekUrl}
                              alt=""
                              fill
                              sizes="36px"
                              className="object-cover"
                            />
                          )}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-linda-espresso">
                            {polozka.data.nazev}
                          </span>
                          <span className="block truncate text-[11px] text-linda-espresso/70">
                            {polozka.data.kategorieNazev}
                          </span>
                        </span>

                        <span className="shrink-0 text-xs font-semibold text-linda-espresso">
                          {(polozka.data.cenaPoSleve ?? polozka.data.cena).toLocaleString('cs-CZ')} Kč
                        </span>
                      </>
                    )}

                    {polozka.druh === 'kategorie' && (
                      <>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-linda-sandLight text-linda-cognac shadow-neuInsetSm">
                          <Tag className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-xs text-linda-espresso">
                          Celá kategorie{' '}
                          <span className="font-semibold">{polozka.nazev}</span>
                        </span>
                      </>
                    )}

                    {polozka.druh === 'vse' && (
                      <>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-linda-sandLight text-linda-cognac shadow-neuInsetSm">
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-linda-cognac">
                          Zobrazit všech {polozka.celkem} {tvarVysledku(polozka.celkem)}
                        </span>
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
