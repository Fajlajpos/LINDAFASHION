import React from 'react';
import type { Metadata } from 'next';
import { Mail, Phone, MapPin, Clock, MessageCircle } from 'lucide-react';
import { KontaktFormular } from '@/components/shop/KontaktFormular';
import { siteKey } from '@/lib/captcha';
import { nacistNastaveni } from '@/lib/nastaveni';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Kontakt | LINDA FASHION',
  description:
    'Kontaktní údaje, otevírací doba showroomu a formulář pro dotazy k velikostem, střihům i doručení.',
  alternates: { canonical: '/kontakt' },
};

/**
 * Kontakt.
 *
 * Adresa, telefon i e-mail se čtou z administrace (`Settings`). Dřív byly
 * napsané natvrdo v komponentě, takže je majitelka nemohla změnit – a při
 * stěhování showroomu by na webu zůstala stará adresa až do nasazení.
 */
export default async function KontaktPage() {
  const nastaveni = await nacistNastaveni();

  const telefonProOdkaz = nastaveni.telefonFirmy?.replace(/[^\d+]/g, '') ?? null;

  const polozky = [
    {
      Ikona: MapPin,
      nadpis: 'Adresa butiku a sídlo',
      obsah: nastaveni.adresaFirmy ? (
        <span className="whitespace-pre-line text-linda-espresso/75">
          {nastaveni.nazevFirmy && `${nastaveni.nazevFirmy}\n`}
          {nastaveni.adresaFirmy}
        </span>
      ) : null,
    },
    {
      Ikona: Phone,
      nadpis: 'Zákaznická linka',
      obsah: nastaveni.telefonFirmy ? (
        <a
          href={`tel:${telefonProOdkaz}`}
          className="font-medium text-linda-cognac transition-colors hover:text-linda-cognacHover hover:underline"
        >
          {nastaveni.telefonFirmy}
        </a>
      ) : null,
    },
    {
      Ikona: Mail,
      nadpis: 'E-mail',
      obsah: nastaveni.emailFirmy ? (
        <a
          href={`mailto:${nastaveni.emailFirmy}`}
          className="font-medium text-linda-cognac transition-colors hover:text-linda-cognacHover hover:underline"
        >
          {nastaveni.emailFirmy}
        </a>
      ) : null,
    },
    {
      Ikona: Clock,
      nadpis: 'Otevírací doba showroomu',
      obsah: (
        <span className="text-linda-espresso/75">
          Po – Pá: 10:00 – 18:00
          <br />
          So: 10:00 – 14:00
        </span>
      ),
    },
  ].filter((p) => p.obsah !== null);

  return (
    <div className="mx-auto max-w-7xl space-y-16 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-3 border-b border-linda-sand pb-8 text-center">
        <span className="block text-xs font-semibold uppercase tracking-widest text-linda-cognac">
          Rádi vám poradíme
        </span>
        <h1 className="font-serif text-4xl text-linda-espresso sm:text-5xl">Kontakt &amp; showroom</h1>
        <p className="text-sm font-light text-linda-espresso/75">
          Máte dotaz k velikostem, střihu nebo doručení? Napište nám nebo zavolejte, jsme tu pro vás.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-5">
          <div className="space-y-6 rounded-3xl bg-linda-cream p-8 shadow-neu">
            <h2 className="font-serif text-2xl text-linda-espresso">Kontaktní údaje</h2>

            {polozky.length === 0 ? (
              <p className="rounded-xl bg-linda-sandLight p-4 text-xs text-linda-espresso/75 shadow-neuInsetSm">
                Kontaktní údaje zatím doplňujeme. Napište nám prosím přes formulář vedle.
              </p>
            ) : (
              /* Každá ikona sedí na vystouplém terči – reliéf ji odliší, aniž
                 bychom sáhli po další barvě. */
              <div className="space-y-4 text-xs text-linda-espresso">
                {polozky.map(({ Ikona, nadpis, obsah }) => (
                  <div key={nadpis} className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linda-cream shadow-neuSm">
                      <Ikona className="h-5 w-5 text-linda-cognac" aria-hidden="true" />
                    </span>
                    <div className="pt-1">
                      <strong className="block font-semibold">{nadpis}</strong>
                      {obsah}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {telefonProOdkaz && (
              <div className="border-t border-linda-sand/40 pt-4">
                <a
                  href={`https://wa.me/${telefonProOdkaz.replace(/^\+/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-touch cursor-pointer items-center justify-between gap-3 rounded-2xl bg-linda-sageLight p-3 text-xs text-linda-espresso shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <MessageCircle className="h-4 w-4 text-linda-sage" aria-hidden="true" />
                    Rychlý dotaz na WhatsApp
                  </span>
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="space-y-6 rounded-3xl bg-linda-cream p-8 shadow-neu">
            <h2 className="font-serif text-2xl text-linda-espresso">Napište nám vzkaz</h2>

            {/* Slib o ochraně Turnstile tu dřív stál, přestože captcha není
                zapojená – tvrzení o bezpečnosti, které neplatí, je horší než
                žádné. Formulář zatím chrání limit požadavků na straně serveru. */}
            <KontaktFormular captchaSiteKey={siteKey()} />
          </div>
        </div>
      </div>
    </div>
  );
}
