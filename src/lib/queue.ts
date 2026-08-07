/**
 * Fronta úloh (pg-boss nad stejným Postgresem, sekce 3 zadání).
 *
 * Sdílí ji `web` (zakládá úlohy) i `worker` (zpracovává je). Díky tomu se
 * nahrání dvaceti fotek neprojeví na rychlosti webu pro zákaznice.
 *
 * Bez aliasů @/ – tenhle soubor se kompiluje i do buildu workeru.
 */
import PgBoss from 'pg-boss';

/** Názvy front na jednom místě, ať se překlep nerozejde mezi web a workerem. */
export const FRONTY = {
  ZPRACOVAT_OBRAZEK: 'zpracovat-obrazek',
  ODESLAT_EMAIL: 'odeslat-email',
  VYGENEROVAT_FAKTURU: 'vygenerovat-fakturu',
  VYGENEROVAT_POUKAZY: 'vygenerovat-poukazy',
} as const;

export interface UlohaZpracovatObrazek {
  /** ProductImage.id – worker podle něj zapíše výsledek zpět. */
  obrazekId: string;
  /** Název souboru ve storage/tmp. */
  token: string;
}

let boss: PgBoss | null = null;
let startPromise: Promise<PgBoss> | null = null;

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL není nastavená – frontu úloh nelze spustit.');
  return url;
}

/**
 * Vrátí spuštěnou instanci pg-boss. Při chybě vyhodí výjimku – dřív se tady
 * chyba jen zalogovala a vrátila se nespuštěná instance, na které pak každé
 * `send()` tiše selhalo.
 */
export async function getQueueBoss(): Promise<PgBoss> {
  if (boss) return boss;

  if (!startPromise) {
    startPromise = (async () => {
      const instance = new PgBoss({
        connectionString: connectionString(),
        application_name: 'linda-fashion-queue',
        // Hotové úlohy nemá smysl držet věčně – archiv jinak roste donekonečna.
        archiveCompletedAfterSeconds: 60 * 60 * 24,
        deleteAfterDays: 7,
      });

      instance.on('error', (error) => console.error('[fronta] pg-boss chyba:', error));

      await instance.start();
      boss = instance;
      console.log('⚡ Fronta úloh (pg-boss) běží.');
      return instance;
    })();

    startPromise.catch(() => {
      // Ať další pokus zkusí start znovu, místo aby čekal na tuhle odmítnutou promise.
      startPromise = null;
    });
  }

  return startPromise;
}

/**
 * Zařadí úlohu. Vrací id úlohy, nebo `null`, když se frontu nepodařilo oslovit.
 *
 * `null` NENÍ tichá ztráta práce: fotka zůstane ve stavu CEKA a worker si ji
 * vyzvedne pravidelnou kontrolou zaseknutých fotek (viz worker/index.ts).
 */
export async function publishJob(fronta: string, data: object): Promise<string | null> {
  try {
    const instance = await getQueueBoss();
    return await instance.send(fronta, data, {
      retryLimit: 3,
      retryDelay: 30,
      retryBackoff: true,
    });
  } catch (err) {
    console.error(`[fronta] Nepodařilo se zařadit úlohu [${fronta}]:`, err);
    return null;
  }
}

export async function zastavitFrontu(): Promise<void> {
  if (boss) {
    await boss.stop({ graceful: true });
    boss = null;
    startPromise = null;
  }
}
