'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Camera,
  ChevronDown,
  Factory,
  ImagePlus,
  Loader2,
  Plus,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import { nacist, poslatFormData, poslatJson } from '@/lib/api-klient';
import { Vyber } from '@/components/ui/Vyber';
import type { UlozenyVyrobce } from '@/app/api/admin/vyrobci/route';

/**
 * Formulář produktu pro obě situace – zakládání i editaci.
 *
 * Původně byl vypsaný zvlášť na stránce "nový produkt"; jakmile přibyla
 * editace, znamenalo by to dvě kopie, které se časem rozejdou. Rozdíl mezi
 * režimy je jen v tom, kam se posílá a jestli se fotky nahrávají rovnou
 * k produktu, nebo se drží v dočasném úložišti do uložení.
 */

export interface Kategorie {
  id: string;
  nazev: string;
  parent: { nazev: string } | null;
}

export interface VariantaFormular {
  klic: string;
  id?: string;
  velikost: string;
  skladem: number;
  obvodHrudniku: string;
  obvodPasu: string;
  obvodBoku: string;
  delka: string;
}

export interface PocatecniProdukt {
  id: string;
  nazev: string;
  popis: string;
  categoryId: string;
  cena: number;
  cenaPoSleve: number | null;
  znacka: string | null;
  material: string | null;
  udrzba: string | null;
  sku: string | null;

  // GPSR + nařízení o textilu – viz sekce „Zákonné údaje o výrobku“ ve formuláři.
  slozeniMaterialu: string | null;
  obsahujeZivocisneCasti: boolean;
  vyrobceNazev: string | null;
  vyrobceAdresa: string | null;
  vyrobceEmail: string | null;
  vyrobceMimoEu: boolean;
  odpovednaOsobaNazev: string | null;
  odpovednaOsobaAdresa: string | null;
  odpovednaOsobaEmail: string | null;
  bezpecnostniUpozorneni: string | null;
  ean: string | null;
  cisloSarze: string | null;
  zemePuvodu: string | null;

  aktivni: boolean;
  doporuceny: boolean;
  jeDarkovyPoukaz: boolean;
  varianty: VariantaFormular[];
}

/** Odpověď endpointu `/api/admin/upload`. */
interface NahranaFotka {
  token: string;
  puvodniNazev: string;
  velikostBajtu: number;
}

/**
 * Fotka v rozdělaném formuláři.
 *
 * `nahled` je `blob:` odkaz na soubor z disku. Hotové WebP varianty totiž
 * vzniknou až po uložení produktu (zpracuje je worker), takže do té doby není
 * co ze serveru zobrazit – a vybírat hlavní fotku podle názvu souboru je
 * hádání. Odkaz se po odebrání fotky i po odchodu z formuláře uvolňuje,
 * jinak by si prohlížeč držel celý soubor v paměti.
 */
interface FotkaVeFormulari extends NahranaFotka {
  nahled: string | null;
  jeHlavni: boolean;
}

interface Props {
  /** Vyplněné = editace, prázdné = nový produkt. */
  produkt?: PocatecniProdukt;
  /** Editace: fotky se nahrávají rovnou k produktu, tenhle blok se nezobrazuje. */
  skrytNahravaniFotek?: boolean;
}

/**
 * Klíč varianty musí být stabilní mezi vykreslením na serveru a hydratací
 * na klientovi – jinak React nahlásí neshodu a `htmlFor`/`id` se rozejdou,
 * takže kliknutí na popisek pole nezaostří input.
 *
 * Proto prostý čítač, ne Date.now()/Math.random(): počáteční stav formuláře
 * vyjde na obou stranách stejně a nové klíče vznikají až po interakci.
 */
let citacVariant = 0;

export function novaVarianta(jePoukaz: boolean): VariantaFormular {
  citacVariant += 1;
  return {
    klic: `nova-${citacVariant}`,
    velikost: jePoukaz ? '1000 Kč' : 'M (38)',
    skladem: 5,
    obvodHrudniku: '',
    obvodPasu: '',
    obvodBoku: '',
    delka: '',
  };
}

/** Počáteční varianta u nového produktu – pevný klíč, ať hydratace sedí. */
function prvniVarianta(): VariantaFormular {
  return {
    klic: 'vychozi',
    velikost: 'S (36)',
    skladem: 5,
    obvodHrudniku: '',
    obvodPasu: '',
    obvodBoku: '',
    delka: '',
  };
}

const POLE =
  'w-full bg-linda-sandLight shadow-neuInsetSm min-h-touch rounded-xl px-4 py-2.5 text-linda-espresso disabled:opacity-60';

/**
 * Tlačítko pro výběr fotek.
 *
 * Dřív tu byl podtržený textový odkaz uvnitř `<label>`, tedy dotykový cíl
 * vysoký jako řádek textu. Vyvýšená pilulka je 44 px a hlavně unese dvě
 * tlačítka vedle sebe – focení a výběr z galerie musí být oddělené vstupy,
 * protože `capture` na společném vstupu zakáže galerii úplně.
 */
const TLACITKO_FOTKY =
  'flex min-h-touch cursor-pointer items-center justify-center gap-2 rounded-full bg-linda-cream px-5 text-xs font-semibold text-linda-espresso shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm';

/** Hodnota, kterou `Vyber` používá pro „nevybráno“ – prázdný řetězec by kolidoval s názvem. */
const RUCNE = '__rucne__';

interface RozbalovaciProps {
  nadpis: string;
  popis?: string;
  /** Bloky, ve kterých už něco je, se otevřou samy – ale jen při prvním vykreslení. */
  vychoziOtevreno?: boolean;
  /** Obal bloku. Výchozí je vyvýšená karta; uvnitř varianty stačí předěl čarou. */
  trida?: string;
  children: React.ReactNode;
}

/**
 * Skládací blok pro pole, která u většiny kousků zůstanou prázdná.
 *
 * Nativní `<details>`, ne stav v Reactu: umí klávesnici, odečítač obrazovky
 * i hledání ve stránce – prohlížeč zavřený blok při Ctrl+F sám otevře, což
 * si vlastní implementace vynutit nedokáže.
 *
 * `open` se čte jen jednou (`useState` s počáteční hodnotou). Kdyby se počítal
 * při každém vykreslení, blok by se majitelce zavřel pod rukama ve chvíli,
 * kdy poslední pole vymaže.
 */
function Rozbalovaci({ nadpis, popis, vychoziOtevreno = false, trida, children }: RozbalovaciProps) {
  const [otevrenoNaZacatku] = useState(vychoziOtevreno);

  return (
    <details
      open={otevrenoNaZacatku}
      className={`group ${trida ?? 'rounded-xl bg-linda-cream p-4 shadow-neuSm'}`}
    >
      <summary className="flex min-h-touch cursor-pointer list-none items-center justify-between gap-3 text-xs [&::-webkit-details-marker]:hidden">
        <span>
          <span className="font-semibold text-linda-espresso">{nadpis}</span>
          {popis && <span className="mt-0.5 block text-[11px] text-linda-espresso/70">{popis}</span>}
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-linda-cognac transition-transform duration-200 group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="mt-3 space-y-4">{children}</div>
    </details>
  );
}

