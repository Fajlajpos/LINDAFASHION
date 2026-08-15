/**
 * Odesílání transakčních e-mailů.
 *
 * Doručovací vrstva a nic víc: obsah zprávy sestavuje `../emaily/sablony.ts`,
 * spojení drží `../emaily/transport.ts`.
 *
 * ## Tři stavy, tři chování
 *
 * 1. **SMTP není v `.env`** – zpráva se vypíše do logu a úloha skončí úspěchem.
 *    Vyhodit výjimku by znamenalo, že pg-boss donekonečna opakuje něco, co
 *    z principu projít nemůže.
 * 2. **SMTP je a odeslání projde** – do logu jde jednořádkové potvrzení.
 * 3. **SMTP je a odeslání selže** – obsah se vypíše do logu (aby se zpráva
 *    neztratila) a výjimka jde dál, aby si to pg-boss zopakoval. Výpadek
 *    relaye bývá dočasný; `retryLimit: 3` s exponenciálním odstupem ho
 *    obvykle přečká.
 *
 * Historická poznámka: dřív se při vyplněném SMTP vypsalo jen varování bez
 * obsahu. Nastavení `.env` tak situaci zhoršilo – e-mail se pořád neodeslal,
 * ale z logu zmizel i odkaz na obnovu hesla, který tam do té doby byl.
 * Proto se obsah loguje v každé větvi, kde zpráva k adresátce nedorazila.
 */
import { nacistSmtp, ziskatTransport } from '../emaily/transport';
import { sestavitEmail } from '../emaily/sablony';

export type TypEmailu =
  | 'obnova-hesla'
  | 'potvrzeni-objednavky'
  | 'zmena-stavu-objednavky'
  | 'platba-prijata'
  | 'opusteny-kosik'
  | 'dochazejici-sklad'
  | 'skladem-znovu'
  | 'newsletter-potvrzeni'
  | 'nova-zprava-z-formulare'
  | 'nova-reklamace';

export interface UlohaEmail {
  typ: TypEmailu;
  to: string;
  subject: string;
  data?: Record<string, unknown>;
}

/**
 * Zpráva do logu – „doručení", když skutečné selhalo nebo není možné.
 */
function zapsatDoLogu(uloha: UlohaEmail, duvod: string): void {
  const { typ, to, subject, data } = uloha;

  console.log(`[e-mail] ${typ} → ${to} se NEODESLAL (${duvod}).`);
  console.log(`         Předmět: ${subject}`);

  // Odkaz na obnovu hesla v logu je bezpečnostní díra – v produkci nikdy.
  if (
    (typ === 'obnova-hesla' || typ === 'newsletter-potvrzeni') &&
    process.env.NODE_ENV !== 'production' &&
    data?.odkaz
  ) {
    console.log(`         Odkaz (jen ve vývoji): ${String(data.odkaz)}`);
  }
}

export async function odeslatEmailUloha(uloha: UlohaEmail): Promise<void> {
  const smtp = nacistSmtp();

  if (!smtp) {
    zapsatDoLogu(uloha, 'SMTP není nastavené');
    return;
  }

  const obsah = sestavitEmail(uloha.typ, uloha.data ?? {});

  if (!obsah) {
    // Neznámý typ je chyba v kódu, ne provozní výpadek – opakování nepomůže.
    zapsatDoLogu(uloha, `pro typ „${uloha.typ}" neexistuje šablona`);
    return;
  }

  try {
    await ziskatTransport(smtp).sendMail({
      from: smtp.from,
      to: uloha.to,
      // Šablona smí předmět upřesnit (zná stav objednávky); jinak platí ten
      // z úlohy, aby volající místa zůstala čitelná.
      subject: obsah.predmet ?? uloha.subject,
      text: obsah.text,
      html: obsah.html,
    });

    console.log(`[e-mail] ${uloha.typ} → ${uloha.to} odesláno.`);
  } catch (err) {
    zapsatDoLogu(uloha, 'odeslání přes SMTP selhalo');
    console.error('[e-mail] Chyba SMTP:', err);

    // Dál k pg-boss, ať to zkusí znovu (retryLimit/retryBackoff v queue.ts).
    throw err;
  }
}
