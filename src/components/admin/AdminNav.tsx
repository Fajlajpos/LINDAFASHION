'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  FolderTree,
  Package,
  Users,
  Tag,
  AlertTriangle,
  History,
  Inbox,
  Settings,
} from 'lucide-react';

const POLOZKY = [
  { nazev: 'Dashboard', href: '/admin', Ikona: LayoutDashboard },
  { nazev: 'Produkty', href: '/admin/produkty', Ikona: ShoppingBag },
  { nazev: 'Kategorie', href: '/admin/kategorie', Ikona: FolderTree },
  { nazev: 'Objednávky', href: '/admin/objednavky', Ikona: Package },
  { nazev: 'Zákazníci', href: '/admin/zakaznici', Ikona: Users },
  { nazev: 'Slevové kódy', href: '/admin/slevove-kody', Ikona: Tag },
  { nazev: 'Reklamace a vrácení', href: '/admin/reklamace', Ikona: AlertTriangle },
  { nazev: 'Zprávy z webu', href: '/admin/zpravy', Ikona: Inbox },
  { nazev: 'Záznam změn', href: '/admin/zaznamy', Ikona: History },
  { nazev: 'Nastavení webu', href: '/admin/nastaveni', Ikona: Settings },
];

/**
 * Navigace administrace. Vlastní klientská komponenta jen kvůli `usePathname`,
 * aby zbytek layoutu mohl zůstat Server Component a přečíst si session.
 */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {POLOZKY.map(({ nazev, href, Ikona }) => {
        const jeAktivni = pathname === href || (href !== '/admin' && pathname.startsWith(href));

        return (
          <Link
            key={href}
            href={href}
            aria-current={jeAktivni ? 'page' : undefined}
            className={`flex min-h-touch cursor-pointer items-center gap-3 rounded-xl px-4 text-xs font-medium transition-all duration-200 ${
              jeAktivni
                ? 'bg-linda-cognac text-white shadow-neuOnDarkInset'
                : 'text-linda-cream/80 hover:bg-white/[0.06] hover:text-white hover:shadow-neuOnDark'
            }`}
          >
            <Ikona className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{nazev}</span>
          </Link>
        );
      })}
    </nav>
  );
}
