'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AlertTriangle,
  FolderTree,
  History,
  Inbox,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  Tag,
  Users,
} from 'lucide-react';

/**
 * Kolik věcí čeká na vyřízení. Vykresluje se jako odznak u položky menu –
 * bez něj se dalo poznat jen tak, že člověk každou stránku otevřel a podíval se.
 */
export interface PoctyKVyrizeni {
  objednavky: number;
  reklamace: number;
  zpravy: number;
}

interface Polozka {
  nazev: string;
  href: string;
  Ikona: typeof Package;
  /** Ze kterého počtu se bere odznak. */
  klic?: keyof PoctyKVyrizeni;
  /** Co odznak znamená – doplní se do skryté části názvu odkazu. */
  popisOdznaku?: string;
}

/**
 * Menu je rozdělené na tři skupiny podle toho, jak často se do nich chodí.
 * Deset položek v jednom seznamu vypadalo stejně důležitě: „Nastavení webu“
 * viselo hned pod objednávkami, i když se do něj sáhne dvakrát za rok.
 */
const SEKCE: { titulek: string; id: string; polozky: Polozka[] }[] = [
  {
    titulek: 'Denní práce',
    id: 'sekce-denni-prace',
    polozky: [
      // Nadpis té stránky je „Přehled“ – menu dřív říkalo „Dashboard“.
      { nazev: 'Přehled', href: '/admin', Ikona: LayoutDashboard },
      {
        nazev: 'Objednávky',
        href: '/admin/objednavky',
        Ikona: Package,
        klic: 'objednavky',
        popisOdznaku: 'nových objednávek čeká na zpracování',
      },
      {
        nazev: 'Reklamace a vrácení',
        href: '/admin/reklamace',
        Ikona: AlertTriangle,
        klic: 'reklamace',
        popisOdznaku: 'nevyřízených reklamací',
      },
      {
        nazev: 'Zprávy z webu',
        href: '/admin/zpravy',
        Ikona: Inbox,
        klic: 'zpravy',
        popisOdznaku: 'nepřečtených zpráv',
      },
    ],
  },
  {
    titulek: 'Katalog',
    id: 'sekce-katalog',
    polozky: [
      { nazev: 'Produkty', href: '/admin/produkty', Ikona: ShoppingBag },
      { nazev: 'Kategorie', href: '/admin/kategorie', Ikona: FolderTree },
      { nazev: 'Slevové kódy', href: '/admin/slevove-kody', Ikona: Tag },
    ],
  },
  {
    titulek: 'Obchod',
    id: 'sekce-obchod',
    polozky: [
      // Nadpis stránky je „Zákaznice“, menu říkalo „Zákazníci“.
      { nazev: 'Zákaznice', href: '/admin/zakaznici', Ikona: Users },
      { nazev: 'Nastavení webu', href: '/admin/nastaveni', Ikona: Settings },
      { nazev: 'Záznam změn', href: '/admin/zaznamy', Ikona: History },
    ],
  },
];

const VSECHNY_POLOZKY = SEKCE.flatMap((s) => s.polozky);

/**
 * Aktivní je jen přesná shoda nebo podstránka na hranici segmentu.
 * Prosté `startsWith(href)` by označilo i `/admin/produkty-archiv`.
 */
function jeAktivni(pathname: string, href: string): boolean {
  /* Přehled leží na `/admin`, tedy na předkovi všech ostatních cest – u něj
     platí jen přesná shoda. Jinak svítí zamáčknutý na každé stránce
     administrace a v menu jsou vidět dvě vybrané položky naráz. */
  if (href === '/admin') return pathname === '/admin';

  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Název právě otevřené stránky. Mobilní lišta ho ukazuje vedle hamburgeru,
 * aby bylo i se zavřeným menu vidět, kde člověk je.
 */
export function nazevAdminStranky(pathname: string): string {
  const nalezena = VSECHNY_POLOZKY.filter((p) => jeAktivni(pathname, p.href))
    // Nejdelší shoda vyhrává: `/admin` je předkem všeho ostatního.
    .sort((a, b) => b.href.length - a.href.length)[0];

  return nalezena?.nazev ?? 'Administrace';
}

/**
 * Navigace administrace. Vlastní klientská komponenta jen kvůli `usePathname`,
 * aby zbytek layoutu mohl zůstat Server Component a přečíst si session.
 */
export function AdminNav({ pocty }: { pocty: PoctyKVyrizeni }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Administrace" className="space-y-6">
      {SEKCE.map((sekce) => (
        <div key={sekce.id} className="space-y-1.5">
          <p
            id={sekce.id}
            className="px-3.5 text-[11px] font-semibold uppercase tracking-widest text-linda-sand/80"
          >
            {sekce.titulek}
          </p>

          <ul aria-labelledby={sekce.id} className="space-y-1">
            {sekce.polozky.map(({ nazev, href, Ikona, klic, popisOdznaku }) => {
              const aktivni = jeAktivni(pathname, href);
              const pocet = klic ? pocty[klic] : 0;

              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={aktivni ? 'page' : undefined}
                    className={`group flex min-h-touch cursor-pointer items-center gap-3 rounded-xl px-3.5 text-sm transition-all duration-200 ${
                      aktivni
                        ? 'bg-linda-cognac font-semibold text-white shadow-neuOnDarkInset'
                        : 'font-medium text-linda-cream/85 hover:bg-white/[0.06] hover:text-white hover:shadow-neuOnDark'
                    }`}
                  >
                    {/* Pohyb má jen ikona. Posouvat celou položku by rozhýbalo
                        štítek a ten se v seznamu pod sebou čte jako vlnění. */}
                    <Ikona
                      className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 ease-out group-hover:scale-110"
                      aria-hidden="true"
                    />
                    <span className="flex-1 leading-tight">{nazev}</span>

                    {pocet > 0 && (
                      /* Na zamáčknuté cognacové položce musí odznak přebarvit –
                         cognac na cognacu je přesně to, co má být vidět nejvíc. */
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
                          aktivni ? 'bg-linda-cream text-linda-cognac' : 'bg-linda-cognac text-white'
                        }`}
                      >
                        {pocet > 99 ? '99+' : pocet}
                        <span className="sr-only"> {popisOdznaku}</span>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
