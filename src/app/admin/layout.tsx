import React from 'react';
import { redirect } from 'next/navigation';
import { overitAdmina } from '@/lib/admin';
import { db } from '@/lib/db';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

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

  /* Odznaky v menu. Tři počty přes indexované sloupce (`stav`, `vyrizeno`),
     takže je můžou nést všechny stránky administrace – bez nich se dalo
     poznat, že něco čeká, jen otevřením každé stránky zvlášť.

     Layout je společný segment, takže se při přechodu mezi stránkami
     administrace znovu nevykresluje: čísla jsou z chvíle, kdy se administrace
     otevřela. Každá akce, která něco vyřídí, ale volá `router.refresh()`,
     a ten obnoví celý strom včetně layoutu – odznak tedy klesne přesně tehdy,
     když má. */
  const [novychObjednavek, cekajicichReklamaci, nevyrizenychZprav] = await Promise.all([
    db.order.count({ where: { stav: 'NOVA' } }),
    db.reklamace.count({ where: { stav: { in: ['PRIJATA', 'RESI_SE'] } } }),
    db.contactMessage.count({ where: { vyrizeno: false } }),
  ]);

  return (
    <div className="min-h-screen bg-linda-cream font-sans text-linda-espresso md:flex">
      <AdminSidebar
        podpis={admin.jmeno || admin.email}
        pocty={{
          objednavky: novychObjednavek,
          reklamace: cekajicichReklamaci,
          zpravy: nevyrizenychZprav,
        }}
      />

      <main className="min-w-0 flex-1 p-5 sm:p-10">{children}</main>
    </div>
  );
}
