/**
 * Ověření Cloudflare Turnstile.
 *
 * Klíče v `.env` byly od začátku, ověřovat je ale neuměl nikdo – formuláře
 * chránil jen limit požadavků podle IP, což zdrží člověka, ne botnet.
 *
 * ## Chování bez klíčů
 *
 * Když `TURNSTILE_SECRET_KEY` chybí, ověření **projde**. Vypnutá captcha
 * nesmí zavřít kontaktní formulář ani registraci – dokud majitelka klíče
 * nemá, e-shop musí fungovat. Jakmile klíč doplní, začne se kontrolovat samo.
 *
 * ## Proč se neověřuje jen „nějak"
 *
 * Turnstile vrací token, který platí jednou a pár minut. Ověřuje se dotazem
 * server–server; kdyby o platnosti rozhodoval prohlížeč, stačilo by požadavek
 * poslat bez něj.
 */

const ADRESA_OVERENI = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface VysledekCaptchy {
  ok: boolean;
  /** Hláška pro formulář; vyplněná jen při neúspěchu. */
  zprava?: string;
}

/** Je captcha zapnutá? Podle toho se widget vůbec vykreslí. */
export function jeCaptchaZapnuta(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim() && process.env.TURNSTILE_SITE_KEY?.trim());
}

/** Veřejný klíč pro widget. `null` znamená „captchu nevykresluj". */
export function siteKey(): string | null {
  return jeCaptchaZapnuta() ? (process.env.TURNSTILE_SITE_KEY?.trim() ?? null) : null;
}

/**
 * Ověří token z formuláře.
 *
 * `ip` je nepovinná – Cloudflare ji použije jen jako doplňkový signál.
 * Posílá se ta z `X-Forwarded-For`, tedy hodnota, kterou nastavuje proxy.
 */
export async function overitCaptchu(token: unknown, ip?: string | null): Promise<VysledekCaptchy> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();

  // Bez klíče se captcha nekontroluje – viz komentář v hlavičce souboru.
  if (!secret) return { ok: true };

  if (typeof token !== 'string' || token.trim() === '') {
    return { ok: false, zprava: 'Potvrďte prosím, že nejste robot.' };
  }

  const telo = new URLSearchParams({ secret, response: token.trim() });
  if (ip) telo.set('remoteip', ip);

  try {
    const odpoved = await fetch(ADRESA_OVERENI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: telo,
      cache: 'no-store',
      // Cloudflare bývá dostupná, ale formulář nesmí viset donekonečna.
      signal: AbortSignal.timeout(8000),
    });

    if (!odpoved.ok) {
      /*
       * Výpadek ověřovací služby propouštíme.
       *
       * Rozhodnutí je vědomé: alternativa je zavřít kontaktní formulář,
       * registraci i objednávku pokaždé, když má Cloudflare problém. Spam
       * za tu dobu je levnější než nedostupný obchod, a limit požadavků
       * podle IP mezitím platí dál.
       */
      console.error(`[captcha] Ověření selhalo (HTTP ${odpoved.status}) – požadavek propuštěn.`);
      return { ok: true };
    }

    const vysledek = (await odpoved.json()) as { success?: boolean; 'error-codes'?: string[] };

    if (vysledek.success) return { ok: true };

    // Kódy chyb jdou do logu, ne k uživateli – nesou detaily o konfiguraci.
    console.warn(`[captcha] Neplatný token: ${(vysledek['error-codes'] ?? []).join(', ') || 'bez detailu'}`);

    return {
      ok: false,
      zprava: 'Ověření se nezdařilo. Načtěte prosím stránku znovu a zkuste to ještě jednou.',
    };
  } catch (err) {
    console.error('[captcha] Ověřovací službu se nepodařilo oslovit – požadavek propuštěn:', err);
    return { ok: true };
  }
}
