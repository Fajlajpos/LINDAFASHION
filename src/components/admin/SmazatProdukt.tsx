'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { poslatJson } from '@/lib/api-klient';

/**
 * Smazání produktu s potvrzením (sekce 6.9 – potvrzovací dialogy u mazání).
 *
 * Zobrazuje se jen u produktů, které nejsou v žádné objednávce; server tuhle
 * podmínku kontroluje znovu, aby nešla obejít přímým voláním API.
 */
export function SmazatProdukt({ productId, nazev }: { productId: string; nazev: string }) {
  const router = useRouter();
  const [potvrzuje, setPotvrzuje] = useState(false);
  const [maze, setMaze] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);

  const smazat = async () => {
    setMaze(true);
    setChyba(null);

    const vysledek = await poslatJson(`/api/admin/produkty/${productId}`, undefined, 'DELETE');

    if (!vysledek.ok) {
      setChyba(vysledek.chyba);
      setMaze(false);
      return;
    }

    router.push('/admin/produkty');
    router.refresh();
  };

  return (
    <section className="space-y-3 rounded-2xl bg-linda-cream p-6 shadow-neu">
      <h2 className="font-serif text-xl text-linda-espresso">Smazat produkt</h2>

      {chyba && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-linda-sandLight p-3 text-xs font-medium text-red-800 shadow-neuInsetSm"
        >
          <AlertCircle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
          {chyba}
        </p>
      )}

      {potvrzuje ? (
        <div className="space-y-3">
          <p className="text-xs text-linda-espresso/85">
            Opravdu smazat <strong>{nazev}</strong> včetně všech variant a fotek? Tuhle akci nelze vzít zpět.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void smazat()}
              disabled={maze}
              aria-busy={maze}
              className="flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-red-800 px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-red-900 active:shadow-neuSm disabled:cursor-not-allowed disabled:opacity-70"
            >
              {maze ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Mažu…
                </>
              ) : (
                'Ano, smazat natrvalo'
              )}
            </button>

            <button
              type="button"
              onClick={() => setPotvrzuje(false)}
              disabled={maze}
              className="flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cream px-6 text-xs font-semibold text-linda-espresso shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
            >
              Zpět
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPotvrzuje(true)}
          className="flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-linda-cream px-6 text-xs font-semibold text-red-800 shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Smazat produkt
        </button>
      )}
    </section>
  );
}
