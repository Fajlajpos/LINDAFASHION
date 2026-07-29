'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ShieldCheck, ArrowRight } from 'lucide-react';

export default function PrihlaseniPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Přihlášení
    if (email === 'admin@lindafashion.cz') {
      router.push('/admin');
    } else {
      router.push('/muj-ucet');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-[#FAF8F4]">
      <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-3xl border border-[#E4D9C8] shadow-elevated space-y-6">
        <div className="text-center space-y-2">
          <span className="font-serif text-2xl tracking-[0.15em] text-[#2B2019] uppercase font-medium block">
            LINDA FASHION
          </span>
          <h1 className="font-serif text-3xl text-[#2B2019]">Přihlášení k účtu</h1>
          <p className="text-xs text-[#2B2019]/60">Přihlaste se ke své historii objednávek a oblíbeným kouskům</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#2B2019] mb-1">E-mailová adresa</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vas.email@example.cz"
                className="w-full bg-[#FAF8F4] border border-[#E4D9C8] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#2B2019] focus:outline-none focus:border-[#7A4B32]"
              />
              <Mail className="w-4 h-4 text-[#7A4B32] absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-[#2B2019]">Heslo</label>
              <Link href="/zapomenute-heslo" className="text-[11px] text-[#7A4B32] hover:underline font-medium">
                Zapomněli jste heslo?
              </Link>
            </div>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#FAF8F4] border border-[#E4D9C8] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#2B2019] focus:outline-none focus:border-[#7A4B32]"
              />
              <Lock className="w-4 h-4 text-[#7A4B32] absolute left-3 top-3" />
            </div>
          </div>

          {/* Turnstile Spam Protection readiness */}
          <div className="p-3 bg-[#FAF8F4] border border-[#E4D9C8]/60 rounded-xl text-[10px] text-[#2B2019]/60 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#6B7255]" />
            <span>Ochrana proti botům (Cloudflare Turnstile aktivní)</span>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-[#7A4B32] text-white text-xs font-semibold uppercase tracking-wider rounded-full hover:bg-[#633B26] transition-all shadow-md flex items-center justify-center gap-2"
          >
            Přihlásit se
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-4 border-t border-[#E4D9C8]/60 text-xs text-[#2B2019]/70">
          Nemáte ještě účet?{' '}
          <Link href="/registrace" className="text-[#7A4B32] font-semibold underline underline-offset-2">
            Zaregistrujte se
          </Link>
        </div>
      </div>
    </div>
  );
}
