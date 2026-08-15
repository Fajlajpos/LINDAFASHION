/**
 * Tenký klient nad fetch pro formuláře v prohlížeči.
 *
 * Vrací výsledek jako hodnotu místo házení výjimek – volající tak nemůže
 * zapomenout na chybový stav a formulář vždycky ví, co zobrazit.
 */

export type Vysledek<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      chyba: string;
      pole?: Record<string, string>;
      /**
       * Požadavek zrušil volající (`AbortSignal`), server o nic nepřišel.
       *
       * Bez téhle informace vypadá zrušení stejně jako výpadek sítě a volající
       * na něj zareaguje hláškou „Nepodařilo se spojit se serverem". Přesně to
       * dělá našeptávač při každém stisku klávesy, kdy ruší předchozí dotaz.
       */
      zruseno?: boolean;
    };

async function zpracovat<T>(odpoved: Response): Promise<Vysledek<T>> {
  let telo: unknown = null;

  try {
    telo = await odpoved.json();
  } catch {
    // Prázdná nebo nevalidní odpověď – řeší se níž podle status kódu.
  }

  if (!odpoved.ok) {
    const chybaTelo = telo as { chyba?: string; pole?: Record<string, string> } | null;
    return {
      ok: false,
      chyba: chybaTelo?.chyba ?? 'Něco se pokazilo. Zkuste to prosím znovu.',
      pole: chybaTelo?.pole,
    };
  }

  return { ok: true, data: telo as T };
}

export async function poslatJson<T>(
  url: string,
  telo: unknown,
  metoda: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST'
): Promise<Vysledek<T>> {
  try {
    const odpoved = await fetch(url, {
      method: metoda,
      headers: { 'Content-Type': 'application/json' },
      body: telo === undefined ? undefined : JSON.stringify(telo),
    });

    return zpracovat<T>(odpoved);
  } catch {
    return { ok: false, chyba: 'Nepodařilo se spojit se serverem. Zkontrolujte připojení.' };
  }
}

export async function poslatFormData<T>(url: string, data: FormData): Promise<Vysledek<T>> {
  try {
    // Content-Type se schválně nenastavuje – prohlížeč doplní boundary sám.
    const odpoved = await fetch(url, { method: 'POST', body: data });
    return zpracovat<T>(odpoved);
  } catch {
    return { ok: false, chyba: 'Nepodařilo se spojit se serverem. Zkontrolujte připojení.' };
  }
}

export async function nacist<T>(url: string, signal?: AbortSignal): Promise<Vysledek<T>> {
  try {
    const odpoved = await fetch(url, { cache: 'no-store', signal });
    return zpracovat<T>(odpoved);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, chyba: 'Požadavek byl zrušen.', zruseno: true };
    }

    return { ok: false, chyba: 'Nepodařilo se spojit se serverem. Zkontrolujte připojení.' };
  }
}
