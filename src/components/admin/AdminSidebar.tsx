'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Menu, X } from 'lucide-react';
import { AdminNav, nazevAdminStranky, type PoctyKVyrizeni } from './AdminNav';
import { OdhlasitSe } from './OdhlasitSe';

const ID_PANELU = 'admin-navigace';

interface Props {
  /** Jméno, nebo e-mail, když jméno není vyplněné. */
  podpis: string;
  pocty: PoctyKVyrizeni;
}

/** „čeká 1 věc“ / „čekají 3 věci“ / „čeká 7 věcí“. */
function popisCekajicich(pocet: number): string {
  if (pocet === 1) return 'čeká 1 věc na vyřízení';
  if (pocet < 5) return `čekají ${pocet} věci na vyřízení`;

  return `čeká ${pocet} věcí na vyřízení`;
}

/**
 * Postranní lišta administrace.
 *
 * Na mobilu byla dřív celá lišta obyčejným blokem nad obsahem: každá stránka
 * začínala deseti řádky menu a k vlastnímu obsahu se muselo doscrollovat.
 * Teď je to zásuvka za hamburgerem a nad obsahem zůstane jen tenká lišta
 * s názvem otevřené stránky. Od `md` výš se z ní zase stane sloupec – a to
 * `sticky`, aby menu neujelo pryč na dlouhém seznamu produktů.
 */
