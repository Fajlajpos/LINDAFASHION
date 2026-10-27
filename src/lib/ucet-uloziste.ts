/**
 * Košík a oblíbené v `localStorage` – čí ten seznam je.
 *
 * Nepřihlášené zákaznici patří seznam v prohlížeči celý. Přihlášené je zdrojem
 * pravdy účet a prohlížeč drží jen **kopii**, aby se počty v hlavičce ukázaly
 * hned, ještě před odpovědí serveru.
 *
 * Dřív se ty dvě role nerozlišovaly a každé načtení stránky u přihlášené
 * zákaznice posílalo seznam z prohlížeče serveru ke „sloučení". Telefon tak
 * vracel do účtu kousky, které zákaznice mezitím na počítači odebrala,
 * zvedal snížené množství zpátky (sloučení bere vyšší číslo) a po objednávce
 * oživil vyprázdněný košík. Sloučit se smí jen to, co vzniklo bez přihlášení.
 *
 * Kopie účtu se proto ukládá zabalená (`{ ucet: true, polozky }`), seznam
 * hosta jako holé pole – stejný klíč, žádné nové úložiště.
 */
export interface Ulozeny<T> {
  /** `true` = kopie účtu, nikdy se neslučuje; `false` = seznam hosta. */
  ucet: boolean;
  polozky: T[];
}

export function nacistUlozeny<T>(klic: string, jePlatna: (p: unknown) => p is T): Ulozeny<T> {
  try {
    const raw = localStorage.getItem(klic);
    if (!raw) return { ucet: false, polozky: [] };

    const data: unknown = JSON.parse(raw);
    if (Array.isArray(data)) return { ucet: false, polozky: data.filter(jePlatna) };

    if (data && typeof data === 'object' && Array.isArray((data as Ulozeny<unknown>).polozky)) {
      return {
        ucet: (data as Ulozeny<unknown>).ucet === true,
        polozky: (data as Ulozeny<unknown>).polozky.filter(jePlatna),
      };
    }
  } catch (e) {
    console.error(`Chyba načtení ${klic} z prohlížeče:`, e);
  }
  return { ucet: false, polozky: [] };
}

/** Prázdný seznam se nezapisuje – klíč vznikne až první položkou (viz /cookies). */
export function ulozit<T>(klic: string, polozky: T[], ucet: boolean): void {
  try {
    if (polozky.length === 0) localStorage.removeItem(klic);
    else localStorage.setItem(klic, JSON.stringify(ucet ? { ucet: true, polozky } : polozky));
  } catch {
    // Plné nebo zablokované úložiště nesmí rozbít nákup.
  }
}

/**
 * Posluchač návratu na stránku – přepnutí na kartu, odemčení telefonu.
 *
 * Bez něj zůstal telefon na seznamu z chvíle načtení: kousek přidaný na
 * počítači se objevil až po ručním obnovení stránky. `focus` a
 * `visibilitychange` přicházejí často spolu, proto dvě sekundy rozestup.
 */
export function priNavratuNaStranku(akce: () => void): () => void {
  let naposledy = 0;
  const obsluha = () => {
    if (document.visibilityState !== 'visible') return;
    const ted = Date.now();
    if (ted - naposledy < 2000) return;
    naposledy = ted;
    akce();
  };

  window.addEventListener('focus', obsluha);
  document.addEventListener('visibilitychange', obsluha);
  return () => {
    window.removeEventListener('focus', obsluha);
    document.removeEventListener('visibilitychange', obsluha);
  };
}
