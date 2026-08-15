import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { MailCheck } from 'lucide-react';
import { db } from '@/lib/db';
import { PotvrzeniNewsletteru } from '@/components/shop/PotvrzeniNewsletteru';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Potvrzení odběru novinek | LINDA FASHION',
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: { token?: string };
}

/**
 * Cílová stránka potvrzovacího odkazu z e-mailu (double opt-in).
 *
 * Odkaz nese **token**, ne e-mail: s adresou v URL by kdokoliv přihlásil
 * kohokoliv, komu uhodne e-mail. Adresa se zobrazuje zakrytá – stránka má
 * potvrdit, o čí odběr jde, ne vypsat cizí e-mail komukoliv, kdo odkaz zachytí.
 */
function zakrytEmail(email: string): string {
  const [jmeno, domena] = email.split('@');
  if (!domena) return '***';

  const viditelne = jmeno.length <= 2 ? jmeno.slice(0, 1) : `${jmeno[0]}***${jmeno[jmeno.length - 1]}`;
  return `${viditelne}@${domena}`;
}

export default async function PotvrzeniPage({ searchParams }: Props) {
  const token = searchParams.token?.trim() ?? '';

  const odberatel = token
    ? await db.newsletterSubscriber.findUnique({
        where: { token },
        select: { email: true, potvrzeno: true, odhlasenAt: true },
      })
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="space-y-6 rounded-2xl bg-linda-cream p-8 shadow-neu sm:p-10">
        <h1 className="flex items-center gap-3 font-serif text-3xl text-linda-espresso">
          <MailCheck className="h-6 w-6 text-linda-cognac" aria-hidden="true" />
          Potvrzení odběru
        </h1>

        {!odberatel ? (
          <div className="space-y-5">
            <p className="text-xs leading-relaxed text-linda-espresso/85">
              Tenhle potvrzovací odkaz už neplatí – buď se cestou poškodil, nebo je příliš starý.
              Přihlaste se prosím k odběru znovu formulářem v patičce webu.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
              >
                Zpět do obchodu
              </Link>

              <Link
                href="/kontakt"
                className="flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cream px-6 text-xs font-semibold text-linda-espresso shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
              >
                Napsat nám
              </Link>
            </div>
          </div>
        ) : odberatel.odhlasenAt !== null ? (
          <div className="space-y-5">
            <p className="rounded-xl bg-linda-sandLight p-3 text-xs font-medium text-linda-espresso shadow-neuInsetSm">
              Adresu {zakrytEmail(odberatel.email)} evidujeme jako odhlášenou z odběru. Potvrzením
              starého odkazu ji zpátky nepřihlašujeme – použijte prosím formulář v patičce webu.
            </p>

            <Link
              href="/"
              className="inline-flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
            >
              Zpět do obchodu
            </Link>
          </div>
        ) : odberatel.potvrzeno ? (
          <div className="space-y-5">
            <p className="rounded-xl bg-linda-sageLight p-3 text-xs font-medium text-linda-sage">
              Adresu {zakrytEmail(odberatel.email)} už v odběru novinek máme potvrzenou. Nemusíte
              dělat nic dalšího.
            </p>

            <Link
              href="/produkty"
              className="inline-flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
            >
              Prohlédnout novinky
            </Link>
          </div>
        ) : (
          <PotvrzeniNewsletteru token={token} email={zakrytEmail(odberatel.email)} />
        )}
      </div>
    </div>
  );
}
