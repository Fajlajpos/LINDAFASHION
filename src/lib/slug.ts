/**
 * Čitelné URL bez diakritiky (sekce 12 zadání):
 * "Hedvábné šaty Bellissima" → "hedvabne-saty-bellissima"
 */

/** Kombinující diakritická znaménka, která zbydou po normalizaci na NFD. */
const DIAKRITIKA = /[̀-ͯ]/g;

export function vytvoritSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(DIAKRITIKA, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

/**
 * Doplní číselnou příponu, dokud je slug obsazený.
 * `jeObsazeny` si volající zařídí dotazem do databáze pro danou tabulku.
 */
export async function unikatniSlug(
  zaklad: string,
  jeObsazeny: (slug: string) => Promise<boolean>
): Promise<string> {
  const zakladniSlug = vytvoritSlug(zaklad) || 'polozka';

  if (!(await jeObsazeny(zakladniSlug))) return zakladniSlug;

  for (let i = 2; i < 200; i++) {
    const kandidat = `${zakladniSlug}-${i}`;
    if (!(await jeObsazeny(kandidat))) return kandidat;
  }

  // Krajní případ – radši unikátní ošklivý slug než zacyklení.
  return `${zakladniSlug}-${Date.now()}`;
}
