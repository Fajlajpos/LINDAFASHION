'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut } from 'lucide-react';
import { poslatJson } from '@/lib/api-klient';

/**
 * Odhlášení. Dřív to byl jen odkaz na "/" – session cookie zůstávala platná
 * a stačilo se vrátit na /admin.
 */
export function OdhlasitSe() {
  const router = useRouter();
  const [odhlasuje, setOdhlasuje] = useState(false);

  const odhlasit = async () => {
    setOdhlasuje(true);

    await poslatJson('/api/auth/odhlaseni', undefined);

    router.push('/');
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={() => void odhlasit()}
      disabled={odhlasuje}
      aria-busy={odhlasuje}
      className="flex min-h-touch cursor-pointer items-center gap-1.5 text-[11px] text-linda-sand transition-colors hover:text-white hover:underline disabled:cursor-not-allowed disabled:opacity-70"
    >
      {odhlasuje ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {odhlasuje ? 'Odhlašuji…' : 'Odhlásit se'}
    </button>
  );
}
