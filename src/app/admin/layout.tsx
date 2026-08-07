import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { overitAdmina } from '@/lib/admin';
import { AdminNav } from '@/components/admin/AdminNav';
import { OdhlasitSe } from '@/components/admin/OdhlasitSe';

export const metadata = {
  title: 'Administrace | LINDA FASHION',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Middleware sem nepřihlášeného nepustí, ale kontrolujeme i tady – a proti
  // databázi, ne jen podle tokenu. Ochrana administrace nesmí viset na jediném
  // místě (sekce 10) a odebrání práv musí platit okamžitě.
  const admin = await overitAdmina();
  if (!admin) redirect('/prihlaseni?dalsi=/admin');

  return (
    <div className="flex min-h-screen flex-col bg-linda-cream font-sans text-linda-espresso md:flex-row">
      <aside className="w-full flex-shrink-0 space-y-8 bg-linda-espresso p-6 text-linda-cream shadow-neu md:w-64">
        <div className="space-y-1">
          <Link
            href="/"
            className="mb-2 flex min-h-touch items-center gap-1 text-xs text-linda-sand transition-colors hover:text-white hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Zpět na e-shop
          </Link>
          <p className="font-serif text-2xl uppercase tracking-wider text-linda-sand">LINDA Admin</p>
          <p className="text-[10px] uppercase tracking-widest text-linda-cream/70">Správa obchodu</p>
        </div>

        <AdminNav />

        <div className="space-y-3 border-t border-linda-cream/10 pt-6 text-xs text-linda-cream/75">
          <p className="flex items-center gap-2">
            {/* Značková olivová (#405023) je na espressu prakticky
                neviditelná (~1,5:1) – kontrolka svítí smaragdovou. */}
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
            <span className="truncate">{admin.jmeno || admin.email}</span>
          </p>
          <OdhlasitSe />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 sm:p-10">{children}</main>
    </div>
  );
}
