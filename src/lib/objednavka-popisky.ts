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

/**
 * Česká časová zóna pro všechna data, která e-shop ukazuje.
 *
 * Většina volajících jsou Server Components v administraci, tedy kód, který
 * v produkci běží v kontejneru bez `tzdata` – v UTC. Bez zóny ukazovala
 * administrace časy o hodinu až dvě posunuté a objednávku z půlnoci pod
 * datem předchozího dne. Node si zónová data nese v sobě (ICU), takže
 * `Europe/Prague` funguje i tam, kde operační systém žádná nemá.
 */
const ZONA = 'Europe/Prague';

export function formatDatum(datum: Date): string {
  return datum.toLocaleDateString('cs-CZ', {
    timeZone: ZONA,
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });
}

export function formatDatumCas(datum: Date): string {
  return datum.toLocaleString('cs-CZ', {
    timeZone: ZONA,
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Způsob vyřízení reklamace, jak ho požaduje zákaznice.
 *
 * Jedno místo pro formuláře, administraci i e-mailové potvrzení – worker ho
 * importuje relativně, proto tu nesmí přibýt žádný import z `next/*` ani `@/`.
 * Pořadí odpovídá tomu, jak zákon možnosti řadí: nejdřív oprava a výměna.
 */
export const ZPUSOBY_VYRIZENI = ['OPRAVA', 'VYMENA', 'SLEVA', 'ODSTOUPENI'] as const;

export type ZpusobVyrizeni = (typeof ZPUSOBY_VYRIZENI)[number];

export const NAZEV_ZPUSOBU_VYRIZENI: Record<ZpusobVyrizeni, string> = {
  OPRAVA: 'Oprava',
  VYMENA: 'Výměna za nový kus',
  SLEVA: 'Přiměřená sleva',
  ODSTOUPENI: 'Odstoupení od smlouvy (vrácení peněz)',
};

/**
 * Věta pod výběrem. Formulář nesmí slibovat, že vybraná možnost je nárok –
 * sleva a vrácení peněz přicházejí na řadu, až když oprava ani výměna nejde.
 */
export const NAPOVEDA_ZPUSOBU_VYRIZENI =
  'Vada se podle zákona nejdřív řeší opravou nebo výměnou. Slevu nebo vrácení peněz můžete požadovat, ' +
  'když to nejde, trvalo by to příliš dlouho, nebo jde o závažnou vadu.';
