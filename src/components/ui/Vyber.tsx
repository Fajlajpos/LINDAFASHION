'use client';

import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

/**
 * Výběr z několika možností – náhrada za `<select>`.
 *
 * Důvod je jediný a nedá se obejít CSS: **rozbalený seznam nativního
 * `<select>`u nekreslí stránka, ale operační systém.** Spouštěč nastylovat lze
 * (a byl – krémová plocha, reliéf, drobné písmo), jenže ve chvíli, kdy se
 * rozbalí, přijde šedý systémový obdélník s modrým pruhem, systémovým písmem
 * a ostrými rohy. Uprostřed krémového reliéfu to vypadá jako kus cizí
 * aplikace. `appearance: none` na tohle nestačí: u `<option>` jde napříč
 * prohlížeči nastavit nanejvýš barva textu a pozadí – a ve Windows ani to.
 *
 * Slovník nabídky je schválně týž jako u našeptávače v hledání
 * (`VyhledavaciPole`): vyvýšená krémová karta, položky `min-h-touch`,
 * zvýrazněná položka **zamáčknutá** do karty (`sandLight` + inset), ne jen
 * jinak barevná. Kdo zná jednu nabídku, zná obě.
 *
 * Tři věci, které tu nejsou navíc:
 *
 * 1. **Stín `neuFloat`, ne `neuLg`.** Nabídka se otevírá kamkoli – v katalogu
 *    padne přes produktové fotky. Bílý přísvit `neu*` tokenů se nad tmavým
 *    snímkem nemá do čeho opřít a udělá kolem karty mléčnou svatozář;
 *    `neuFloat` ho proto vynechává a nese jen espresso stín.
 * 2. **Portál a `position: fixed`.** Nabídka polohovaná absolutně uvnitř
 *    formuláře se ořízne o první `overflow-hidden` nad sebou a u pole na
 *    spodku obrazovky nemá kam vyrůst. Přes portál se měří poloha spouštěče
 *    a v případě nouze se nabídka otevře nahoru.
 * 3. **Klávesnice podle vzoru WAI-ARIA** (select-only combobox): šipky, Home,
 *    End, Enter, mezerník, Escape a psaní prvních písmen. Fokus zůstává na
 *    spouštěči a aktivní položku nese `aria-activedescendant` – díky tomu se
 *    nemusí řešit návrat fokusu po zavření.
 *
 * Nativní `required` tu zmizí a je to vědomé rozhodnutí: povinnost hlídá
 * server (odpověď `{ chyba, pole }` se vykreslí u pole), tady zůstává
 * `aria-required` pro odečítač obrazovky.
 */

export interface MoznostVyberu {
  hodnota: string;
  popisek: string;
  /** Druhý, tišší řádek pod popiskem – jen tam, kde volba potřebuje vysvětlit. */
  poznamka?: string;
  disabled?: boolean;
}

