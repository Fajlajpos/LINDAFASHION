'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, FolderTree, Package, Users, Tag, AlertTriangle, Settings, ArrowLeft } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Produkty', href: '/admin/produkty', icon: ShoppingBag },
    { name: 'Kategorie', href: '/admin/kategorie', icon: FolderTree },
    { name: 'Objednávky', href: '/admin/objednavky', icon: Package },
    { name: 'Zákazníci', href: '/admin/zakaznici', icon: Users },
    { name: 'Slevové kódy', href: '/admin/slevove-kody', icon: Tag },
    { name: 'Reklamace & Vrácení', href: '/admin/reklamace', icon: AlertTriangle },
    { name: 'Nastavení webu', href: '/admin/nastaveni', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-linda-cream font-sans text-linda-espresso md:flex-row">
      {/* Sidebar */}
      <aside className="w-full flex-shrink-0 space-y-8 bg-linda-espresso p-6 text-linda-cream shadow-neu md:w-64">
        <div className="space-y-1">
          <Link
            href="/"
            className="mb-2 flex min-h-touch items-center gap-1 text-xs text-linda-sand transition-colors hover:text-white hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Zpět na e-shop
          </Link>
          <h2 className="font-serif text-2xl uppercase tracking-wider text-linda-sand">LINDA Admin</h2>
          <p className="text-[10px] uppercase tracking-widest text-linda-cream/60">Správa obchodu</p>
        </div>

        {/* Aktivní položka je zamáčknutá do tmavé lišty, ostatní leží
            v rovině a při hoveru se nadzvednou. */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-h-touch cursor-pointer items-center gap-3 rounded-xl px-4 text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-linda-cognac text-white shadow-neuOnDarkInset'
                    : 'text-linda-cream/80 hover:bg-white/[0.06] hover:text-white hover:shadow-neuOnDark'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-linda-cream/10 pt-6 text-xs text-linda-cream/70">
          <div className="flex items-center gap-2">
            {/* Značková olivová (#405023) je na espressu prakticky
                neviditelná (~1,5:1) – kontrolka svítí smaragdovou. */}
            <div aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span>Přihlášen: Linda Admin</span>
          </div>
          <Link
            href="/"
            className="flex min-h-touch items-center text-[11px] text-linda-sand transition-colors hover:text-white hover:underline"
          >
            Odhlásit se
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 sm:p-10 overflow-y-auto">{children}</main>
    </div>
  );
}
