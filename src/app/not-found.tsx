import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center p-4 text-[#2B2019]">
      <div className="max-w-md w-full text-center space-y-6 p-8 bg-white rounded-3xl border border-[#E4D9C8] shadow-elevated">
        <div className="w-16 h-16 rounded-full bg-[#E4D9C8]/40 text-[#7A4B32] flex items-center justify-center mx-auto">
          <Sparkles className="w-8 h-8 stroke-[1.5]" />
        </div>

        <div className="space-y-2">
          <span className="font-serif text-6xl text-[#7A4B32] font-semibold block">404</span>
          <h1 className="font-serif text-3xl text-[#2B2019]">Stránka nebyla nalezena</h1>
          <p className="text-xs text-[#2B2019]/70 font-light leading-relaxed">
            Omlouváme se, ale hledaná stránka nebo model oblečení již neexistuje nebo byla přesunuta do jiné kolekce.
          </p>
        </div>

        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-3 bg-[#7A4B32] text-white text-xs font-semibold uppercase tracking-wider rounded-full hover:bg-[#633B26] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Návrat na hlavní stránku
          </Link>
        </div>
      </div>
    </div>
  );
}
