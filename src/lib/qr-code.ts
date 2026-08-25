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
 * Adresa obrázku QR platby u externí služby.
 *
 * **Pozor, tohle je příjemce osobních údajů.** Obrázek si stahuje prohlížeč
 * zákaznice, takže se na `api.qrserver.com` dostane její IP adresa a v adrese
 * obrázku i číslo účtu, částka a variabilní symbol. Služba proto patří do
 * evidence příjemců (`dokumenty/zpracovatele-a-smlouvy.md`, položka 10) a do
 * zásad ochrany osobních údajů.
 *
 * Zároveň je to externí závislost uprostřed platebního kroku: když služba
 * vypadne, QR kód se nevykreslí. Potvrzovací stránka to snese – číslo účtu
 * i variabilní symbol jsou vedle vypsané textem, takže se dá zaplatit i bez
 * obrázku. Kdyby se to mělo řešit, správná cesta je generovat QR lokálně.
 */
export function getQrPaymentImageUrl(spdString: string, size = 220): string {
  const encoded = encodeURIComponent(spdString);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
}