export function AdminSidebar({ podpis, pocty }: Props) {
  const pathname = usePathname();
  const [otevreno, setOtevreno] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  /* Se zavřenou zásuvkou není na mobilu vidět vůbec žádný signál, že něco
     čeká – souhrn proto sedí na hamburgeru. Rozpad na jednotlivé sekce
     je pak uvnitř menu. */
  const celkemKVyrizeni = pocty.objednavky + pocty.reklamace + pocty.zpravy;

  const zavrit = () => {
    setOtevreno(false);
    hamburgerRef.current?.focus();
  };

  // Přechod na jinou stránku menu zavře – jinak zůstane ležet přes obsah,
  // na který právě někdo klikl.
  useEffect(() => {
    setOtevreno(false);
  }, [pathname]);

  useEffect(() => {
    if (!otevreno) return;

    /* Ohnisko sem schválně nepřehazujeme. Zásuvka stojí v DOM hned za
       hamburgerem a zástěna mezi nimi je `aria-hidden`, takže první Tab po
       otevření sedne na křížek a druhý do menu – pořadí dokumentu tu dělá
       přesně to, co by dělal ruční `focus()`.
       (A dělalo by to i tak: `focus()` v efektu padne do podstromu, který je
       ještě `visibility: hidden` – přepnutí viditelnosti se k potomkům
       nepropíše ve stejném přepočtu stylů a ohnisko zůstane na hamburgeru.) */

    const naKlavesu = (e: KeyboardEvent) => {
      if (e.key === 'Escape') zavrit();
    };
    document.addEventListener('keydown', naKlavesu);

    // Zámek posunu stránky pod otevřenou zásuvkou.
    const puvodniPresah = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    /* Nad `md` je lišta pevný sloupec a stav „otevřeno“ nic neznamená.
       Bez tohohle by po otočení telefonu na šířku zůstal zámek posunu
       viset na stránce, kterou už nic nepřekrývá. */
    const siroko = window.matchMedia('(min-width: 768px)');
    const naZmenuSirky = () => {
      if (siroko.matches) setOtevreno(false);
    };
    siroko.addEventListener('change', naZmenuSirky);

    return () => {
      document.removeEventListener('keydown', naKlavesu);
      siroko.removeEventListener('change', naZmenuSirky);
      document.body.style.overflow = puvodniPresah;
    };
    // `zavrit` je stabilní (jen dva settery a ref), do závislostí nepatří.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otevreno]);

  return (
    <>
      {/* Mobilní lišta. Tmavá plocha nesnese bílý přísvit `neuBar`, proto
          `neuOnDark` – zbyde z něj měkký spodní okraj. */}
      <div className="sticky top-0 z-30 flex items-center gap-3 bg-linda-espresso px-4 py-2 text-linda-cream shadow-neuOnDark md:hidden">
        <button
          ref={hamburgerRef}
          type="button"
          onClick={() => setOtevreno(true)}
          aria-expanded={otevreno}
          aria-controls={ID_PANELU}
          className="relative flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-xl transition-all duration-200 hover:bg-white/[0.08] active:shadow-neuOnDarkInset"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />

          {celkemKVyrizeni > 0 && (
            <span
              aria-hidden="true"
              className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-linda-cognac px-1 text-[10px] font-bold tabular-nums text-white"
            >
              {celkemKVyrizeni > 9 ? '9+' : celkemKVyrizeni}
            </span>
          )}

          {/* Číslo v odznaku je `aria-hidden` a smysl nese tenhle popis –
              jinak by čtečka přečetla „9+“ bez toho, čeho je devět. */}
          <span className="sr-only">
            Otevřít menu administrace
            {celkemKVyrizeni > 0 && ` – ${popisCekajicich(celkemKVyrizeni)}`}
          </span>
        </button>

        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-linda-cream/70">LINDA Admin</p>
          <p className="truncate text-sm font-semibold">{nazevAdminStranky(pathname)}</p>
        </div>
      </div>

      {/* Zástěna je jen zkratka pro myš a prst, proto `aria-hidden`: jako
          tlačítko by z ní byla druhá zastávka tabulátoru se stejným názvem
          jako křížek hned za ní. Klávesnice zavírá Escapem a křížkem. */}
      {otevreno && (
        <div
          aria-hidden="true"
          onClick={zavrit}
          className="fixed inset-0 z-40 animate-fadeIn cursor-pointer bg-linda-espresso/70 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        id={ID_PANELU}
        /* Zavřená zásuvka musí být `invisible`, ne jen odsunutá: odsunutý
           panel zůstává v pořadí tabulátoru a klávesnice do něj spadne.

           `visibility` má proto v každém směru jiné časování:
           · otevírání `visibility 0s` – ukáže se hned, ať se má co vysouvat;
           · zavírání `visibility 0s 200ms` – schová se teprve po dojezdu,
             jinak by zásuvka zmizela skokem a vysunutí by nikdo neviděl. */
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-8 overflow-y-auto bg-linda-espresso p-6 text-linda-cream shadow-neu md:sticky md:top-0 md:z-auto md:h-screen md:w-64 md:max-w-none md:shrink-0 md:visible md:translate-x-0 ${
          otevreno
            ? 'visible translate-x-0 [transition:transform_200ms_ease-out,visibility_0s]'
            : '-translate-x-full invisible [transition:transform_200ms_ease-out,visibility_0s_200ms]'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-serif text-2xl uppercase tracking-wider text-linda-sand">
              LINDA Admin
            </p>
            <p className="text-[11px] uppercase tracking-widest text-linda-cream/70">
              Správa obchodu
            </p>
          </div>

          <button
            type="button"
            onClick={zavrit}
            className="-mr-2 -mt-2 flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-xl transition-all duration-200 hover:bg-white/[0.08] active:shadow-neuOnDarkInset md:hidden"
          >
            <X className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Zavřít menu</span>
          </button>
        </div>

        <AdminNav pocty={pocty} />

        {/* Odsazení dolů `mt-auto`: na vysokém displeji drží podpis u spodní
            hrany, na nízkém se chová jako obyčejná poslední položka. */}
        <div className="mt-auto space-y-2 border-t border-linda-cream/10 pt-5 text-sm text-linda-cream/80">
          <Link
            href="/"
            className="flex min-h-touch items-center gap-1.5 text-linda-sand transition-colors hover:text-white hover:underline"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
            Zpět na e-shop
          </Link>

          <p className="flex items-center gap-2">
            {/* Značková olivová (#405023) je na espressu prakticky
                neviditelná (~1,5:1) – kontrolka svítí smaragdovou. */}
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
            <span className="truncate">{podpis}</span>
          </p>

          <OdhlasitSe />
        </div>
      </aside>
    </>
  );
}
