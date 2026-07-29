'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, ShieldCheck, ArrowRight } from 'lucide-react';

export default function RegistracePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    jmeno: '',
    email: '',
    password: '',
    souhlasOP: false, // Povinný souhlas s OP
    souhlasNewsletter: false, // Samostatný dobrovolný souhlas pro GDPR
  });

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.souhlasOP) {
      alert('Pro registraci je nutné souhlasit s Obchodními podmínkami.');
      return;
    }
    alert('Registrace proběhla úspěšně! Můžete se přihlásit.');
    router.push('/prihlaseni');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-[#FAF8F4]">
      <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-3xl border border-[#E4D9C8] shadow-elevated space-y-6">
        <div className="text-center space-y-2">
          <span className="font-serif text-2xl tracking-[0.15em] text-[#2B2019] uppercase font-medium block">
            LINDA FASHION
          </span>
          <h1 className="font-serif text-3xl text-[#2B2019]">Nová registrace</h1>
          <p className="text-xs text-[#2B2019]/60">Vytvořte si osobní profil pro pohodlnější nákupy a ukládání oblíbených</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#2B2019] mb-1">Jméno a příjmení</label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.jmeno}
                onChange={(e) => setFormData({ ...formData, jmeno: e.target.value })}
                placeholder="Marie Nováková"
                className="w-full bg-[#FAF8F4] border border-[#E4D9C8] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#2B2019] focus:outline-none focus:border-[#7A4B32]"
              />
              <User className="w-4 h-4 text-[#7A4B32] absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2B2019] mb-1">E-mailová adresa</label>
            <div className="relative">
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="vas.email@example.cz"
                className="w-full bg-[#FAF8F4] border border-[#E4D9C8] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#2B2019] focus:outline-none focus:border-[#7A4B32]"
              />
              <Mail className="w-4 h-4 text-[#7A4B32] absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2B2019] mb-1">Heslo</label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={8}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Alespoň 8 znaků"
                className="w-full bg-[#FAF8F4] border border-[#E4D9C8] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#2B2019] focus:outline-none focus:border-[#7A4B32]"
              />
              <Lock className="w-4 h-4 text-[#7A4B32] absolute left-3 top-3" />
            </div>
          </div>

          {/* Consents */}
          <div className="space-y-3 pt-2 text-xs">
            {/* Mandatory OP */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={formData.souhlasOP}
                onChange={(e) => setFormData({ ...formData, souhlasOP: e.target.checked })}
                className="w-4 h-4 accent-[#7A4B32] mt-0.5"
              />
              <span className="text-[#2B2019]/80">
                Souhlasím s{' '}
                <Link href="/obchodni-podminky" target="_blank" className="underline text-[#7A4B32] font-semibold">
                  Obchodními podmínkami
                </Link>{' '}
                a ochranou osobních údajů. *
              </span>
            </label>

            {/* Voluntary Newsletter Consent (Separate as required by GDPR Section 5) */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.souhlasNewsletter}
                onChange={(e) => setFormData({ ...formData, souhlasNewsletter: e.target.checked })}
                className="w-4 h-4 accent-[#7A4B32] mt-0.5"
              />
              <span className="text-[#2B2019]/70">
                Chci odebírat inspirativní novinky z nových italských kolekcí (dobrovolný souhlas).
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-[#7A4B32] text-white text-xs font-semibold uppercase tracking-wider rounded-full hover:bg-[#633B26] transition-all shadow-md flex items-center justify-center gap-2"
          >
            Vytvořit účet
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-4 border-t border-[#E4D9C8]/60 text-xs text-[#2B2019]/70">
          Již máte účet?{' '}
          <Link href="/prihlaseni" className="text-[#7A4B32] font-semibold underline underline-offset-2">
            Přihlaste se
          </Link>
        </div>
      </div>
    </div>
  );
}