interface Props {
  /** Míří na něj `<label htmlFor>` volajícího – `<button>` je popisovatelný prvek. */
  id: string;
  hodnota: string;
  moznosti: MoznostVyberu[];
  onZmena: (hodnota: string) => void;
  disabled?: boolean;
  /**
   * `zapusteny` – prohlubeň v krémové kartě, jako ostatní pole formulářů.
   * `vystouply` – tlačítko stojící přímo na stránce (řazení v katalogu).
   */
  varianta?: 'zapusteny' | 'vystouply';
  /** Text, když `hodnota` neodpovídá žádné možnosti. */
  zastupnyText?: string;
  /** Ikona vlevo ve spouštěči (Lucide, `h-3.5 w-3.5`). */
  ikona?: React.ReactNode;
  povinne?: boolean;
  /** Přidá se ke spouštěči – šířka a mezery, nic barevného. */
  trida?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

/** Nabídka nesmí přerůst obrazovku ani spolknout celý formulář pod sebou. */
const MAX_VYSKA = 288;
/** Pod tolik místa pod spouštěčem se nabídka radši otevře nahoru. */
const MIN_VYSKA = 132;
/** Když je málo místa na obě strany (nízké okno), nabídka se zúží na tohle a roluje. */
const NOUZOVA_VYSKA = 96;
const MIN_SIRKA = 208;
const MEZERA = 8;
/** O kolik smí stránka odjet, než se nabídka zavře. Pod tím je to škubnutí, ne skrol. */
const TOLERANCE_SKROLU = 24;

/**
 * Poloha nabídky – **v souřadnicích dokumentu, ne okna.** Spočítá se jednou
 * při otevření a pak se nesahá ani na ni, ani na tvar.
 *
 * Tohle je to jediné, na čem u plovoucí nabídky záleží, tak proč:
 *
 * Nabídka byla `position: fixed` a při skrolu se dotahovala ke spouštěči
 * JavaScriptem. Vypadalo to špatně a spravit se to nedalo – prohlížeč skroluje
 * stránku na kompozitním vlákně, tedy nezávisle na tom, kdy se dostane ke
 * slovu náš `scroll` posluchač. Pevně umístěný prvek při tom **zůstává stát**
 * a dorovná se až o snímek dva později. Nabídka proto při každém pohybu kolem
 * pole plavala. Zápis přímo do `style` místo `setState` to zkrátil, ale
 * neodstranil: problém není v Reactu, ale v tom, že se prvek vůbec dohání.
 *
 * Nabídka je teď `position: absolute` v souřadnicích dokumentu, takže ji
 * stránka skroluje **spolu se spouštěčem, jedním pohybem na téže vrstvě**.
 * Žádný posluchač skrolu, žádné dohánění, a tedy ani co by se rozjelo.
 * (Předpoklad: spouštěč skroluje s dokumentem. Uvnitř `position: fixed` panelu
 * by nabídka zůstala stát na místě – dnes takový v projektu není.)
 */
interface Poloha {
  left: number;
  sirka: number;
  maxVyska: number;
  /** Odshora dokumentu. `null`, dokud se u nabídky rostoucí vzhůru nezměří výška. */
  top: number | null;
  /** Kam má u nabídky rostoucí vzhůru dosáhnout její **spodní** hrana. */
  kotvaNahoru: number | null;
}

export const Vyber: React.FC<Props> = ({
  id,
  hodnota,
  moznosti,
  onZmena,
  disabled,
  varianta = 'zapusteny',
  zastupnyText = 'Vyberte…',
  ikona,
  povinne,
  trida = '',
  ariaLabel,
  ariaDescribedBy,
}) => {
  const idSeznamu = useId();
  const spoustecRef = useRef<HTMLButtonElement>(null);
  const nabidkaRef = useRef<HTMLDivElement>(null);

  const [otevreno, setOtevreno] = useState(false);
  const [aktivni, setAktivni] = useState(-1);
  const [poloha, setPoloha] = useState<Poloha | null>(null);

  const vybranyIndex = moznosti.findIndex((m) => m.hodnota === hodnota);
  const vybrana = vybranyIndex >= 0 ? moznosti[vybranyIndex] : undefined;
  const prazdny = moznosti.length === 0;

  const zavrit = useCallback(() => {
    setOtevreno(false);
    setAktivni(-1);
  }, []);

  /* Poloha se počítá z rozměrů spouštěče, ne z rozměrů nabídky – ta v tu
     chvíli ještě neexistuje. Rozhoduje proto místo, které v okně zbývá dole:
     když se tam nevejde ani minimální nabídka a nahoře je víc, otevře se
     vzhůru. Rozměry okna se čtou jen tady, výsledek se ukládá v souřadnicích
     dokumentu (`scrollY`/`scrollX`), aby přežil skrolování. */
  const zmeritPolohu = useCallback(() => {
    const el = spoustecRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();
    const dole = window.innerHeight - r.bottom - MEZERA;
    const nahore = r.top - MEZERA;
    const nahoru = dole < MIN_VYSKA && nahore > dole;
    const misto = nahoru ? nahore : dole;

    /* `clientWidth`, ne `innerWidth`: to druhé počítá i pruh posuvníku, takže
       by nabídka u pravého okraje končila pod ním – a `body` má
       `overflow-x: hidden`, takže by se ten přesah rovnou uřízl. */
    const sirkaOkna = document.documentElement.clientWidth;
    const sirka = Math.min(Math.max(r.width, MIN_SIRKA), sirkaOkna - 2 * MEZERA);
    // Zarovnáno k levé hraně spouštěče, ale nikdy mimo obrazovku.
    const left = Math.min(Math.max(MEZERA, r.left), sirkaOkna - sirka - MEZERA);

    setPoloha({
      left: left + window.scrollX,
      sirka,
      /* Výška se řídí místem, které opravdu je. Kdyby se držela `MIN_VYSKA`
         i tam, kde tolik místa není (nízké okno, otevřená klávesnice na
         mobilu), přeteče nabídka spodní hranu obrazovky a poslední položka
         se nedá vybrat vůbec. */
      maxVyska: Math.max(NOUZOVA_VYSKA, Math.min(MAX_VYSKA, misto)),
      /* Dolů se umístí rovnou, vzhůru až po změření výšky – tu bez vykreslené
         nabídky nikdo nezná. */
      top: nahoru ? null : r.bottom + window.scrollY + MEZERA,
      kotvaNahoru: nahoru ? r.top + window.scrollY - MEZERA : null,
    });
  }, []);

  const otevrit = useCallback(
    (start: 'vybrane' | 'posledni') => {
      if (disabled || prazdny) return;
      zmeritPolohu();
      setAktivni(
        start === 'posledni' ? moznosti.length - 1 : vybranyIndex >= 0 ? vybranyIndex : 0
      );
      setOtevreno(true);
    },
    [disabled, prazdny, moznosti.length, vybranyIndex, zmeritPolohu]
  );

  const vybrat = useCallback(
    (index: number) => {
      const m = moznosti[index];
      if (!m || m.disabled) return;
      onZmena(m.hodnota);
      zavrit();
      spoustecRef.current?.focus();
    },
    [moznosti, onZmena, zavrit]
  );

  /* Kliknutí mimo. `pointerdown`, ne `click`: na `click` by mezi stiskem a
     puštěním stihl proběhnout blur a položka pod prstem by se ztratila dřív,
     než na ni kliknutí dopadne. */
  useEffect(() => {
    if (!otevreno) return;

    const mimo = (e: PointerEvent) => {
      const cil = e.target as Node;
      if (spoustecRef.current?.contains(cil) || nabidkaRef.current?.contains(cil)) return;
      zavrit();
    };

    document.addEventListener('pointerdown', mimo);
    return () => document.removeEventListener('pointerdown', mimo);
  }, [otevreno, zavrit]);

  /* Druhá půlka umístění, jen pro nabídku rostoucí vzhůru: teď už je
     vykreslená, takže se dá změřit a posadit spodní hranou nad spouštěč.

     `useLayoutEffect`, ne `useEffect` – React ho vyřídí ještě před vykreslením
     snímku, takže se mezistav nikdy neukáže. S `useEffect` by nabídka na jeden
     snímek blikla pod polem a teprve pak vyskočila nad něj. */
  useLayoutEffect(() => {
    if (!otevreno || !poloha || poloha.top !== null || poloha.kotvaNahoru === null) return;

    const vyska = nabidkaRef.current?.offsetHeight ?? 0;
    setPoloha({ ...poloha, top: poloha.kotvaNahoru - vyska });
  }, [otevreno, poloha]);

  /* Změna velikosti okna nabídku zavře – šířka, směr i dostupné místo už
     můžou být jinde a nabídka měřená před otočením telefonu by seděla vedle.
     Přepočítávat ji nemá cenu, protože v ní stejně nikdo nemá rozdělanou
     práci. */
  useEffect(() => {
    if (!otevreno) return;

    window.addEventListener('resize', zavrit);
    return () => window.removeEventListener('resize', zavrit);
  }, [otevreno, zavrit]);

  const idMoznosti = useCallback(
    (index: number) => `${idSeznamu}-moznost-${index}`,
    [idSeznamu]
  );

  // Aktivní položka musí být vidět i tehdy, když se k ní došlo klávesnicí.
  useEffect(() => {
    if (!otevreno || aktivni < 0) return;
    document.getElementById(idMoznosti(aktivni))?.scrollIntoView({ block: 'nearest' });
  }, [otevreno, aktivni, idMoznosti]);

  /**
   * Odskrolování stránky nabídku zavře.
   *
   * Nabídka je ukotvená v dokumentu, takže při skrolu **drží u svého pole** –
   * jenže pole samo odjede pod lepící hlavičku (`z-40`) a nabídka, která je nad
   * ní (`z-50`), zůstane viset přes hlavičku bez ničeho, k čemu by patřila.
   * Zavření je i to, co dělá nativní `<select>`: ten stránkou pod otevřeným
   * seznamem hýbat vůbec nenechá.
   *
   * Tolerance je tu proto, že bez ní zavře nabídku každé škubnutí touchpadu
   * nebo dorovnání skrolu po otevření. Posluchač je `passive` a jen porovná
   * dvě čísla – nic neměří a nic nepřekresluje, takže se nemá co rozjet.
   *
   * Rolování uvnitř samotného seznamu sem nedosáhne: `scroll` z vnořeného
   * prvku nebublá a posluchač je na `window` bez zachytávání.
   */
  useEffect(() => {
    if (!otevreno) return;

    const zacatek = window.scrollY;
    const naSkrol = () => {
      if (Math.abs(window.scrollY - zacatek) > TOLERANCE_SKROLU) zavrit();
    };

    window.addEventListener('scroll', naSkrol, { passive: true });
    return () => window.removeEventListener('scroll', naSkrol);
  }, [otevreno, zavrit]);

  /** Další použitelná položka daným směrem; přeskočí zakázané, na konci se otočí. */
  const posunout = (smer: 1 | -1) => {
    if (prazdny) return;
    let i = aktivni;
    for (let krok = 0; krok < moznosti.length; krok++) {
      i = (i + smer + moznosti.length) % moznosti.length;
      if (!moznosti[i]?.disabled) {
        setAktivni(i);
        return;
      }
    }
  };

  const krajni = (od: number, smer: 1 | -1) => {
    for (let i = od; i >= 0 && i < moznosti.length; i += smer) {
      if (!moznosti[i]?.disabled) {
        setAktivni(i);
        return;
      }
    }
  };

  /* Psaní prvních písmen. Nativní `<select>` to umí a je to jediný rozumný
     způsob, jak se v seznamu dvaceti kategorií dostat na „Šaty“ bez myši.
     Vyrovnávací paměť se maže krátce po posledním stisku. */
  const hledane = useRef('');
  const casovacHledani = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(casovacHledani.current), []);

