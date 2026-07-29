'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, QrCode, ArrowRight } from 'lucide-react';
import { generateQrPaymentString, getQrPaymentImageUrl } from '@/lib/qr-code';

function PotvrzeniContent() {
  const searchParams = useSearchParams();
  const cisloObjednavky = searchParams.get('cislo') || 'LF-2026001';
  const totalAmount = Number(searchParams.get('celkem')) || 5380;
  const paymentMethod = searchParams.get('platba') || 'bank_transfer';

  const bankAccount = process.env.NEXT_PUBLIC_BANK_ACCOUNT || '1234567890/0100';
  const iban = process.env.NEXT_PUBLIC_BANK_IBAN || 'CZ6501000000001234567890';

  const qrcodeString = generateQrPaymentString({
    iban,
    amount: totalAmount,
    variableSymbol: cisloObjednavky,
  });
  const qrcodeUrl = getQrPaymentImageUrl(qrcodeString, 240);

  return (
    <div className="space-y-10">
      {/* Icon & Congratulations */}
      <div className="space-y-4">
        <div className="w-20 h-20 bg-[#6B7255]/20 text-[#6B7255] rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10" />
        </div>
        <span className="text-xs uppercase tracking-widest text-[#7A4B32] font-semibold block">
          Děkujeme za váš nákup
        </span>
        <h1 className="font-serif text-4xl sm:text-5xl text-[#2B2019]">
          Objednávka č. <span className="text-[#7A4B32] font-semibold">{cisloObjednavky}</span> byla přijata!
        </h1>
        <p className="text-sm text-[#2B2019]/75 max-w-lg mx-auto font-light leading-relaxed">
          Na váš e-mail jsme právě odeslali potvrzení objednávky společně s obchodními podmínkami a poučením o odstoupení od smlouvy.
        </p>
      </div>

      {/* QR Code and Bank Details Box (Bank Transfer Temporary Bridge) */}
      {paymentMethod === 'bank_transfer' && (
        <div className="bg-white p-8 rounded-3xl border border-[#E4D9C8] shadow-elevated max-w-xl mx-auto space-y-6 text-left">
          <div className="flex items-center gap-3 border-b border-[#E4D9C8]/60 pb-4">
            <QrCode className="w-6 h-6 text-[#7A4B32]" />
            <div>
              <h3 className="font-serif text-xl text-[#2B2019]">Platební údaje &amp; QR Platba</h3>
              <p className="text-xs text-[#2B2019]/60">Naskenujte QR kód v mobilním bankovnictví pro okamžitou úhradu.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            <div className="flex justify-center p-3 bg-[#FAF8F4] rounded-2xl border border-[#E4D9C8]/60">
              <img src={qrcodeUrl} alt="QR Platba" className="w-48 h-48 rounded-xl shadow-sm" />
            </div>

            <div className="space-y-2 text-xs text-[#2B2019]">
              <div className="p-2.5 bg-[#FAF8F4] rounded-xl border border-[#E4D9C8]/40">
                <span className="text-[#2B2019]/60 block text-[10px] uppercase">Číslo účtu:</span>
                <span className="font-semibold text-sm text-[#7A4B32]">{bankAccount}</span>
              </div>
              <div className="p-2.5 bg-[#FAF8F4] rounded-xl border border-[#E4D9C8]/40">
                <span className="text-[#2B2019]/60 block text-[10px] uppercase">Variabilní symbol:</span>
                <span className="font-semibold text-sm text-[#2B2019]">{cisloObjednavky.replace(/\D/g, '')}</span>
              </div>
              <div className="p-2.5 bg-[#FAF8F4] rounded-xl border border-[#E4D9C8]/40">
                <span className="text-[#2B2019]/60 block text-[10px] uppercase">Částka k úhradě:</span>
                <span className="font-semibold text-sm text-[#7A4B32]">{totalAmount.toLocaleString('cs-CZ')} Kč</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="pt-6 flex flex-col sm:flex-row justify-center gap-4">
        <Link
          href="/muj-ucet"
          className="px-8 py-3.5 bg-[#7A4B32] text-white text-xs font-semibold uppercase tracking-wider rounded-full hover:bg-[#633B26] transition-all flex items-center justify-center gap-2"
        >
          Sledovat v zákaznickém účtu
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/produkty"
          className="px-8 py-3.5 border border-[#2B2019]/30 text-[#2B2019] text-xs font-semibold uppercase tracking-wider rounded-full hover:border-[#7A4B32] hover:text-[#7A4B32]"
        >
          Pokračovat v nákupu
        </Link>
      </div>
    </div>
  );
}

export default function PotvrzeniObjednavkyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
      <Suspense fallback={<div className="text-center text-xs py-12">Načítání potvrzení objednávky...</div>}>
        <PotvrzeniContent />
      </Suspense>
    </div>
  );
}
