'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, FolderTree, Package, Users, Tag, AlertTriangle, Settings, LogOut, ArrowLeft } from 'lucide-react';

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
    <div className="min-h-screen bg-[#F3EFE9] text-[#2B2019] flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#2B2019] text-[#FAF8F4] p-6 space-y-8 flex-shrink-0">
        <div className="space-y-1">
          <Link href="/" className="text-xs text-[#E4D9C8] hover:underline flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" />
            Zpět na e-shop
          </Link>
          <h2 className="font-serif text-2xl tracking-wider uppercase text-[#E4D9C8]">LINDA Admin</h2>
          <p className="text-[10px] text-[#FAF8F4]/50 uppercase tracking-widest">Správa obchodu</p>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#7A4B32] text-white shadow-sm'
                    : 'text-[#FAF8F4]/70 hover:bg-[#FAF8F4]/10 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="pt-6 border-t border-[#FAF8F4]/10 text-xs text-[#FAF8F4]/50 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Přihlášen: Linda Admin</span>
          </div>
          <Link href="/" className="block text-[#E4D9C8] hover:underline text-[11px]">
            Odhlásit se
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 sm:p-10 overflow-y-auto">{children}</main>
    </div>
  );
}
