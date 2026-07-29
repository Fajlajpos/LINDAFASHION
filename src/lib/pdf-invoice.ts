/**
 * Pomocná třída pro generování dokladu/faktury k objednávce
 */

export interface InvoiceData {
  cisloFaktury: string;
  cisloObjednavky: string;
  datumVystaveni: string;
  dodavatel: {
    nazev: string;
    ico: string;
    dic?: string;
    adresa: string;
    iban: string;
  };
  odberatel: {
    jmeno: string;
    ulice: string;
    mesto: string;
    psc: string;
    email: string;
  };
  polozky: Array<{
    nazev: string;
    mnozstvi: number;
    cenaZaKus: number;
    celkem: number;
  }>;
  celkovaCena: number;
}

export function generateInvoiceData(order: any): InvoiceData {
  return {
    cisloFaktury: `VF-${order.cisloObjednavky.replace(/\D/g, '')}`,
    cisloObjednavky: order.cisloObjednavky,
    datumVystaveni: new Date().toLocaleDateString('cs-CZ'),
    dodavatel: {
      nazev: 'LINDA FASHION s.r.o.',
      ico: '12345678',
      dic: 'CZ12345678',
      adresa: 'Pařížská 12, 110 00 Praha 1',
      iban: process.env.BANK_IBAN || 'CZ6501000000001234567890',
    },
    odberatel: {
      jmeno: order.dodaciJmenoPrijmeni || 'Zákaznice',
      ulice: order.dodaciUlice || '',
      mesto: order.dodaciMesto || '',
      psc: order.dodaciPsc || '',
      email: order.user?.email || 'zakaznice@example.cz',
    },
    polozky: order.items?.map((item: any) => ({
      nazev: item.variant?.product?.nazev || 'Oblečení LINDA FASHION',
      mnozstvi: item.mnozstvi,
      cenaZaKus: Number(item.cenaVDobeNakupu),
      celkem: Number(item.cenaVDobeNakupu) * item.mnozstvi,
    })) || [],
    celkovaCena: Number(order.celkovaCena || 0),
  };
}
