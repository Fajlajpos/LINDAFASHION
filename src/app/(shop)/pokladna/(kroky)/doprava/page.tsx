import type { Metadata } from 'next';
import { KrokDoprava } from '@/components/shop/pokladna/KrokDoprava';

export const metadata: Metadata = {
  title: 'Doprava a platba | LINDA FASHION',
};

/** Krok 3 pokladny – doprava (s výdejním místem) a platba. */
export default function DopravaAPlatbaPage() {
  return <KrokDoprava />;
}
