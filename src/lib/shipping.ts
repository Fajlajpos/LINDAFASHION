import { ShippingOption } from './types';

export const SHIPPING_METHODS: ShippingOption[] = [
  {
    id: 'zasilkovna',
    nazev: 'Zásilkovna / Packeta (Výdejní místo & Z-BOX)',
    popis: 'Doručení na vybrané výdejní místo nebo samoobslužný Z-BOX.',
    cena: 79,
    vyzadujeVydejniMisto: true,
  },
  {
    id: 'ppl',
    nazev: 'PPL – Doručení na adresu',
    popis: 'Komfortní doručení kuriérem PPL až k vašim dveřím.',
    cena: 109,
    vyzadujeVydejniMisto: false,
  },
  {
    id: 'ceska_posta',
    nazev: 'Česká pošta – Balík Do ruky',
    popis: 'Doručení České pošty přímo na uvedenou doručovací adresu.',
    cena: 99,
    vyzadujeVydejniMisto: false,
  },
];

export async function calculateShippingCost(
  shippingId: string,
  totalCartValue: number,
  freeShippingThreshold?: number | null
): Promise<number> {
  if (freeShippingThreshold && totalCartValue >= freeShippingThreshold) {
    return 0; // Doprava Zdarma
  }

  const method = SHIPPING_METHODS.find((s) => s.id === shippingId);
  return method ? method.cena : 79;
}
