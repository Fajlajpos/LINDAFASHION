'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-linda-sageLight text-linda-sage shadow-neu">
          <CheckCircle className="h-10 w-10" aria-hidden="true" />
        </div>
        <span className="block text-xs font-semibold uppercase tracking-widest text-linda-cognac">
          Děkujeme za váš nákup
        </span>
        <h1 className="font-serif text-4xl text-linda-espresso sm:text-5xl">
          Objednávka č. <span className="font-semibold text-linda-cognac">{cisloObjednavky}</span> byla přijata!
        </h1>
        <p className="mx-auto max-w-lg text-sm font-light leading-relaxed text-linda-espresso/75">
          Na váš e-mail jsme právě odeslali potvrzení objednávky společně s obchodními podmínkami a poučením o odstoupení od smlouvy.
        </p>
      </div>

      {/* QR Code and Bank Details Box (Bank Transfer Temporary Bridge) */}
      {paymentMethod === 'bank_transfer' && (
        <div className="mx-auto max-w-xl space-y-6 rounded-3xl bg-linda-cream p-8 text-left shadow-neuLg">
          <div className="flex items-center gap-3 border-b border-linda-sand/60 pb-4">
            <QrCode className="h-6 w-6 shrink-0 text-linda-cognac" aria-hidden="true" />
            <div>
              <h2 className="font-serif text-xl text-linda-espresso">Platební údaje &amp; QR Platba</h2>
              <p className="text-xs text-linda-espresso/70">Naskenujte QR kód v mobilním bankovnictví pro okamžitou úhradu.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-2">
            {/* QR kód leží v prohlubni. `<img>` nahradil `next/image`
                s pevnými rozměry – místo je rezervované, obrázek tedy
                nedoskočí a nerozhodí rozvržení (CLS). */}
            <div className="flex justify-center rounded-2xl bg-linda-sandLight p-3 shadow-neuInset">
              <Image
                src={qrcodeUrl}
                alt={`QR platba pro objednávku ${cisloObjednavky}`}
                width={192}
                height={192}
                unoptimized
                className="h-48 w-48 rounded-xl bg-white p-1"
              />
            </div>

            <div className="space-y-2 text-xs text-linda-espresso">
              {[
                { label: 'Číslo účtu:', hodnota: bankAccount, zvyraznit: true },
                { label: 'Variabilní symbol:', hodnota: cisloObjednavky.replace(/\D/g, ''), zvyraznit: false },
                { label: 'Částka k úhradě:', hodnota: `${totalAmount.toLocaleString('cs-CZ')} Kč`, zvyraznit: true },
              ].map(({ label, hodnota, zvyraznit }) => (
                <div key={label} className="rounded-xl bg-linda-sandLight p-2.5 shadow-neuInsetSm">
                  <span className="block text-[10px] uppercase text-linda-espresso/70">{label}</span>
                  <span className={`text-sm font-semibold ${zvyraznit ? 'text-linda-cognac' : 'text-linda-espresso'}`}>
                    {hodnota}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col justify-center gap-4 pt-6 sm:flex-row">
        <Link
          href="/muj-ucet"
          className="flex min-h-touch cursor-pointer items-center justify-center gap-2 rounded-full bg-linda-cognac px-8 text-xs font-semibold uppercase tracking-wider text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
        >
          Sledovat v zákaznickém účtu
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link
          href="/produkty"
          className="flex min-h-touch cursor-pointer items-center justify-center rounded-full bg-linda-cream px-8 text-xs font-semibold uppercase tracking-wider text-linda-espresso shadow-neu transition-all duration-200 hover:text-linda-cognac active:shadow-neuInsetSm"
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
