import React from 'react';

/**
 * Vykreslení uloženého právního textu.
 *
 * Text v `PravniDokument.obsah` je Markdown, ale vykresluje se **do React
 * uzlů, ne do HTML**. Rozdíl není estetický: obsah zadává administrátorka
 * a `dangerouslySetInnerHTML` by z pole v administraci udělal cestu, jak na
 * veřejnou stránku dostat libovolný skript. Takhle je nejhorší možný výsledek
 * špatně naformátovaný odstavec.
 *
 * Podporuje jen to, co právní text potřebuje – nadpis, odstavec, odrážky,
 * tučné. Žádné obrázky, odkazy ani tabulky: každá další značka je další
 * možnost, jak si stránku rozbít, a v podmínkách k ničemu.
 *
 * Bez knihovny schválně. Markdown parser kvůli šesti řádkům pravidel by
 * přinesl závislost, kterou by pak bylo potřeba aktualizovat kvůli chybám
 * ve funkcích, které tu nikdo nepoužije.
 */

/** `**tučně**` na `<strong>`. Zbytek textu zůstává textem. */
function sTucnym(radek: string, klic: string): React.ReactNode {
  const casti = radek.split(/\*\*(.+?)\*\*/g);

  return casti.map((cast, i) =>
    // Liché indexy jsou obsah závorek ze `split` – tedy to, co bylo v hvězdičkách.
    i % 2 === 1 ? <strong key={`${klic}-${i}`}>{cast}</strong> : <React.Fragment key={`${klic}-${i}`}>{cast}</React.Fragment>
  );
}

export function PravniText({ obsah }: { obsah: string }) {
  // Bloky odděluje prázdný řádek. `\r\n` kvůli textu vloženému z Wordu.
  const bloky = obsah.replace(/\r\n/g, '\n').split(/\n{2,}/);

  return (
    <div className="space-y-4">
      {bloky.map((blok, i) => {
        const text = blok.trim();
        if (!text) return null;

        if (text.startsWith('## ')) {
          return (
            <h2 key={i} className="pt-2 font-serif text-lg text-linda-cognac">
              {text.slice(3)}
            </h2>
          );
        }

        if (text.startsWith('# ')) {
          return (
            <h2 key={i} className="pt-2 font-serif text-xl text-linda-cognac">
              {text.slice(2)}
            </h2>
          );
        }

        // Seznam: každý řádek bloku začíná pomlčkou.
        const radky = text.split('\n');
        if (radky.every((r) => r.trim().startsWith('- '))) {
          return (
            <ul key={i} className="ml-4 list-disc space-y-1.5 text-xs leading-relaxed text-linda-espresso/85">
              {radky.map((r, j) => (
                <li key={j}>{sTucnym(r.trim().slice(2), `${i}-${j}`)}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={i} className="text-xs leading-relaxed text-linda-espresso/85">
            {sTucnym(text.replace(/\n/g, ' '), String(i))}
          </p>
        );
      })}
    </div>
  );
}
