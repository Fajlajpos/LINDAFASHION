import React from 'react';
import type { RadekOteviraciDoby } from '@/lib/prodejna';

/**
 * Otevírací doba jako tabulka – dny vlevo, časy pod sebou zarovnané vpravo,
 * „zavřeno" tlumeně. Řádky skládá `radkyOteviraciDoby` z textu v administraci.
 *
 * Intervaly jednoho dne stojí od `sm` na jednom řádku („10:00–12:00,
 * 12:30–17:00") – každý zvlášť pod sebou natahoval sekci prodejny o tři řádky
 * navíc. Na úzkém telefonu se pod sebe vrátí, tam by se jinak lámaly kde
 * chtěly. Řádek, který se nedal rozdělit na dny a čas, se ukáže celý.
 */
export function OteviraciDobaTabulka({ radky }: { radky: RadekOteviraciDoby[] }) {
  return (
    <table className="w-full">
      <caption className="sr-only">Otevírací doba prodejny</caption>
      <tbody>
        {radky.map((r) => (
          <tr key={r.dny} className="align-top">
            <th
              scope="row"
              colSpan={r.cas ? 1 : 2}
              className="whitespace-nowrap py-0.5 pr-4 text-left font-semibold text-linda-espresso"
            >
              {r.dny}
            </th>
            {r.cas && (
              <td
                className={`py-0.5 text-right tabular-nums ${
                  r.zavreno ? 'italic text-linda-espresso/70' : 'text-linda-espresso/85'
                }`}
              >
                {r.cas.split(/,\s*/).map((interval, i) => (
                  <React.Fragment key={interval}>
                    {i > 0 && <span className="hidden sm:inline">, </span>}
                    <span className="block whitespace-nowrap sm:inline">{interval}</span>
                  </React.Fragment>
                ))}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
