/** Popisky stavů objednávek a reklamací – sdílené adminem i účtem zákaznice. */

export const STAV_OBJEDNAVKY: Record<string, { text: string; tridy: string }> = {
  NOVA: { text: 'Nová', tridy: 'bg-linda-cognac text-white' },
  ZPRACOVAVA_SE: { text: 'Zpracovává se', tridy: 'bg-linda-sandLight text-linda-espresso shadow-neuInsetSm' },
  EXPEDOVANA: { text: 'Expedována', tridy: 'bg-linda-sageLight text-linda-sage' },
  DORUCENA: { text: 'Doručena', tridy: 'bg-linda-sageLight text-linda-sage' },
  ZRUSENA: { text: 'Zrušena', tridy: 'bg-linda-sandLight text-red-800 shadow-neuInsetSm' },
  VRACENA: { text: 'Vrácena', tridy: 'bg-linda-sandLight text-red-800 shadow-neuInsetSm' },
};

export const STAV_PLATBY: Record<string, string> = {
  CEKA_NA_PLATBU: 'Čeká na platbu',
  ZAPLACENO: 'Zaplaceno',
  VRACENO: 'Peníze vráceny',
};

export const STAV_REKLAMACE: Record<string, { text: string; tridy: string }> = {
  PRIJATA: { text: 'Přijata', tridy: 'bg-linda-cognac text-white' },
  RESI_SE: { text: 'Řeší se', tridy: 'bg-linda-sandLight text-linda-espresso shadow-neuInsetSm' },
  VYRIZENA_UZNANA: { text: 'Uznána', tridy: 'bg-linda-sageLight text-linda-sage' },
  VYRIZENA_ZAMITNUTA: { text: 'Zamítnuta', tridy: 'bg-linda-sandLight text-red-800 shadow-neuInsetSm' },
};

export const NAZEV_DOPRAVY: Record<string, string> = {
  zasilkovna: 'Zásilkovna',
  ppl: 'PPL',
  ceska_posta: 'Česká pošta',
};

export const NAZEV_PLATBY: Record<string, string> = {
  bankovni_prevod: 'Bankovní převod',
  gopay: 'Platba kartou (GoPay)',
};

export function formatDatum(datum: Date): string {
  return datum.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' });
}

export function formatDatumCas(datum: Date): string {
  return datum.toLocaleString('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
