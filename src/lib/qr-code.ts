import QRCode from 'qrcode';

/**
 * Generátor české QR Platby (Standard SPD 1.0)
 */
export function generateQrPaymentString(params: {
  iban: string;
  amount: number;
  variableSymbol: string;
  message?: string;
}): string {
  const cleanIban = params.iban.replace(/\s+/g, '');
  const formattedAmount = params.amount.toFixed(2);
  const vs = params.variableSymbol.replace(/\D/g, '');
  const msg = (params.message || `Objednavka ${params.variableSymbol}`)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Odstranění diakritiky
    .slice(0, 60);

  return `SPD*1.0*ACC:${cleanIban}*AM:${formattedAmount}*CC:CZK*VS:${vs}*MSG:${msg}`;
}

/**
 * QR kód platby jako SVG, vyrobený na serveru.
 *
 * Dřív se obrázek stahoval z `api.qrserver.com` – přímo prohlížečem zákaznice.
 * Cizí služba tak dostala její IP adresu a v adrese obrázku číslo účtu, částku
 * a variabilní symbol: příjemce osobních údajů bez smlouvy, a navíc závislost
 * uprostřed platebního kroku (výpadek služby = žádný QR). Teď se kód počítá
 * tady a do stránky jde hotový, takže z platby neodchází nic nikam.
 *
 * Úroveň opravy chyb M (15 %) je to, co bankovní aplikace čtou bez potíží
 * i z displeje s odleskem. `margin: 0`, protože bílý okraj kolem kódu kreslí
 * stránka sama.
 */
export async function qrPlatbaSvg(spdString: string): Promise<string> {
  return QRCode.toString(spdString, { type: 'svg', errorCorrectionLevel: 'M', margin: 0 });
}
