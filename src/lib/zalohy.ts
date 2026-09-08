/**
 * Stav noční zálohy pro administraci.
 *
 * Zálohu dělá samostatný kontejner (`deploy/zaloha.sh`), protože `pg_dump` musí
 * být ve stejné verzi jako server a aplikační image klienta Postgresu nemá.
 * Aplikace do zálohování nijak nezasahuje — jen čte, jak dopadlo, a když se
 * něco pokazí, řekne to na `/admin`.
 *
 * Bez tohohle by se o zastavených zálohách nikdo nedozvěděl. Záloha, která
 * tiše přestane běžet, vypadá úplně stejně jako záloha, která běží — a přijde
 * se na to ve chvíli, kdy je potřeba obnovit, což je přesně ta nejhorší chvíle.
 *
 * Bez aliasů `@/` a bez `next/*`: soubor čte jen `fs` a `path`, aby se dal
 * použít z obou runtime i z testů bez Next.js.
 */
import fs from 'fs/promises';
import path from 'path';

/**
 * Kam zálohovací kontejner zapisuje `stav.json`. V produkci je to bind mount
 * `./zalohy`, který `web` dostane připojený jen ke čtení.
 */
export const ZALOHY_DIR = process.env.ZALOHY_DIR || 'zalohy';

/**
 * Po jaké době se záloha považuje za zastaralou.
 *
 * 36 hodin, ne 24: záloha běží jednou denně, takže při přesně 24 hodinách by
 * varování naskočilo pokaždé, když se běh o pár minut opozdí (restart serveru,
 * delší `pg_dump`). 36 hodin znamená „jedna noc se opravdu vynechala“.
 */
export const ZASTARALA_PO_HODINACH = 36;

/** Co zapisuje `zapsat_stav()` v `deploy/zaloha.sh`. */
export interface StavZaloh {
  /** Kdy doběhl poslední pokus, ISO 8601 v UTC. */
  dokonceno: string;
  /** Povedl se poslední pokus? */
  uspech: boolean;
  /** Proč se nepovedl. `null` u úspěšného běhu. */
  chyba: string | null;
  dbBajtu: number;
  souboryBajtu: number;
  /** Jak dlouho se zálohy drží — přebírá se z `ZALOHY_DNU`. */
  drzetDnu: number;
}

/** Kolik hodin uplynulo od poslední zálohy. */
export function stariHodin(stav: StavZaloh, ted: Date = new Date()): number {
  const kdy = new Date(stav.dokonceno).getTime();
  if (Number.isNaN(kdy)) return Number.POSITIVE_INFINITY;
  return (ted.getTime() - kdy) / (1000 * 60 * 60);
}

/**
 * Načte stav poslední zálohy.
 *
 * `null` znamená „soubor tu není“ — ve vývoji je to normální (zálohovací
 * kontejner běží jen v produkčním compose), v produkci to znamená, že služba
 * `zalohy` nestartovala. Rozlišit to odsud nejde, proto se z toho dělá jen
 * doporučující varování, ne kritické.
 *
 * Poškozený nebo rozečtený JSON se chová stejně jako chybějící soubor. Skript
 * ho sice píše přes dočasný soubor a `mv`, takže by rozečtený být neměl, ale
 * spadnout na tom nesmí ani tak — je to hláška v administraci, ne účetnictví.
 */
export async function nacistStavZaloh(): Promise<StavZaloh | null> {
  try {
    const soubor = path.isAbsolute(ZALOHY_DIR)
      ? path.join(ZALOHY_DIR, 'stav.json')
      : path.join(process.cwd(), ZALOHY_DIR, 'stav.json');

    const obsah = await fs.readFile(soubor, 'utf8');
    const data = JSON.parse(obsah) as Partial<StavZaloh>;

    if (typeof data.dokonceno !== 'string' || typeof data.uspech !== 'boolean') {
      return null;
    }

    return {
      dokonceno: data.dokonceno,
      uspech: data.uspech,
      chyba: typeof data.chyba === 'string' ? data.chyba : null,
      dbBajtu: Number(data.dbBajtu) || 0,
      souboryBajtu: Number(data.souboryBajtu) || 0,
      drzetDnu: Number(data.drzetDnu) || 0,
    };
  } catch {
    return null;
  }
}
