import type { Metadata } from 'next';
import { KrokShrnuti } from '@/components/shop/pokladna/KrokShrnuti';

export const metadata: Metadata = {
  title: 'Shrnutí objednávky | LINDA FASHION',
};

/** Krok 4 pokladny – kontrola a odeslání objednávky. */
export default function ShrnutiPage() {
  return <KrokShrnuti />;
}
