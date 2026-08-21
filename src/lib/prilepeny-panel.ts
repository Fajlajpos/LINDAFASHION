'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Přilepený postranní panel, který se vejde i když je vyšší než okno.
 *
 * `position: sticky` s pevným `top` drží **horní** hranu. U panelu vyššího
 * než okno to znamená, že jeho spodek nejde dostat na obrazovku vůbec –
 * v pokladně tak byla trvale nedosažitelná věta o souhlasu s podmínkami
 * a tlačítko „Objednat a zaplatit“. Stačil košík o dvou položkách.
 *
 * Vnitřní posuvník uvnitř panelu to sice řeší, ale posuvník v posuvníku je
 * na takovéhle ploše nepříjemný: kolečko dělá něco jiného podle toho, kde
 * zrovna leží kurzor. Místo toho posuneme bod přilepení:
 *
 *     top = min(80, výška okna − výška panelu − 24)
 *
 * - Panel se do okna **vejde** → `top` zůstane 80 px, tedy běžné přilepení
 *   pod sbalenou hlavičku.
 * - Panel je **vyšší** → `top` vyjde záporně a panel se přilepí tak, že mu
 *   nad okrajem okna přečnívá právě ten přebytek. Jeho **spodek** pak sedí
 *   24 px nad spodním okrajem okna.
 *
 * Ve druhém případě se panel při skrolování nejdřív posouvá s obsahem
 * (takže je vidět nadpis a položky) a jakmile tlačítko dojede ke spodnímu
 * okraji, zaparkuje tam a zůstane na očích po zbytek formuláře. Skrolem
 * zpátky nahoru se zase celý vrátí. Žádná druhá rolovací plocha nevzniká,
 * všechno obstará normální skrol stránky.
 *
 * `ResizeObserver`, ne jen `resize` okna: panel roste a klesá i sám od sebe –
 * uplatněním slevového kódu, chybovou hláškou u souhlasu, přepnutím dopravy.
 */

/** Mezera pod sbalenou hlavičkou (64 px) a stejná od spodního okraje okna. */
const ODSAZENI_NAHORE = 80;
const ODSAZENI_DOLE = 24;

export function usePrilepenyPanel<T extends HTMLElement>() {
  /* Callback ref, ne `useRef`. Obě stránky, které panel používají, mají nad
     ním časnější návrat pro prázdný košík – košík se načítá z `localStorage`
     až v efektu, takže při prvním renderu panel v DOM vůbec není. S `useRef`
     a prázdným polem závislostí by efekt proběhl nad `null`, tiše se ukončil
     a už nikdy se nespustil: panel by se objevil s výchozím `top` a měřit by
     ho neměl kdo. Callback ref stav změní teprve tím, jak prvek naskočí. */
  const [prvek, setPrvek] = useState<T | null>(null);
  const ref = useCallback((uzel: T | null) => setPrvek(uzel), []);
  const [top, setTop] = useState(ODSAZENI_NAHORE);

  useEffect(() => {
    if (!prvek) return;

    const prepocitat = () => {
      const volno = window.innerHeight - prvek.offsetHeight - ODSAZENI_DOLE;
      setTop(Math.min(ODSAZENI_NAHORE, volno));
    };

    prepocitat();

    const pozorovatel = new ResizeObserver(prepocitat);
    pozorovatel.observe(prvek);
    window.addEventListener('resize', prepocitat);

    return () => {
      pozorovatel.disconnect();
      window.removeEventListener('resize', prepocitat);
    };
  }, [prvek]);

  /* Pod `lg` je panel `static` a `top` se na něj nevztahuje, takže se
     spočítaná hodnota nikde neprojeví – proto se nic neodděluje médiem. */
  return { ref, top };
}
