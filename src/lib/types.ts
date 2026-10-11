export interface CartItemType {
  variantId: string;
  productId: string;
  nazev: string;
  slug: string;
  velikost: string;
  barva?: string | null;
  cena: number;
  cenaPoSleve?: number | null;
  /**
   * Nejnižší cena za 30 dnů (haléře) – košík slevu oznamuje stejně jako karta,
   * takže potřebuje i referenci pro § 12a. Starší položky z `localStorage` ji
   * nemají; pak se ukáže jen cena, bez oznámení slevy.
   */
  nejnizsiCena30DniHaleru?: number | null;
  mnozstvi: number;
  obrazekUrl?: string | null;
  skladem: number;
}

export interface ShippingOption {
  id: string;
  nazev: string;
  popis: string;
  cena: number;
  vyzadujeVydejniMisto: boolean;
}

export interface PaymentOption {
  id: string;
  nazev: string;
  popis: string;
  aktivni: boolean;
  isTemporaryBridge?: boolean;
}