  const dohledat = (znak: string) => {
    clearTimeout(casovacHledani.current);
    hledane.current += znak.toLowerCase();
    casovacHledani.current = setTimeout(() => {
      hledane.current = '';
    }, 800);

    const hledam = hledane.current;
    const od = aktivni >= 0 ? aktivni : vybranyIndex;

    /* Hledá se od aktuální položky dál a dokola – opakovaný stisk téhož
       písmene tak projde všechny možnosti, které jím začínají. */
    for (let krok = 1; krok <= moznosti.length; krok++) {
      const i = (od + krok + moznosti.length) % moznosti.length;
      const m = moznosti[i];
      if (!m || m.disabled) continue;
      if (m.popisek.toLowerCase().startsWith(hledam)) {
        if (otevreno) setAktivni(i);
        else onZmena(m.hodnota);
        return;
      }
    }
  };

  const jePismeno = (e: React.KeyboardEvent) =>
    e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey;

  const naKlavesu = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (!otevreno) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        otevrit('vybrane');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        otevrit('posledni');
      } else if (jePismeno(e)) {
        e.preventDefault();
        dohledat(e.key);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        zavrit();
        break;
      case 'Tab':
        // Tab má fokus posunout dál, ne ho uvěznit v otevřené nabídce.
        zavrit();
        break;
      case 'ArrowDown':
        e.preventDefault();
        posunout(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        posunout(-1);
        break;
      case 'Home':
        e.preventDefault();
        krajni(0, 1);
        break;
      case 'End':
        e.preventDefault();
        krajni(moznosti.length - 1, -1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        vybrat(aktivni);
        break;
      default:
        if (jePismeno(e)) {
          e.preventDefault();
          dohledat(e.key);
        }
    }
  };

  /* Otevřená nabídka nechává spouštěč **zamáčknutý** – stejný slovník jako
     u tlačítek (`active:shadow-neuSm`). Zapuštěná varianta prohlubeň už má,
     ta se otevřením jen prohloubí. */
  const tridySpoustece =
    varianta === 'vystouply'
      ? otevreno
        ? 'bg-linda-sandLight shadow-neuInsetSm'
        : 'bg-linda-cream shadow-neuSm hover:shadow-neu'
      : otevreno
        ? 'bg-linda-sandLight shadow-neuInset'
        : 'bg-linda-sandLight shadow-neuInsetSm';

  return (
    <>
      <button
        ref={spoustecRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={otevreno}
        aria-controls={otevreno ? idSeznamu : undefined}
        aria-activedescendant={otevreno && aktivni >= 0 ? idMoznosti(aktivni) : undefined}
        aria-required={povinne || undefined}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        disabled={disabled || prazdny}
        onClick={() => (otevreno ? zavrit() : otevrit('vybrane'))}
        onKeyDown={naKlavesu}
        className={`flex min-h-touch cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-left text-xs text-linda-espresso transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${tridySpoustece} ${trida}`}
      >
        {ikona}
        <span className={`flex-1 truncate ${vybrana ? '' : 'text-linda-espresso/60'}`}>
          {vybrana ? vybrana.popisek : zastupnyText}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-linda-cognac transition-transform duration-200 ${
            otevreno ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {otevreno &&
        poloha &&
        createPortal(
          <div
            ref={nabidkaRef}
            style={{
              position: 'absolute',
              left: poloha.left,
              top: poloha.top ?? 0,
              width: poloha.sirka,
              /* Pojistka pro ten jediný snímek, kdy u nabídky rostoucí vzhůru
                 ještě neznáme výšku. `useLayoutEffect` ho stihne dřív, než se
                 vykreslí, ale kdyby ne, nesmí se ukázat na špatném místě. */
              visibility: poloha.top === null ? 'hidden' : undefined,
            }}
            className="z-50"
          >
            <ul
              id={idSeznamu}
              role="listbox"
              aria-label={ariaLabel}
              tabIndex={-1}
              style={{ maxHeight: poloha.maxVyska }}
              className="animate-fadeIn overflow-y-auto overscroll-contain rounded-2xl bg-linda-cream p-2 shadow-neuFloat"
            >
              {moznosti.map((m, index) => {
                const jeVybrana = m.hodnota === hodnota;
                const jeAktivni = index === aktivni;

                return (
                  <li key={m.hodnota} role="none">
                    <button
                      type="button"
                      id={idMoznosti(index)}
                      role="option"
                      aria-selected={jeVybrana}
                      disabled={m.disabled}
                      tabIndex={-1}
                      /* Výběr patří na `click`, ne na `pointerdown`: tažením
                         mimo položku se dá kliknutí ještě vzít zpět. */
                      onClick={() => vybrat(index)}
                      onMouseEnter={() => !m.disabled && setAktivni(index)}
                      /* `items-center`, ne `items-start`: řádek je vysoký
                         `min-h-touch` (44 px) kvůli prstu, ale text je jeden a
                         u horní hrany se čte jako špatně zarovnaný – pod ním
                         zbyde prázdný pruh, který u zamáčknuté položky vidíte
                         i na reliéfu. Dvouřádková varianta s poznámkou se
                         vystředí jako celek. */
                      className={`flex min-h-touch w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-xs transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                        jeAktivni
                          ? 'bg-linda-sandLight text-linda-espresso shadow-neuInsetSm'
                          : 'text-linda-espresso hover:bg-linda-sandLight/60'
                      }`}
                    >
                      <Check
                        className={`h-3.5 w-3.5 shrink-0 text-linda-cognac ${
                          jeVybrana ? '' : 'invisible'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="flex-1">
                        <span className={jeVybrana ? 'font-semibold' : ''}>{m.popisek}</span>
                        {m.poznamka && (
                          <span className="mt-0.5 block text-[11px] text-linda-espresso/70">
                            {m.poznamka}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body
        )}
    </>
  );
};
