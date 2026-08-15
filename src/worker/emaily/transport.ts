/**
 * SMTP spojení pro transakční e-maily.
 *
 * Jedna instance na celý proces – nodemailer si drží pool spojení, takže se
 * TLS handshake neplatí u každé zprávy znovu. Worker běží dlouho, tohle je
 * přesně případ, kde se pool vyplatí.
 *
 * Bez aliasů `@/` – soubor se kompiluje do buildu workeru.
 */
import nodemailer, { type Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

export interface SmtpNastaveni {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
}

/**
 * Přečte `.env`. Vrací `null`, když přístupy nejsou kompletní – volající to
 * musí umět, protože e-shop musí fungovat i bez SMTP.
 *
 * `SMTP_PASSWORD` schválně **není** povinné: relay běžící na stejné síti
 * (Postfix v compose, Mailpit ve vývoji) autentizaci často nechce. Povinná je
 * jen adresa serveru a odesílatel – bez nich není kam a odkud posílat.
 */
export function nacistSmtp(): SmtpNastaveni | null {
  const host = process.env.SMTP_HOST?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!host || !from) return null;

  const port = Number(process.env.SMTP_PORT ?? 587);

  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : 587,
    /*
     * Port 465 je implicitní TLS („SMTPS"), všechno ostatní začíná v plaintextu
     * a šifruje se až příkazem STARTTLS. Nodemailer to řídí přepínačem
     * `secure`; nastavit ho na 587 znamená, že se handshake nikdy nedokončí
     * a odesílání spadne na timeout, ne na srozumitelnou chybu.
     */
    secure: port === 465,
    user: process.env.SMTP_USER?.trim() ?? '',
    password: process.env.SMTP_PASSWORD ?? '',
    from,
  };
}

export function ziskatTransport(nastaveni: SmtpNastaveni): Transporter {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: nastaveni.host,
    port: nastaveni.port,
    secure: nastaveni.secure,
    // Bez uživatele se `auth` vynechá úplně. Prázdný objekt by nodemailer
    // vzal jako pokus o přihlášení prázdnými údaji a relay ho odmítne.
    auth: nastaveni.user ? { user: nastaveni.user, pass: nastaveni.password } : undefined,
    pool: true,
    maxConnections: 2,
    // Poskytovatelé (Seznam, Google Workspace) mají limity na počet zpráv za
    // spojení; nižší číslo je bezpečnější než zablokovaný účet.
    maxMessages: 50,
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  return transporter;
}

/** Uzavře pool při vypínání workeru, ať se spojení nezůstane povalovat. */
export async function zavritTransport(): Promise<void> {
  if (transporter) {
    transporter.close();
    transporter = null;
  }
}
