'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from './cart-context';
import { udajeSchema } from './validations/objednavka';
import {
  nacistKoncept,
  ulozitKoncept,
  type KonceptPokladny,
  type UdajeZakaznice,
} from './pokladna-uloziste';

/**
 * Stav vícekrokové pokladny: Košík → Údaje → Doprava a platba → Shrnutí.
 *
 * Každý krok má vlastní adresu, takže funguje tlačítko Zpět a odkaz „Upravit"
 * ve shrnutí vede přesně tam, kde se údaj opravuje (§ 1826 odst. 1 písm. c)
 * o. z. – možnost zjistit a opravit chyby před odesláním objednávky).
 *
 * Provider sedí v layoutu kroků. Ten se při přechodu mezi kroky nepřemontuje,
 * takže stav žije v paměti; `pokladna-uloziste.ts` ho jen zrcadlí pro případ
 * obnovení stránky.
 */

export interface MoznostDopravy {
  id: string;
  nazev: string;
  popis: string;
  cena: number;
  vyzadujeVydejniMisto: boolean;
}

/** Co pokladně dodá server – načte se jednou v layoutu kroků. */
export interface DataPokladny {
  dopravy: MoznostDopravy[];
  prahDopravaZdarma: number | null;
  /** Předvyplnění pro přihlášenou zákaznici. */
  uzivatel: { email: string; jmeno: string | null; telefon: string | null } | null;
  /**
   * Výchozí doručovací adresa z účtu.
   *
   * Objednávka si z ní udělá vlastní kopii – tohle je jen předvyplnění.
   * Pozdější úprava uložené adresy proto nepřepíše, kam zboží doopravdy šlo.
   */
  vychoziAdresa: {
    jmenoPrijmeni: string;
    ulice: string;
    mesto: string;
    psc: string;
    telefon: string | null;
  } | null;
  objednavaniZablokovano: boolean;
  zpravaODovolene: string | null;
  /** Věta o DPH podle toho, zda je e-shop plátcem. */
  popisDph: string;
  /** Doba dodání – § 1820 odst. 1 písm. h) o. z., musí zaznít před objednáním. */
  dodaciLhuta: string;
  /**
   * Je platební brána zapojená (má `.env` klíče GoPay)? Rozhoduje se na
   * serveru – `NEXT_PUBLIC_` proměnná by zamrzla v buildu.
   */
  platbaKartouDostupna: boolean;
  /** Klíč k widgetu Zásilkovny, nebo `null`, když ještě není zapojená. */
  packetaKlicWidgetu: string | null;
  /** Odkaz na právě účinné znění podmínek (s `?verze=`, je-li v databázi). */
  odkazPodminky: string;
  /** Identifikace prodávajícího ze `Settings`; nevyplněné údaje chybí. */
  prodavajici: { nazev: string | null; ico: string | null; adresa: string | null };
}

interface PokladnaKontext {
  data: DataPokladny;
  koncept: KonceptPokladny;
  upravit: (zmena: (k: KonceptPokladny) => KonceptPokladny) => void;
  nastavitUdaj: (pole: keyof UdajeZakaznice, hodnota: string) => void;
  vybranaDoprava: MoznostDopravy | null;
  /** Doprava i platba jsou vybrané a krok je odkliknutý. */
  krokDopravyHotov: boolean;
  krokUdajuHotov: boolean;
  /**
   * Objednávka je odeslaná a stránka právě odchází na potvrzení nebo do brány.
   * Strážci kroků pak nesmí na vyprázdněný košík reagovat přesměrováním.
   */
  dokonceno: boolean;
  oznacitDokonceno: () => void;
}

const Kontext = createContext<PokladnaKontext | undefined>(undefined);

/** Údaje ve tvaru, jaký čeká `udajeSchema` – prázdné nepovinné pole je `null`. */
export function udajeProServer(udaje: UdajeZakaznice) {
  return {
    ...udaje,
    dodaciTelefon: udaje.dodaciTelefon || null,
    poznamka: udaje.poznamka || null,
  };
}

function vychoziKoncept(data: DataPokladny): KonceptPokladny {
  const { uzivatel, vychoziAdresa } = data;

  return {
    zpusobDopravy: data.dopravy[0]?.id ?? '',
    vydejniMisto: null,
    zpusobPlatby: 'bankovni_prevod',
    /*
     * Uložená adresa má při předvyplnění přednost před jménem z profilu –
     * na zásilce má stát to, co si zákaznice uložila jako doručovací údaje.
     */
    udaje: {
      email: uzivatel?.email ?? '',
      dodaciJmenoPrijmeni: vychoziAdresa?.jmenoPrijmeni ?? uzivatel?.jmeno ?? '',
      dodaciTelefon: vychoziAdresa?.telefon ?? uzivatel?.telefon ?? '',
      dodaciUlice: vychoziAdresa?.ulice ?? '',
      dodaciMesto: vychoziAdresa?.mesto ?? '',
      dodaciPsc: vychoziAdresa?.psc ?? '',
      poznamka: '',
    },
    potvrzeno: { doprava: false, udaje: false },
  };
}