/** Kotva sekce s fotkami – cíl skoku, když server vrátí chybu `fotky`. */
const ID_SEKCE_FOTEK = 'sekce-fotek';

/**
 * Ke kterému prvku na stránce patří klíč chyby ze serveru.
 *
 * Většina klíčů se jmenuje stejně jako `id` pole, ale tři se liší:
 *
 *  · `categoryId` – hodnotu drží `Vyber`, jehož spouštěč má `id="kategorie"`;
 *  · `varianty.0.velikost` – `zodNaPole` skládá cestu tečkami, kdežto pole
 *    ve formuláři jsou pojmenovaná `velikost-<klíč varianty>`, protože
 *    varianty nemají stabilní index (dají se mazat i přidávat);
 *  · `fotky` – nepatří k žádnému poli. V zakládání míří na sekci s fotkami,
 *    při editaci na zaškrtávátko „Zveřejnit“, protože právě jeho zaškrtnutí
 *    tu chybu vyvolá (galerii tam spravuje `SpravaFotek` mimo formulář).
 */
function idPrvkuProChybu(
  klic: string,
  varianty: VariantaFormular[],
  skrytNahravaniFotek: boolean
): string | null {
  if (klic === 'categoryId') return 'kategorie';
  if (klic === 'fotky') return skrytNahravaniFotek ? 'aktivni' : ID_SEKCE_FOTEK;

  const shoda = /^varianty\.(\d+)\.(.+)$/.exec(klic);
  if (shoda) {
    const varianta = varianty[Number(shoda[1])];
    if (!varianta) return null;
    // `miry.obvodPasu` → `obvodPasu-<klíč>`, `velikost` → `velikost-<klíč>`
    return `${shoda[2].replace(/^miry\./, '')}-${varianta.klic}`;
  }

  return klic;
}

