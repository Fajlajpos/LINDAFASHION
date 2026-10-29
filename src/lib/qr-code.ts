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

/**
 * Tentýž QR kód jako PNG (`data:` adresa) ke stažení.
 *
 * Zákaznice si kód ukládá, aby ho v bankovní aplikaci načetla z galerie –
 * telefon, na kterém QR zrovna vidí, ho sám sebou vyfotit neumí. SVG do
 * galerie nejde uložit, proto PNG. Bílý okraj (`margin: 4`) tu na rozdíl od
 * stránky být musí: uložený obrázek nemá kolem sebe nic, co by ho kreslilo,
 * a bez tiché zóny ho čtečky z galerie často nenajdou.
 */
export async function qrPlatbaPng(spdString: string): Promise<string> {
  return QRCode.toDataURL(spdString, { errorCorrectionLevel: 'M', margin: 4, width: 600 });
}
