'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, Undo2 } from 'lucide-react';
import { poslatJson } from '@/lib/api-klient';

/** Přepínač „vyřízeno" u zprávy z kontaktního formuláře. */
export function OznacitVyrizene({ id, vyrizeno }: { id: string; vyrizeno: boolean }) {
  const router = useRouter();
  const [pracuje, setPracuje] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);

  const prepnout = async () => {
    if (pracuje) return;

    setPracuje(true);
    setChyba(null);

    const vysledek = await poslatJson(`/api/admin/zpravy/${id}`, { vyrizeno: !vyrizeno }, 'PATCH');

    if (vysledek.ok) router.refresh();
    else setChyba(vysledek.chyba);

    setPracuje(false);
  };

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => void prepnout()}
        disabled={pracuje}
        aria-busy={pracuje}
        className="flex min-h-touch cursor-pointer items-center gap-1.5 rounded-full bg-linda-cream px-4 text-xs font-semibold text-linda-espresso shadow-neuSm transition-all duration-200 hover:text-linda-cognac hover:shadow-neu active:shadow-neuInsetSm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pracuje ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : vyrizeno ? (
          <Undo2 className="h-3.5 w-3.5 text-linda-cognac" aria-hidden="true" />
        ) : (
          <Check className="h-3.5 w-3.5 text-linda-sage" aria-hidden="true" />
        )}
        {vyrizeno ? 'Vrátit mezi nevyřízené' : 'Označit jako vyřízené'}
      </button>

      {chyba && (
        <p role="alert" className="text-[11px] font-medium text-red-800">
          {chyba}
        </p>
      )}
    </div>
  );
}