export function FormularProduktu({ produkt, skrytNahravaniFotek = false }: Props) {
  const router = useRouter();
  const jeEditace = Boolean(produkt);

  const [kategorie, setKategorie] = useState<Kategorie[]>([]);
  const [nacitamKategorie, setNacitamKategorie] = useState(true);

  /** Výrobci už použití v katalogu – jen předvyplnění, produkty se na ně nenavazují. */
  const [vyrobci, setVyrobci] = useState<UlozenyVyrobce[]>([]);

  const [form, setForm] = useState({
    nazev: produkt?.nazev ?? '',
    popis: produkt?.popis ?? '',
    categoryId: produkt?.categoryId ?? '',
    cena: produkt ? String(produkt.cena) : '',
    cenaPoSleve: produkt?.cenaPoSleve != null ? String(produkt.cenaPoSleve) : '',
    znacka: produkt?.znacka ?? '',
    material: produkt?.material ?? '',
    udrzba: produkt?.udrzba ?? '',
    sku: produkt?.sku ?? '',

    slozeniMaterialu: produkt?.slozeniMaterialu ?? '',
    obsahujeZivocisneCasti: produkt?.obsahujeZivocisneCasti ?? false,
    vyrobceNazev: produkt?.vyrobceNazev ?? '',
    vyrobceAdresa: produkt?.vyrobceAdresa ?? '',
    vyrobceEmail: produkt?.vyrobceEmail ?? '',
    vyrobceMimoEu: produkt?.vyrobceMimoEu ?? false,
    odpovednaOsobaNazev: produkt?.odpovednaOsobaNazev ?? '',
    odpovednaOsobaAdresa: produkt?.odpovednaOsobaAdresa ?? '',
    odpovednaOsobaEmail: produkt?.odpovednaOsobaEmail ?? '',
    bezpecnostniUpozorneni: produkt?.bezpecnostniUpozorneni ?? '',
    ean: produkt?.ean ?? '',
    cisloSarze: produkt?.cisloSarze ?? '',
    zemePuvodu: produkt?.zemePuvodu ?? '',
    aktivni: produkt?.aktivni ?? true,
    doporuceny: produkt?.doporuceny ?? false,
    jeDarkovyPoukaz: produkt?.jeDarkovyPoukaz ?? false,
  });

  const [varianty, setVarianty] = useState<VariantaFormular[]>(
    produkt?.varianty.length ? produkt.varianty : [prvniVarianta()]
  );

  const [fotky, setFotky] = useState<FotkaVeFormulari[]>([]);
  const [nahravam, setNahravam] = useState(false);
  const [odesilam, setOdesilam] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [chybyPoli, setChybyPoli] = useState<Record<string, string>>({});

  useEffect(() => {
    let zruseno = false;

    void (async () => {
      const vysledek = await nacist<{ kategorie: Kategorie[] }>('/api/admin/kategorie');
      if (zruseno) return;

      if (vysledek.ok) {
        setKategorie(vysledek.data.kategorie);
        setForm((p) => (p.categoryId ? p : { ...p, categoryId: vysledek.data.kategorie[0]?.id ?? '' }));
      } else {
        setChyba(vysledek.chyba);
      }
      setNacitamKategorie(false);
    })();

    /*
     * Výrobci jsou pohodlí, ne podmínka uložení – když se seznam nenačte,
     * formulář jen nenabídne předvyplnění a pole se vyplní ručně. Chyba se
     * proto nikam nehlásí, aby nepřebila skutečnou chybu z kategorií.
     */
    void (async () => {
      const vysledek = await nacist<{ vyrobci: UlozenyVyrobce[] }>('/api/admin/vyrobci');
      if (!zruseno && vysledek.ok) setVyrobci(vysledek.data.vyrobci);
    })();

    return () => {
      zruseno = true;
    };
  }, []);

  /** Předvyplní celý blok výrobce podle dřív uloženého kousku. */
  const pouzitVyrobce = (nazev: string) => {
    const v = vyrobci.find((x) => x.nazev === nazev);
    if (!v) return;

    setForm((p) => ({
      ...p,
      vyrobceNazev: v.nazev,
      vyrobceAdresa: v.adresa,
      vyrobceEmail: v.email,
      vyrobceMimoEu: v.mimoEu,
      odpovednaOsobaNazev: v.odpovednaOsobaNazev ?? '',
      odpovednaOsobaAdresa: v.odpovednaOsobaAdresa ?? '',
      odpovednaOsobaEmail: v.odpovednaOsobaEmail ?? '',
      // Země původu je u téhož dodavatele skoro vždycky stejná, ale je to
      // údaj o zboží, ne o výrobci – proto se doplní jen do prázdného pole.
      zemePuvodu: p.zemePuvodu || (v.zemePuvodu ?? ''),
    }));
  };

  /** Odkazy na náhledy, ať je po odchodu z formuláře uvolníme všechny. */
  const nahledy = useRef<string[]>([]);

  useEffect(() => {
    const vytvorene = nahledy.current;
    return () => vytvorene.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const nahratFotky = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const vybrane = e.target.files;
    if (!vybrane || vybrane.length === 0) return;

    setNahravam(true);
    setChyba(null);

    const soubory = Array.from(vybrane);
    const data = new FormData();
    for (const soubor of soubory) data.append('fotky', soubor);

    const vysledek = await poslatFormData<{
      nahrane: NahranaFotka[];
      odmitnute: Array<{ nazev: string; duvod: string }>;
    }>('/api/admin/upload', data);

    if (vysledek.ok) {
      /*
       * Náhled se páruje podle názvu souboru, ne podle pořadí: server
       * odmítnuté soubory z odpovědi vynechá, takže by se indexy rozešly
       * a u fotky by se ukázal náhled jiné. Stejné názvy řeší fronta.
       */
      const podleNazvu = new Map<string, File[]>();
      for (const soubor of soubory) {
        const fronta = podleNazvu.get(soubor.name) ?? [];
        fronta.push(soubor);
        podleNazvu.set(soubor.name, fronta);
      }

      const nove: FotkaVeFormulari[] = vysledek.data.nahrane.map((nahrana) => {
        const soubor = podleNazvu.get(nahrana.puvodniNazev)?.shift();
        const nahled = soubor ? URL.createObjectURL(soubor) : null;
        if (nahled) nahledy.current.push(nahled);

        return { ...nahrana, nahled, jeHlavni: false };
      });

      // Bez hlavní fotky by se produkt v katalogu ukázal se zástupným
      // symbolem, i když fotky má – první nahraná ji tedy přebírá sama.
      setFotky((p) => {
        const spojene = [...p, ...nove];
        return spojene.some((f) => f.jeHlavni)
          ? spojene
          : spojene.map((f, i) => ({ ...f, jeHlavni: i === 0 }));
      });

      if (vysledek.data.odmitnute.length > 0) {
        setChyba(vysledek.data.odmitnute.map((o) => `${o.nazev}: ${o.duvod}`).join(' '));
      }
    } else {
      setChyba(vysledek.chyba);
    }

    setNahravam(false);
    e.target.value = '';
  };

  const nastavitHlavni = (token: string) =>
    setFotky((p) => p.map((f) => ({ ...f, jeHlavni: f.token === token })));

  /** Posun v pořadí; pořadí v seznamu určuje, jak se fotky zobrazí na detailu. */
  const posunout = (index: number, smer: -1 | 1) =>
    setFotky((p) => {
      const cil = index + smer;
      if (cil < 0 || cil >= p.length) return p;

      const zmenene = [...p];
      [zmenene[index], zmenene[cil]] = [zmenene[cil], zmenene[index]];
      return zmenene;
    });

  const odebratFotku = (token: string) =>
    setFotky((p) => {
      const odebirana = p.find((f) => f.token === token);
      if (odebirana?.nahled) {
        URL.revokeObjectURL(odebirana.nahled);
        nahledy.current = nahledy.current.filter((url) => url !== odebirana.nahled);
      }

      const zbytek = p.filter((f) => f.token !== token);

      // Po smazání hlavní fotky roli přebírá první zbylá.
      return zbytek.some((f) => f.jeHlavni)
        ? zbytek
        : zbytek.map((f, i) => ({ ...f, jeHlavni: i === 0 }));
    });

  /**
   * Skok na první chybně vyplněné pole.
   *
   * Kontrolu dělá server, ne `required`, takže prohlížeč sám nic nezaostří.
   * Hláška se přitom vypisuje nahoře nad formulářem, ale odesílá se tlačítkem
   * úplně dole – na telefonu jsou to čtyři obrazovky od sebe a po neúspěšném
   * uložení nebylo vidět vůbec nic. Formulář má ~30 polí, takže „najdi si to
   * sama“ tu není odpověď.
   *
   * Pořadí bereme z DOM (`compareDocumentPosition`), ne z pořadí klíčů
   * v odpovědi: Zod je vrací v pořadí schématu, které se s pořadím polí na
   * stránce neshoduje (GPSR údaje jsou ve schématu dřív než popis).
   */
  const zaostritPrvniChybu = (pole: Record<string, string>) => {
    const prvky = Object.keys(pole)
      .map((klic) => idPrvkuProChybu(klic, varianty, skrytNahravaniFotek))
      .flatMap((id) => (id ? [document.getElementById(id)] : []))
      .filter((el): el is HTMLElement => el !== null);

    if (prvky.length === 0) return;

    const prvni = prvky.reduce((a, b) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING ? b : a
    );

    /* Zavřený `<details>` se sám neotevře, takže by skrol skončil na prvku
       nulové výšky a chybu by nikdo neuviděl. Otevíráme celý řetěz nadřazených
       bloků – míry varianty jsou zanořené o dvě úrovně. */
    let blok = prvni.closest('details');
    while (blok) {
      blok.open = true;
      blok = blok.parentElement?.closest('details') ?? null;
    }

    /* `scrollIntoView` s `behavior: 'smooth'` přebíjí i `scroll-behavior`
       z CSS, takže pravidlo pro `prefers-reduced-motion` v `globals.css` by
       se tudy obešlo. Ptáme se proto přímo. */
    const bezPohybu = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    prvni.scrollIntoView({ block: 'center', behavior: bezPohybu ? 'auto' : 'smooth' });
    prvni.focus({ preventScroll: true });
  };

  const ulozit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (odesilam) return;

    setOdesilam(true);
    setChyba(null);
    setChybyPoli({});

    const telo = {
      nazev: form.nazev,
      popis: form.popis,
      categoryId: form.categoryId,
      cena: form.cena,
      cenaPoSleve: form.cenaPoSleve === '' ? null : form.cenaPoSleve,
      znacka: form.znacka || null,
      material: form.material || null,
      udrzba: form.udrzba || null,
      sku: form.sku || null,

      slozeniMaterialu: form.slozeniMaterialu || null,
      obsahujeZivocisneCasti: form.obsahujeZivocisneCasti,
      vyrobceNazev: form.vyrobceNazev || null,
      vyrobceAdresa: form.vyrobceAdresa || null,
      vyrobceEmail: form.vyrobceEmail || null,
      vyrobceMimoEu: form.vyrobceMimoEu,
      /*
       * U výrobce z EU se odpovědná osoba neposílá, i kdyby v poli něco
       * zbylo po dřívějším vyplnění. Blok je v takovém případě skrytý, takže
       * hodnota, kterou nikdo nevidí, by se jinak tiše dostala na stránku
       * produktu jako platný kontakt podle čl. 16 GPSR.
       */
      odpovednaOsobaNazev: (form.vyrobceMimoEu && form.odpovednaOsobaNazev) || null,
      odpovednaOsobaAdresa: (form.vyrobceMimoEu && form.odpovednaOsobaAdresa) || null,
      odpovednaOsobaEmail: (form.vyrobceMimoEu && form.odpovednaOsobaEmail) || null,
      bezpecnostniUpozorneni: form.bezpecnostniUpozorneni || null,
      ean: form.ean || null,
      cisloSarze: form.cisloSarze || null,
      zemePuvodu: form.zemePuvodu || null,
      aktivni: form.aktivni,
      doporuceny: form.doporuceny,
      jeDarkovyPoukaz: form.jeDarkovyPoukaz,
      varianty: varianty.map((v) => ({
        ...(v.id ? { id: v.id } : {}),
        velikost: v.velikost,
        skladem: v.skladem,
        miry: form.jeDarkovyPoukaz
          ? null
          : {
              obvodHrudniku: v.obvodHrudniku || null,
              obvodPasu: v.obvodPasu || null,
              obvodBoku: v.obvodBoku || null,
              delka: v.delka || null,
            },
      })),
      // Pořadí v poli = pořadí fotek na detailu produktu, `jeHlavni` = ta první.
      fotky: fotky.map((f) => ({
        token: f.token,
        puvodniNazev: f.puvodniNazev,
        jeHlavni: f.jeHlavni,
      })),
    };

    const vysledek = jeEditace
      ? await poslatJson<{ id: string }>(`/api/admin/produkty/${produkt!.id}`, telo, 'PUT')
      : await poslatJson<{ id: string }>('/api/admin/produkty', telo);

    if (!vysledek.ok) {
      const pole = vysledek.pole ?? {};
      setChyba(vysledek.chyba);
      setChybyPoli(pole);
      setOdesilam(false);

      /* Až po překreslení. Dokud React nezpracuje `setOdesilam(false)`, mají
         všechna pole pořád `disabled` – a zakázaný prvek fokus nepřijme, takže
         by spadl na `<body>` a skok by sice odskroloval, ale kurzor by nikam
         nesedl. Automatické dávkování v Reactu 18 se vyplaví v mikroúloze,
         `requestAnimationFrame` běží až po ní. */
      requestAnimationFrame(() => zaostritPrvniChybu(pole));
      return;
    }

    router.push(`/admin/produkty/${vysledek.data.id}`);
    router.refresh();
  };

  const chybaPole = (klic: string) =>
    chybyPoli[klic] ? (
      <p role="alert" className="mt-1.5 text-[11px] font-medium text-red-800">
        {chybyPoli[klic]}
      </p>
    ) : null;

  return (
    <form onSubmit={ulozit} className="space-y-8">
      {chyba && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-linda-sandLight p-3 text-xs font-medium text-red-800 shadow-neuInsetSm"
        >
          <AlertCircle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
          {chyba}
        </p>
      )}

      <div className="flex items-center justify-between gap-4 rounded-2xl bg-linda-cream p-4 shadow-neu">
        <div>
          <h2 className="text-xs font-semibold text-linda-espresso">Jedná se o dárkový poukaz?</h2>
          <p className="text-[11px] text-linda-espresso/70">
            Pokud aktivujete, skryjí se pole pro míry, materiál a péči. Varianty se použijí jako částky.
          </p>
        </div>
        <input
          type="checkbox"
          aria-label="Produkt je dárkový poukaz"
          checked={form.jeDarkovyPoukaz}
          disabled={odesilam}
          onChange={(e) => setForm({ ...form, jeDarkovyPoukaz: e.target.checked })}
          className="h-5 w-5 cursor-pointer accent-linda-cognac"
        />
      </div>

      <div className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu">
        <h2 className="font-serif text-xl text-linda-espresso">Základní údaje</h2>

        <div className="space-y-4 text-xs">
          <div>
            <label htmlFor="nazev" className="mb-1 block font-semibold text-linda-espresso">
              Název produktu *
            </label>
            <input
              id="nazev"
              type="text"
              required
              disabled={odesilam}
              value={form.nazev}
              onChange={(e) => setForm({ ...form, nazev: e.target.value })}
              placeholder="Např. Hedvábné šaty Bellissima"
              aria-invalid={chybyPoli.nazev ? true : undefined}
              className={POLE}
            />
            {chybaPole('nazev')}
          </div>

          <div>
            <label htmlFor="kategorie" className="mb-1 block font-semibold text-linda-espresso">
              Kategorie *
            </label>
            <Vyber
              id="kategorie"
              povinne
              disabled={odesilam || nacitamKategorie}
              hodnota={form.categoryId}
              onZmena={(hodnota) => setForm({ ...form, categoryId: hodnota })}
              trida="w-full"
              /* Prázdný seznam si `Vyber` zakáže sám – zbývá říct proč. */
              zastupnyText={nacitamKategorie ? 'Načítám kategorie…' : 'Nejdřív založte kategorii'}
              moznosti={kategorie.map((k) => ({
                hodnota: k.id,
                popisek: k.parent ? `${k.parent.nazev} → ${k.nazev}` : k.nazev,
              }))}
            />
            {chybaPole('categoryId')}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cena" className="mb-1 block font-semibold text-linda-espresso">
                Cena (Kč) *
              </label>
              <input
                id="cena"
                type="number"
                min="1"
                step="1"
                required
                disabled={odesilam}
                value={form.cena}
                onChange={(e) => setForm({ ...form, cena: e.target.value })}
                placeholder="3490"
                className={POLE}
              />
              {chybaPole('cena')}
            </div>

            <div>
              <label htmlFor="cenaPoSleve" className="mb-1 block font-semibold text-linda-espresso">
                Akční cena (volitelně)
              </label>
              <input
                id="cenaPoSleve"
                type="number"
                min="1"
                step="1"
                disabled={odesilam}
                value={form.cenaPoSleve}
                onChange={(e) => setForm({ ...form, cenaPoSleve: e.target.value })}
                placeholder="2990"
                className={POLE}
              />
              {chybaPole('cenaPoSleve')}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="znacka" className="mb-1 block font-semibold text-linda-espresso">
                Značka / designér
              </label>
              <input
                id="znacka"
                type="text"
                disabled={odesilam}
                value={form.znacka}
                onChange={(e) => setForm({ ...form, znacka: e.target.value })}
                placeholder="Např. Milano Elegance"
                className={POLE}
              />
            </div>

            <div>
              <label htmlFor="sku" className="mb-1 block font-semibold text-linda-espresso">
                SKU (skladové číslo)
              </label>
              <input
                id="sku"
                type="text"
                disabled={odesilam}
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="LF-SAT-001"
                className={POLE}
              />
              {chybaPole('sku')}
            </div>
          </div>

          <div>
            <label htmlFor="popis" className="mb-1 block font-semibold text-linda-espresso">
              Popis produktu *
            </label>
            <textarea
              id="popis"
              rows={4}
              required
              disabled={odesilam}
              value={form.popis}
              onChange={(e) => setForm({ ...form, popis: e.target.value })}
              placeholder="Popis střihu, stylu a vlastností…"
              className={POLE}
            />
            {chybaPole('popis')}
          </div>
        </div>
      </div>

      {/*
        Materiál na jednom místě.
        Složení a volný popis stály dřív v samostatných sekcích přes půl
        formuláře od sebe, takže druhý zápis vypadal jako omylem zdvojený
        první. Vedle sebe je vidět, že jsou to dvě různé věci: procenta
        vyžaduje zákon, prózu čte zákaznice.
      */}
      {!form.jeDarkovyPoukaz && (
        <div className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu">
          <div>
            <h2 className="font-serif text-xl text-linda-espresso">Materiál a péče</h2>
            <p className="mt-1 text-xs text-linda-espresso/70">
              Materiálové složení vyžaduje nařízení EU 1007/2011 o textilu – bez něj produkt nelze
              uložit. Zbylá dvě pole jsou volný popis a jsou nepovinná.
            </p>
          </div>

          <div>
            <label htmlFor="slozeniMaterialu" className="mb-1 block text-xs font-semibold text-linda-espresso">
              Materiálové složení <span className="text-linda-cognac">*</span>
            </label>
            <input
              id="slozeniMaterialu"
              type="text"
              disabled={odesilam}
              value={form.slozeniMaterialu}
              onChange={(e) => setForm({ ...form, slozeniMaterialu: e.target.value })}
              placeholder="Např. 55 % len, 45 % bavlna"
              aria-invalid={chybyPoli.slozeniMaterialu ? true : undefined}
              aria-describedby="slozeniMaterialu-napoveda"
              className={POLE}
            />
            <p id="slozeniMaterialu-napoveda" className="mt-1 text-[11px] text-linda-espresso/70">
              V procentech hmotnosti, sestupně. Volný popis („jemný praný len“) patří do pole
              Materiál níž – zákon vyžaduje procenta.
            </p>
            {chybyPoli.slozeniMaterialu && (
              <p className="mt-1 text-[11px] font-medium text-linda-cognac">{chybyPoli.slozeniMaterialu}</p>
            )}
          </div>

          {/*
            Čl. 12 nařízení o textilu. Zaškrtávátko, ne volný text: zákon předepisuje
            konkrétní větu, takže jediné rozhodnutí je „ano, nebo ne“ – formulaci
            si nemá vymýšlet každý produkt zvlášť.
          */}
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-linda-sandLight p-4 text-xs shadow-neuInsetSm">
            <input
              type="checkbox"
              disabled={odesilam}
              checked={form.obsahujeZivocisneCasti}
              onChange={(e) => setForm({ ...form, obsahujeZivocisneCasti: e.target.checked })}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-linda-cognac"
            />
            <span className="text-linda-espresso/85">
              <strong className="font-semibold text-linda-espresso">
                Obsahuje netextilní části živočišného původu
              </strong>
              <br />
              Zaškrtněte u kožených pásků a výpustků, kožešinových límců, perleťových či rohových
              knoflíků. Složení vláken tuhle povinnost nesplní – popisuje jen textilní část.
            </span>
          </label>

          <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
            <div>
              <label htmlFor="material" className="mb-1 block font-semibold text-linda-espresso">
                Materiál – volný popis
              </label>
              <input
                id="material"
                type="text"
                disabled={odesilam}
                value={form.material}
                onChange={(e) => setForm({ ...form, material: e.target.value })}
                placeholder="Např. jemný praný len"
                className={POLE}
              />
            </div>

            <div>
              <label htmlFor="udrzba" className="mb-1 block font-semibold text-linda-espresso">
                Údržba a péče
              </label>
              <input
                id="udrzba"
                type="text"
                disabled={odesilam}
                value={form.udrzba}
                onChange={(e) => setForm({ ...form, udrzba: e.target.value })}
                placeholder="Např. šetrné ruční praní na 30 °C"
                className={POLE}
              />
            </div>
          </div>
        </div>
      )}

      {/*
        Výrobce podle GPSR.
        Vlastní sekce, ne přívažek k materiálu: bez těchhle údajů se zboží
        nesmí nabízet, a formulář to má dát najevo.
      */}
      {!form.jeDarkovyPoukaz && (
        <div className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu">
          <div>
            <h2 className="font-serif text-xl text-linda-espresso">Výrobce</h2>
            <p className="mt-1 text-xs text-linda-espresso/70">
              Vyžaduje nařízení EU 2023/988 (GPSR). Bez údajů o výrobci produkt nelze uložit –
              zboží bez nich se nesmí nabízet.
            </p>
          </div>

          {/*
            Butik odebírá od hrstky dodavatelů, takže se tři pole přepisovala
            u každého kousku znovu. Nabídka je jen předvyplnění: produkt si
            údaje nese dál sám, aby platily i po tom, co dodavatel skončí.
          */}
          {vyrobci.length > 0 && (
            <div className="text-xs">
              <label htmlFor="ulozeny-vyrobce" className="mb-1 block font-semibold text-linda-espresso">
                Převzít od dříve zadaného výrobce
              </label>
              <Vyber
                id="ulozeny-vyrobce"
                trida="w-full"
                disabled={odesilam}
                ikona={<Factory className="h-3.5 w-3.5" aria-hidden="true" />}
                hodnota={vyrobci.some((v) => v.nazev === form.vyrobceNazev) ? form.vyrobceNazev : RUCNE}
                onZmena={(hodnota) =>
                  hodnota === RUCNE
                    ? setForm((p) => ({
                        ...p,
                        vyrobceNazev: '',
                        vyrobceAdresa: '',
                        vyrobceEmail: '',
                        vyrobceMimoEu: false,
                        odpovednaOsobaNazev: '',
                        odpovednaOsobaAdresa: '',
                        odpovednaOsobaEmail: '',
                      }))
                    : pouzitVyrobce(hodnota)
                }
                moznosti={[
                  { hodnota: RUCNE, popisek: 'Nový výrobce – vyplnit ručně' },
                  ...vyrobci.map((v) => ({ hodnota: v.nazev, popisek: v.nazev, poznamka: v.adresa })),
                ]}
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-3">
            <div>
              <label htmlFor="vyrobceNazev" className="mb-1 block font-semibold text-linda-espresso">
                Výrobce – název <span className="text-linda-cognac">*</span>
              </label>
              <input
                id="vyrobceNazev"
                type="text"
                disabled={odesilam}
                value={form.vyrobceNazev}
                onChange={(e) => setForm({ ...form, vyrobceNazev: e.target.value })}
                placeholder="Např. Tessitura Bellini S.r.l."
                aria-invalid={chybyPoli.vyrobceNazev ? true : undefined}
                className={POLE}
              />
              {chybyPoli.vyrobceNazev && (
                <p className="mt-1 text-[11px] font-medium text-linda-cognac">{chybyPoli.vyrobceNazev}</p>
              )}
            </div>

            <div>
              <label htmlFor="vyrobceAdresa" className="mb-1 block font-semibold text-linda-espresso">
                Výrobce – adresa <span className="text-linda-cognac">*</span>
              </label>
              <input
                id="vyrobceAdresa"
                type="text"
                disabled={odesilam}
                value={form.vyrobceAdresa}
                onChange={(e) => setForm({ ...form, vyrobceAdresa: e.target.value })}
                placeholder="Via Roma 12, 50123 Firenze, Itálie"
                aria-invalid={chybyPoli.vyrobceAdresa ? true : undefined}
                className={POLE}
              />
              {chybyPoli.vyrobceAdresa && (
                <p className="mt-1 text-[11px] font-medium text-linda-cognac">{chybyPoli.vyrobceAdresa}</p>
              )}
            </div>

            <div>
              <label htmlFor="vyrobceEmail" className="mb-1 block font-semibold text-linda-espresso">
                Výrobce – e-mail <span className="text-linda-cognac">*</span>
              </label>
              <input
                id="vyrobceEmail"
                type="email"
                disabled={odesilam}
                value={form.vyrobceEmail}
                onChange={(e) => setForm({ ...form, vyrobceEmail: e.target.value })}
                placeholder="info@vyrobce.it"
                aria-invalid={chybyPoli.vyrobceEmail ? true : undefined}
                className={POLE}
              />
              {chybyPoli.vyrobceEmail && (
                <p className="mt-1 text-[11px] font-medium text-linda-cognac">{chybyPoli.vyrobceEmail}</p>
              )}
            </div>
          </div>

          {/*
            Sídlo výrobce rozhoduje o povinnosti odpovědné osoby (čl. 19 písm. b
            GPSR), takže se na to musí zeptat formulář. Dokud to nikdo nevěděl,
            byla prázdná odpovědná osoba vždycky platná odpověď – u dodavatele
            mimo Unii ale povinnost neplní a zboží se nesmí nabízet.

            U českého i italského dodavatele je tím zároveň o tři pole míň.
          */}
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-linda-sandLight p-4 text-xs shadow-neuInsetSm">
            <input
              type="checkbox"
              disabled={odesilam}
              checked={form.vyrobceMimoEu}
              onChange={(e) => setForm({ ...form, vyrobceMimoEu: e.target.checked })}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-linda-cognac"
            />
            <span className="text-linda-espresso/85">
              <strong className="font-semibold text-linda-espresso">Výrobce sídlí mimo EU</strong>
              <br />
              Pak je potřeba i odpovědná osoba usazená v Unii – dovozce nebo zplnomocněný zástupce,
              na kterého se obrací zákaznice i dozorový orgán (čl. 16 GPSR).
            </span>
          </label>

          {form.vyrobceMimoEu && (
          <div className="space-y-4 rounded-xl bg-linda-cream p-4 shadow-neuSm">
            <p className="text-[11px] text-linda-espresso/80">
              <strong className="font-semibold">Odpovědná osoba v EU</strong> – povinná, protože
              výrobce nesídlí v Evropské unii. Vyplňte všechna tři pole.
            </p>

            <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-3">
              <div>
                <label htmlFor="odpovednaOsobaNazev" className="mb-1 block font-semibold text-linda-espresso">
                  Název <span className="text-linda-cognac">*</span>
                </label>
                <input
                  id="odpovednaOsobaNazev"
                  type="text"
                  disabled={odesilam}
                  value={form.odpovednaOsobaNazev}
                  onChange={(e) => setForm({ ...form, odpovednaOsobaNazev: e.target.value })}
                  aria-invalid={chybyPoli.odpovednaOsobaNazev ? true : undefined}
                  className={POLE}
                />
              </div>

              <div>
                <label htmlFor="odpovednaOsobaAdresa" className="mb-1 block font-semibold text-linda-espresso">
                  Adresa <span className="text-linda-cognac">*</span>
                </label>
                <input
                  id="odpovednaOsobaAdresa"
                  type="text"
                  disabled={odesilam}
                  value={form.odpovednaOsobaAdresa}
                  onChange={(e) => setForm({ ...form, odpovednaOsobaAdresa: e.target.value })}
                  aria-invalid={chybyPoli.odpovednaOsobaNazev ? true : undefined}
                  className={POLE}
                />
              </div>

              <div>
                <label htmlFor="odpovednaOsobaEmail" className="mb-1 block font-semibold text-linda-espresso">
                  E-mail <span className="text-linda-cognac">*</span>
                </label>
                <input
                  id="odpovednaOsobaEmail"
                  type="email"
                  disabled={odesilam}
                  value={form.odpovednaOsobaEmail}
                  onChange={(e) => setForm({ ...form, odpovednaOsobaEmail: e.target.value })}
                  aria-invalid={chybyPoli.odpovednaOsobaNazev ? true : undefined}
                  className={POLE}
                />
              </div>
            </div>

            {chybyPoli.odpovednaOsobaNazev && (
              <p role="alert" className="text-[11px] font-medium text-linda-cognac">
                {chybyPoli.odpovednaOsobaNazev}
              </p>
            )}
          </div>
          )}

          {/*
            Zbytek GPSR čl. 19 je nepovinný: výrobek identifikuje název, typ
            a fotka, další značení má jen část zboží. Vybalené to vypadalo
            jako čtyři další povinnosti a formulář kvůli tomu působil dvakrát
            delší, než ve skutečnosti je.
          */}
          <Rozbalovaci
            nadpis="Další značení a upozornění"
            popis="EAN, šarže, země původu, bezpečnostní věty – nepovinné, vyplňte, co výrobek nese"
            vychoziOtevreno={Boolean(
              form.ean || form.cisloSarze || form.zemePuvodu || form.bezpecnostniUpozorneni
            )}
          >
          <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-3">
            <div>
              <label htmlFor="ean" className="mb-1 block font-semibold text-linda-espresso">
                EAN / čárový kód
              </label>
              <input
                id="ean"
                type="text"
                /* Čárový kód je čistě číselný, ale `type="number"` by ho
                   zkazil: usekl by vodicí nulu a přidal šipky nahoru/dolů.
                   `inputMode` mění jen klávesnici na telefonu. */
                inputMode="numeric"
                disabled={odesilam}
                value={form.ean}
                onChange={(e) => setForm({ ...form, ean: e.target.value })}
                className={POLE}
              />
            </div>

            <div>
              <label htmlFor="cisloSarze" className="mb-1 block font-semibold text-linda-espresso">
                Číslo šarže / série
              </label>
              <input
                id="cisloSarze"
                type="text"
                disabled={odesilam}
                value={form.cisloSarze}
                onChange={(e) => setForm({ ...form, cisloSarze: e.target.value })}
                className={POLE}
              />
            </div>

            <div>
              <label htmlFor="zemePuvodu" className="mb-1 block font-semibold text-linda-espresso">
                Země původu
              </label>
              <input
                id="zemePuvodu"
                type="text"
                disabled={odesilam}
                value={form.zemePuvodu}
                onChange={(e) => setForm({ ...form, zemePuvodu: e.target.value })}
                placeholder="Např. Itálie"
                className={POLE}
              />
            </div>
          </div>

          <div>
            <label htmlFor="bezpecnostniUpozorneni" className="mb-1 block text-xs font-semibold text-linda-espresso">
              Bezpečnostní a varovné informace
            </label>
            <textarea
              id="bezpecnostniUpozorneni"
              rows={3}
              disabled={odesilam}
              value={form.bezpecnostniUpozorneni}
              onChange={(e) => setForm({ ...form, bezpecnostniUpozorneni: e.target.value })}
              placeholder="Např. Obsahuje drobné části – nevhodné pro děti do 3 let."
              className={POLE}
            />
            <p className="mt-1 text-[11px] text-linda-espresso/70">
              Vyplňte, pokud výrobek nese varování na visačce nebo obalu (čl. 19 GPSR). Česky –
              nařízení žádá jazyk, kterému zákaznice rozumí.
            </p>
          </div>
          </Rozbalovaci>
        </div>
      )}

      {!skrytNahravaniFotek && (
        <div id={ID_SEKCE_FOTEK} className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu">
          <div>
            <h2 className="font-serif text-xl text-linda-espresso">
              Fotografie{!form.jeDarkovyPoukaz && <span className="text-linda-cognac"> *</span>}
            </h2>
            {!form.jeDarkovyPoukaz && (
              <p className="mt-1 text-xs text-linda-espresso/70">
                Vyobrazení výrobku je náležitost nabídky na dálku (čl. 19 GPSR), ne ozdoba. Bez
                fotky lze produkt uložit jen jako koncept.
              </p>
            )}
          </div>

          {chybaPole('fotky')}

          <div className="space-y-2 rounded-2xl border-2 border-dashed border-linda-sand p-6 text-center">
            {nahravam ? (
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-linda-cognac" aria-hidden="true" />
            ) : (
              <Upload className="mx-auto h-8 w-8 text-linda-cognac opacity-60" aria-hidden="true" />
            )}

            <div className={`flex flex-col gap-2 sm:flex-row sm:justify-center ${nahravam || odesilam ? 'pointer-events-none opacity-60' : ''}`}>
              <label className={TLACITKO_FOTKY}>
                <Camera className="h-4 w-4 shrink-0 text-linda-cognac" aria-hidden="true" />
                {nahravam ? 'Nahrávám…' : 'Vyfotit'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  capture="environment"
                  disabled={nahravam || odesilam}
                  onChange={nahratFotky}
                  className="hidden"
                />
              </label>

              <label className={TLACITKO_FOTKY}>
                <ImagePlus className="h-4 w-4 shrink-0 text-linda-cognac" aria-hidden="true" />
                Vybrat z galerie
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  disabled={nahravam || odesilam}
                  onChange={nahratFotky}
                  className="hidden"
                />
              </label>
            </div>

            <p className="text-[10px] text-linda-espresso/70">
              JPEG, PNG, WebP nebo AVIF, nejvýš 15 MB na fotku. Můžete jich vybrat víc najednou.
              Zmenšení a převod do WebP proběhne na pozadí po uložení produktu – čekat na to nemusíte.
            </p>
          </div>

          {fotky.length > 0 && (
            <>
              <p className="text-[11px] text-linda-espresso/75">
                Hvězdičkou určíte <strong>hlavní fotku</strong> – ta se zobrazí v katalogu, v košíku
                i na sociálních sítích. Šipkami změníte pořadí, v jakém se fotky ukážou na detailu
                produktu.
              </p>

              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {fotky.map((fotka, index) => (
                  <li key={fotka.token} className="space-y-2 rounded-xl bg-linda-cream p-3 shadow-neuSm">
                    <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-linda-sandLight shadow-neuInsetSm">
                      {fotka.nahled ? (
                        /* `unoptimized`: zdrojem je `blob:` odkaz na soubor
                           z disku, který optimalizační služba Nextu neumí
                           načíst – hotové varianty vzniknou až po uložení. */
                        <Image
                          src={fotka.nahled}
                          alt={`Náhled ${fotka.puvodniNazev}`}
                          fill
                          unoptimized
                          sizes="(max-width: 640px) 50vw, 200px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center p-2 text-center text-[10px] text-linda-espresso/70">
                          {fotka.puvodniNazev}
                        </span>
                      )}

                      {fotka.jeHlavni && (
                        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-linda-sageLight px-2 py-1 text-[10px] font-semibold text-linda-sage">
                          <Star className="h-3 w-3 fill-linda-sage" aria-hidden="true" />
                          Hlavní
                        </span>
                      )}

                      {/* Pořadové číslo – aby „která první, která druhá“ šlo
                          přečíst z dlaždice, ne odvozovat z pozice v mřížce. */}
                      <span
                        aria-hidden="true"
                        className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-linda-cream text-[10px] font-bold text-linda-espresso shadow-neuSm"
                      >
                        {index + 1}
                      </span>
                    </div>

                    <p className="truncate text-[10px] text-linda-espresso/70" title={fotka.puvodniNazev}>
                      {fotka.puvodniNazev} · {(fotka.velikostBajtu / 1024 / 1024).toFixed(1)} MB
                    </p>

                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => nastavitHlavni(fotka.token)}
                        disabled={fotka.jeHlavni || odesilam}
                        aria-label={
                          fotka.jeHlavni
                            ? `${fotka.puvodniNazev} je hlavní fotka`
                            : `Nastavit ${fotka.puvodniNazev} jako hlavní fotku`
                        }
                        className={`flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-full bg-linda-cream shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm disabled:cursor-default disabled:shadow-none ${
                          fotka.jeHlavni ? 'text-linda-sage' : 'text-linda-espresso/70'
                        }`}
                      >
                        <Star
                          className={`h-4 w-4 ${fotka.jeHlavni ? 'fill-linda-sage' : ''}`}
                          aria-hidden="true"
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => posunout(index, -1)}
                        disabled={index === 0 || odesilam}
                        aria-label={`Posunout ${fotka.puvodniNazev} dopředu`}
                        className="flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-full bg-linda-cream text-linda-espresso/70 shadow-neuSm transition-all duration-200 hover:text-linda-cognac hover:shadow-neu active:shadow-neuInsetSm disabled:cursor-default disabled:opacity-40 disabled:shadow-none"
                      >
                        <ArrowUp className="h-4 w-4" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={() => posunout(index, 1)}
                        disabled={index === fotky.length - 1 || odesilam}
                        aria-label={`Posunout ${fotka.puvodniNazev} dozadu`}
                        className="flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-full bg-linda-cream text-linda-espresso/70 shadow-neuSm transition-all duration-200 hover:text-linda-cognac hover:shadow-neu active:shadow-neuInsetSm disabled:cursor-default disabled:opacity-40 disabled:shadow-none"
                      >
                        <ArrowDown className="h-4 w-4" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={() => odebratFotku(fotka.token)}
                        disabled={odesilam}
                        aria-label={`Odebrat fotku ${fotka.puvodniNazev}`}
                        className="flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-full bg-linda-cream text-linda-espresso/70 shadow-neuSm transition-all duration-200 hover:text-red-800 hover:shadow-neu active:shadow-neuInsetSm disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-serif text-xl text-linda-espresso">
            {form.jeDarkovyPoukaz ? 'Hodnoty dárkového poukazu' : 'Varianty a míry'}
          </h2>
          <button
            type="button"
            disabled={odesilam}
            onClick={() => setVarianty([...varianty, novaVarianta(form.jeDarkovyPoukaz)])}
            className="flex min-h-touch cursor-pointer items-center gap-1 rounded-lg bg-linda-cream px-3 text-xs font-semibold text-linda-cognac shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Přidat variantu
          </button>
        </div>

        {chybaPole('varianty')}

        <div className="space-y-4">
          {varianty.map((v, index) => (
            <div key={v.klic} className="space-y-3 rounded-xl bg-linda-cream p-4 text-xs shadow-neuSm">
              <div className="flex items-center justify-between gap-4">
                <div className="grid flex-1 grid-cols-2 gap-4">
                  <div>
                    <label htmlFor={`velikost-${v.klic}`} className="mb-1 block font-semibold text-linda-espresso">
                      {form.jeDarkovyPoukaz ? 'Částka poukazu' : 'Velikost'}
                    </label>
                    <input
                      id={`velikost-${v.klic}`}
                      type="text"
                      required
                      disabled={odesilam}
                      value={v.velikost}
                      onChange={(e) =>
                        setVarianty(varianty.map((x, i) => (i === index ? { ...x, velikost: e.target.value } : x)))
                      }
                      className="min-h-touch w-full rounded-lg bg-linda-sandLight px-3 py-2 text-linda-espresso shadow-neuInsetSm"
                    />
                    {chybaPole(`varianty.${index}.velikost`)}
                  </div>

                  <div>
                    <label htmlFor={`skladem-${v.klic}`} className="mb-1 block font-semibold text-linda-espresso">
                      Počet kusů skladem
                    </label>
                    <input
                      id={`skladem-${v.klic}`}
                      type="number"
                      min="0"
                      step="1"
                      required
                      disabled={odesilam}
                      value={v.skladem}
                      onChange={(e) =>
                        setVarianty(
                          varianty.map((x, i) => (i === index ? { ...x, skladem: Number(e.target.value) } : x))
                        )
                      }
                      className="min-h-touch w-full rounded-lg bg-linda-sandLight px-3 py-2 text-linda-espresso shadow-neuInsetSm"
                    />
                    {chybaPole(`varianty.${index}.skladem`)}
                  </div>
                </div>

                {varianty.length > 1 && (
                  <button
                    type="button"
                    disabled={odesilam}
                    aria-label={`Odebrat variantu ${v.velikost}`}
                    onClick={() => setVarianty(varianty.filter((_, i) => i !== index))}
                    className="flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-full bg-linda-cream text-linda-espresso/75 shadow-neuSm transition-all duration-200 hover:text-red-800 active:shadow-neuInsetSm"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>

              {!form.jeDarkovyPoukaz && (
                /*
                  Čtyři míry krát pět velikostí je dvacet políček, která
                  u většiny kousků zůstanou prázdná – a přitom to byla ta část
                  formuláře, kvůli které vypadal nekonečně. Rozbalený zůstává
                  blok tam, kde už míry jsou.
                */
                <Rozbalovaci
                  nadpis="Míry této velikosti"
                  popis="Nepovinné – pomáhají zákaznici vybrat velikost a snižují vratky"
                  trida="border-t border-linda-sand/40 pt-2"
                  vychoziOtevreno={Boolean(v.obvodHrudniku || v.obvodPasu || v.obvodBoku || v.delka)}
                >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(
                    [
                      ['obvodHrudniku', 'Obvod hrudníku', '88–92 cm'],
                      ['obvodPasu', 'Obvod pasu', '68–72 cm'],
                      ['obvodBoku', 'Obvod boků', '94–98 cm'],
                      ['delka', 'Celková délka', '115 cm'],
                    ] as const
                  ).map(([klic, popisek, priklad]) => (
                    <div key={klic}>
                      <label
                        htmlFor={`${klic}-${v.klic}`}
                        className="block text-[11px] font-medium text-linda-espresso/75"
                      >
                        {popisek}
                      </label>
                      <input
                        id={`${klic}-${v.klic}`}
                        type="text"
                        disabled={odesilam}
                        value={v[klic]}
                        onChange={(e) =>
                          setVarianty(varianty.map((x, i) => (i === index ? { ...x, [klic]: e.target.value } : x)))
                        }
                        placeholder={priklad}
                        className="min-h-touch w-full rounded-lg bg-linda-sandLight px-2.5 py-1.5 text-xs shadow-neuInsetSm"
                      />
                      {chybaPole(`varianty.${index}.miry.${klic}`)}
                    </div>
                  ))}
                </div>
                </Rozbalovaci>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-2xl bg-linda-cream p-6 text-xs shadow-neu">
        <h2 className="font-serif text-xl text-linda-espresso">Zveřejnění</h2>

        <label className="flex min-h-touch cursor-pointer items-center gap-2.5">
          <input
            id="aktivni"
            type="checkbox"
            checked={form.aktivni}
            disabled={odesilam}
            onChange={(e) => setForm({ ...form, aktivni: e.target.checked })}
            className="h-4 w-4 cursor-pointer accent-linda-cognac"
          />
          <span className="text-linda-espresso/85">
            Zveřejnit v e-shopu (odškrtnuté = koncept, zákaznice ho neuvidí)
          </span>
        </label>

        {/* Při editaci se galerie spravuje mimo formulář (`SpravaFotek`), takže
            sekce s fotkami tu není a s ní chyběl i výpis chyby `fotky`. Server
            ji přitom vrací právě sem: „koncept bez fotky nelze zveřejnit“
            (čl. 19 GPSR) vyskočí ve chvíli, kdy se zaškrtne políčko nad tímhle
            řádkem. Majitelka do té doby viděla jen obecné „Zkontrolujte prosím
            vyplněné údaje.“ a neměla jak zjistit, co se serveru nelíbí. */}
        {skrytNahravaniFotek && chybaPole('fotky')}

        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={form.doporuceny}
            disabled={odesilam}
            onChange={(e) => setForm({ ...form, doporuceny: e.target.checked })}
            className="h-4 w-4 cursor-pointer accent-linda-cognac"
          />
          <span className="text-linda-espresso/85">Doporučený produkt (zvýrazní se na úvodní stránce)</span>
        </label>
      </div>

      {/* Lepivá lišta s uložením.

          Formulář má 29–57 ovládacích prvků, tedy zhruba pět obrazovek na
          telefonu. Tlačítko na konci znamenalo, že se k němu majitelka musela
          po každé úpravě proskrolovat – a po chybě zase zpátky nahoru.

          Lepí se jen pod `sm`; na desktopu je celý formulář v dohledu a lišta
          přes spodek obrazovky by tam jen ubírala místo. Podklad je krémový
          a neprůhledný, aby pod ním obsah nebyl vidět, a `shadow-neuBar` je
          týž token jako u hlavičky – lišta přes celou šířku, ze které zbyde
          měkký okraj (boční složky stínu jsou mimo obrazovku).

          `-mx-5` ruší `p-5` na `<main>`, aby lišta sahala od kraje ke kraji;
          `pb-[env(safe-area-inset-bottom)]` drží tlačítka nad domácím
          indikátorem iPhonu. */}
      <div className="sticky bottom-0 -mx-5 flex justify-end gap-4 bg-linda-cream px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-neuBar sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:shadow-none">
        <Link
          href="/admin/produkty"
          className="flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cream px-6 text-xs font-semibold text-linda-espresso shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
        >
          Zrušit
        </Link>
        <button
          type="submit"
          disabled={odesilam || nahravam}
          aria-busy={odesilam}
          className="flex min-h-touch flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-linda-cognac px-8 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm disabled:cursor-not-allowed disabled:opacity-70 sm:flex-none"
        >
          {odesilam ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Ukládám…
            </>
          ) : jeEditace ? (
            'Uložit změny'
          ) : (
            'Uložit produkt'
          )}
        </button>
      </div>
    </form>
  );
}