export function PokladnaProvider({ data, children }: { data: DataPokladny; children: React.ReactNode }) {
  const [koncept, setKoncept] = useState<KonceptPokladny>(() => vychoziKoncept(data));
  /** Koncept z `sessionStorage` už je načtený (nebo žádný nebyl). */
  const [obnoveno, setObnoveno] = useState(false);
  /** Zapisovat se začne až první úpravou – pouhé zobrazení nic neukládá. */
  const [upraveno, setUpraveno] = useState(false);
  const [dokonceno, setDokonceno] = useState(false);

  useEffect(() => {
    const ulozeny = nacistKoncept();

    if (ulozeny) {
      setKoncept((vychozi) => {
        /*
         * Uložená volba platí jen v mezích dnešní nabídky. Majitelka mohla
         * mezitím dopravci smazat cenu nebo vypnout kartu – pak se vrátí
         * výchozí volba a krok se musí odkliknout znovu.
         */
        const dopravaPlati = data.dopravy.some((d) => d.id === ulozeny.zpusobDopravy);
        const platbaPlati = ulozeny.zpusobPlatby !== 'gopay' || data.platbaKartouDostupna;

        return {
          ...ulozeny,
          zpusobDopravy: dopravaPlati ? ulozeny.zpusobDopravy : vychozi.zpusobDopravy,
          vydejniMisto: dopravaPlati ? ulozeny.vydejniMisto : null,
          zpusobPlatby: platbaPlati ? ulozeny.zpusobPlatby : 'bankovni_prevod',
          /*
           * Prázdné uložené pole nepřebije předvyplnění. Rozepsaný koncept
           * hosta, který se v kroku 3 přihlásí, by jinak prázdnými řetězci
           * smazal adresu načtenou z účtu.
           */
          udaje: Object.fromEntries(
            Object.entries(vychozi.udaje).map(([pole, hodnota]) => [
              pole,
              ulozeny.udaje[pole as keyof UdajeZakaznice] || hodnota,
            ])
          ) as unknown as UdajeZakaznice,
          potvrzeno: {
            doprava: ulozeny.potvrzeno.doprava && dopravaPlati && platbaPlati,
            udaje: ulozeny.potvrzeno.udaje,
          },
        };
      });
      setUpraveno(true);
    }

    setObnoveno(true);
    // Jednou po načtení; `data` se v layoutu během pokladny nemění.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (upraveno && !dokonceno) ulozitKoncept(koncept);
  }, [koncept, upraveno, dokonceno]);

  const upravit = useCallback((zmena: (k: KonceptPokladny) => KonceptPokladny) => {
    setKoncept(zmena);
    setUpraveno(true);
  }, []);

  const nastavitUdaj = useCallback(
    (pole: keyof UdajeZakaznice, hodnota: string) =>
      upravit((k) => ({ ...k, udaje: { ...k.udaje, [pole]: hodnota } })),
    [upravit]
  );

  const vybranaDoprava = data.dopravy.find((d) => d.id === koncept.zpusobDopravy) ?? null;

  const dopravaPlatna =
    vybranaDoprava !== null &&
    (!vybranaDoprava.vyzadujeVydejniMisto || koncept.vydejniMisto !== null) &&
    (koncept.zpusobPlatby === 'bankovni_prevod' || data.platbaKartouDostupna);

  const udajePlatne = useMemo(
    () => udajeSchema.safeParse(udajeProServer(koncept.udaje)).success,
    [koncept.udaje]
  );

  const hodnota: PokladnaKontext = {
    data,
    koncept,
    upravit,
    nastavitUdaj,
    vybranaDoprava,
    krokDopravyHotov: obnoveno && dopravaPlatna && koncept.potvrzeno.doprava,
    krokUdajuHotov: obnoveno && udajePlatne && koncept.potvrzeno.udaje,
    dokonceno,
    oznacitDokonceno: () => setDokonceno(true),
  };

  return (
    <Kontext.Provider value={hodnota}>
      <KontextObnoveni.Provider value={obnoveno}>{children}</KontextObnoveni.Provider>
    </Kontext.Provider>
  );
}

const KontextObnoveni = createContext(false);

export function usePokladna(): PokladnaKontext {
  const k = useContext(Kontext);
  if (!k) throw new Error('usePokladna musí být použit uvnitř PokladnaProvider');
  return k;
}

/**
 * Hlídá, že do kroku vede cesta přes ty předchozí.
 *
 * Prázdný košík vrací do košíku, chybějící údaje na krok 2, chybějící doprava
 * na krok 3. Přímý vstup na `/pokladna/shrnuti` tak nikdy neukáže shrnutí
 * něčeho, co zákaznice nevybrala.
 *
 * Vrací `true`, až je jisté, že krok smí vykreslit – do té doby se čeká na
 * košík z `localStorage`, jeho ověření u serveru a koncept ze `sessionStorage`.
 * Bez toho by nepřihlášené zákaznici na okamžik blikla hláška o prázdném košíku.
 */
export function useStrazceKroku(krok: 2 | 3 | 4): boolean {
  const router = useRouter();
  const { cart, nacteno, synchronizuje } = useCart();
  const { krokDopravyHotov, krokUdajuHotov, dokonceno } = usePokladna();
  const obnoveno = useContext(KontextObnoveni);

  const pripraveno = obnoveno && nacteno && !(synchronizuje && cart.length === 0);

  const cil =
    !pripraveno || dokonceno
      ? null
      : cart.length === 0
        ? '/kosik'
        : krok >= 3 && !krokUdajuHotov
          ? '/pokladna'
          : krok >= 4 && !krokDopravyHotov
            ? '/pokladna/doprava'
            : null;

  useEffect(() => {
    if (cil) router.replace(cil);
  }, [cil, router]);

  return dokonceno || (pripraveno && cil === null);
}
