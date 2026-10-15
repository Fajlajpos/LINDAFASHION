import type { Metadata } from 'next';
import { KrokUdaje } from '@/components/shop/pokladna/KrokUdaje';

export const metadata: Metadata = {
  title: 'Údaje | LINDA FASHION',
};

/** Krok 2 pokladny – kontakt a adresa. Data načítá layout kroků. */
export default function UdajePage() {
  return <KrokUdaje />;
}
