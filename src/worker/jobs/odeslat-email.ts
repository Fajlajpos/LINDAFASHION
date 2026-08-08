/**
 * Odesílání transakčních e-mailů.
 *
 * SMTP přístupy zatím nejsou (sekce 8 a 16 zadání), takže se e-mail nikam
 * neodešle – úloha ho vypíše do logu workeru. Až se do `.env` doplní
 * `SMTP_HOST` a spol., stačí dopsat tělo `odeslat()`; zbytek aplikace
 * (fronta, volající místa, obsah zpráv) se měnit nemusí.
 *
 * Důležité: úloha nesmí házet výjimku jen proto, že SMTP chybí. Jinak by
 * pg-boss donekonečna opakoval něco, co teď z principu nemůže projít.
 */

export type TypEmailu =
  | 'obnova-hesla'
  | 'potvrzeni-objednavky'
  | 'zmena-stavu-objednavky'
  | 'opusteny-kosik'
  | 'dochazejici-sklad'
  | 'skladem-znovu'
  | 'nova-zprava-z-formulare'
  | 'nova-reklamace';

export interface UlohaEmail {
  typ: TypEmailu;
  to: string;
  subject: string;
  data?: Record<string, unknown>;
}

function jeSmtpNastavene(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.EMAIL_FROM);
}

/**
 * Zpráva do logu – jediné „doručení“, které dnes umíme.
 *
 * Vypisuje se stejně, ať už SMTP nastavené je, nebo není. Dřív se při
 * nastaveném SMTP vypsalo jen varování bez obsahu, takže vyplnění `.env`
 * stav zhoršilo: e-mail se pořád neodeslal, ale zmizel i odkaz na obnovu
 * hesla, který byl do té doby v logu k dispozici.
 */
function zapsatDoLogu(uloha: UlohaEmail, duvod: string): void {
  const { typ, to, subject, data } = uloha;

  console.log(`[e-mail] ${typ} → ${to} se NEODESLAL (${duvod}).`);
  console.log(`         Předmět: ${subject}`);

  // Odkaz na obnovu hesla v logu je bezpečnostní díra – v produkci nikdy.
  if (typ === 'obnova-hesla' && process.env.NODE_ENV !== 'production' && data?.odkaz) {
    console.log(`         Odkaz pro obnovu (jen ve vývoji): ${String(data.odkaz)}`);
  }
}

export async function odeslatEmailUloha(uloha: UlohaEmail): Promise<void> {
  if (!jeSmtpNastavene()) {
    zapsatDoLogu(uloha, 'SMTP není nastavené');
    return;
  }

  // TODO(SMTP): až budou přístupy, odeslat přes nodemailer/Resend.
  // Šablony patří do samostatného souboru, ať tahle úloha zůstane jen doručovací.
  //
  // Do té doby se vyplněné SMTP chová stejně jako prázdné – včetně výpisu
  // obsahu. Tichý propad by byl horší než zjevná mezera.
  zapsatDoLogu(uloha, 'SMTP je nastavené, ale odesílání ještě není zapojené');
}
