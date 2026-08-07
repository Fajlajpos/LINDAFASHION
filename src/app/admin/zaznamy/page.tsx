import React from 'react';
import { History, ShieldCheck } from 'lucide-react';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Záznam změn | Administrace LINDA FASHION',
};

/**
 * Audit log akcí administrátora (sekce 14).
 *
 * Záznamy se zapisovaly už dřív, ale nikde se nezobrazovaly – data padala
 * do prázdna. Tady je vidět, kdo co kdy změnil, což je užitečné hlavně až
 * bude účtů víc (sekce 6.12).
 */

/** Technický název akce na čitelnou větu. */
const POPIS_AKCE: Record<string, string> = {
  'produkt.vytvoren': 'vytvořila produkt',
  'produkt.upraven': 'upravila produkt',
  'produkt.smazan': 'smazala produkt',
  'kategorie.vytvorena': 'vytvořila kategorii',
  'kategorie.upravena': 'upravila kategorii',
  'kategorie.smazana': 'smazala kategorii',
  'fotky.nahrany': 'nahrála fotky',
  'fotka.smazana': 'smazala fotku',
  'nastaveni.upraveno': 'změnila nastavení webu',
};

function popisAkce(akce: string): string {
  return POPIS_AKCE[akce] ?? akce;
}

function formatCas(datum: Date): string {
  return datum.toLocaleString('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Vytáhne z podrobností to, co má smysl ukázat – typicky název produktu. */
function detail(podrobnosti: unknown): string | null {
  if (!podrobnosti || typeof podrobnosti !== 'object') return null;

  const data = podrobnosti as Record<string, unknown>;
  if (typeof data.nazev === 'string') return data.nazev;
  if (typeof data.pocet === 'number') return `${data.pocet} ks`;

  return null;
}

export default async function AdminZaznamyPage() {
  const zaznamy = await db.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return (
    <div className="max-w-4xl space-y-8">
      <div className="border-b border-linda-sand pb-6">
        <h1 className="font-serif text-3xl text-linda-espresso sm:text-4xl">Záznam změn</h1>
        <p className="mt-1 text-xs text-linda-espresso/70">
          Posledních 200 akcí provedených v administraci
        </p>
      </div>

      {zaznamy.length === 0 ? (
        <div className="space-y-2 rounded-2xl bg-linda-cream p-10 text-center shadow-neu">
          <ShieldCheck className="mx-auto h-8 w-8 text-linda-cognac opacity-60" aria-hidden="true" />
          <p className="text-xs text-linda-espresso/75">
            Zatím tu nic není. Jakmile začnete upravovat produkty nebo nastavení, akce se objeví tady.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {zaznamy.map((z) => {
            const podrobnost = detail(z.podrobnosti);

            return (
              <li key={z.id} className="flex items-center gap-4 rounded-xl bg-linda-cream p-4 shadow-neuSm">
                <History className="h-4 w-4 shrink-0 text-linda-cognac" aria-hidden="true" />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-linda-espresso">
                    <span className="font-semibold">{z.adminEmail}</span> {popisAkce(z.akce)}
                    {podrobnost && <span className="text-linda-espresso/75"> „{podrobnost}“</span>}
                  </p>
                  <p className="text-[11px] text-linda-espresso/60">{z.entita}</p>
                </div>

                <time
                  dateTime={z.createdAt.toISOString()}
                  className="shrink-0 text-[11px] text-linda-espresso/70"
                >
                  {formatCas(z.createdAt)}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
