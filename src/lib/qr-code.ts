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

export function getQrPaymentImageUrl(spdString: string, size = 220): string {
  const encoded = encodeURIComponent(spdString);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
}
