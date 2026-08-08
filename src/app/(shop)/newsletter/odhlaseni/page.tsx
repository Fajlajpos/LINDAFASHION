import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { MailX } from 'lucide-react';
import { db } from '@/lib/db';
import { OdhlaseniNewsletteru } from '@/components/shop/OdhlaseniNewsletteru';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Odhlášení z odběru novinek | LINDA FASHION',
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: { token?: string };
}

/**
 * Cílová stránka odhlašovacího odkazu z e-mailu.
 *
 * Odkaz nese **token**, ne e-mail. S adresou v URL by kdokoliv odhlásil
 * kohokoliv, komu uhodne e-mail; token je náhodný a patří k jedinému záznamu.
 *
 * Adresa se navíc zobrazuje zakrytá – stránka má potvrdit, o čí odběr jde,
 * ne vypsat cizí e-mail komukoliv, kdo odkaz zachytí.
 */
function zakrytEmail(email: string): string {
  const [jmeno, domena] = email.split('@');
  if (!domena) return '***';

  const viditelne = jmeno.length <= 2 ? jmeno.slice(0, 1) : `${jmeno[0]}***${jmeno[jmeno.length - 1]}`;
  return `${viditelne}@${domena}`;
}

export default async function OdhlaseniPage({ searchParams }: Props) {
  const token = searchParams.token?.trim() ?? '';

  const odberatel = token
    ? await db.newsletterSubscriber.findUnique({
        where: { token },
        select: { email: true, odhlasenAt: true },
      })
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="space-y-6 rounded-2xl bg-linda-cream p-8 shadow-neu sm:p-10">
        <h1 className="flex items-center gap-3 font-serif text-3xl text-linda-espresso">
          <MailX className="h-6 w-6 text-linda-cognac" aria-hidden="true" />
          Odhlášení z odběru
        </h1>

        {!odberatel ? (
          <div className="space-y-5">
            <p className="text-xs leading-relaxed text-linda-espresso/85">
              Tenhle odhlašovací odkaz už neplatí – buď jste se odhlásila dřív, nebo se odkaz
              cestou poškodil. Pokud vám novinky pořád chodí, napište nám prosím a odhlásíme vás
              ručně.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/kontakt"
                className="flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
              >
                Napsat nám
              </Link>

              <Link
                href="/"
                className="flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cream px-6 text-xs font-semibold text-linda-espresso shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
              >
                Zpět do obchodu
              </Link>
            </div>
          </div>
        ) : odberatel.odhlasenAt !== null ? (
          <div className="space-y-5">
            <p className="rounded-xl bg-linda-sageLight p-3 text-xs font-medium text-linda-sage">
              Adresu {zakrytEmail(odberatel.email)} už z odběru novinek evidujeme jako odhlášenou.
              Nemusíte dělat nic dalšího.
            </p>

            <Link
              href="/"
              className="inline-flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
            >
              Zpět do obchodu
            </Link>
          </div>
        ) : (
          <OdhlaseniNewsletteru token={token} email={zakrytEmail(odberatel.email)} />
        )}
      </div>
    </div>
  );
}
