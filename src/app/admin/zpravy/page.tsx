import React from 'react';
import { Inbox, Mail, MailOpen } from 'lucide-react';
import { db } from '@/lib/db';
import { OznacitVyrizene } from '@/components/admin/OznacitVyrizene';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Zprávy z webu | Administrace LINDA FASHION',
};

/**
 * Zprávy z kontaktního formuláře a přihlášky k newsletteru.
 *
 * Obojí se dřív nikam neukládalo – formuláře jen potvrdily přijetí. Teď zpráva
 * skončí tady, takže se neztratí ani bez zapojeného SMTP.
 */
function formatCas(datum: Date): string {
  return datum.toLocaleString('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function AdminZpravyPage() {
  const [zpravy, odberatele, pocetOdberatelu] = await Promise.all([
    db.contactMessage.findMany({
      orderBy: [{ vyrizeno: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    }),
    db.newsletterSubscriber.findMany({
      where: { odhlasenAt: null },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    db.newsletterSubscriber.count({ where: { odhlasenAt: null } }),
  ]);

  const nevyrizene = zpravy.filter((z) => !z.vyrizeno).length;

  return (
    <div className="max-w-4xl space-y-10 pb-12">
      <div className="border-b border-linda-sand pb-6">
        <h1 className="font-serif text-3xl text-linda-espresso sm:text-4xl">Zprávy z webu</h1>
        <p className="mt-1 text-xs text-linda-espresso/70">
          {nevyrizene > 0
            ? `${nevyrizene} nevyřízených zpráv · ${pocetOdberatelu} odběratelů newsletteru`
            : `Žádná nevyřízená zpráva · ${pocetOdberatelu} odběratelů newsletteru`}
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 font-serif text-2xl text-linda-espresso">
          <Inbox className="h-5 w-5 text-linda-cognac" aria-hidden="true" />
          Kontaktní formulář
        </h2>

        {zpravy.length === 0 ? (
          <div className="space-y-2 rounded-2xl bg-linda-cream p-10 text-center shadow-neu">
            <MailOpen className="mx-auto h-8 w-8 text-linda-cognac opacity-60" aria-hidden="true" />
            <p className="text-xs text-linda-espresso/75">Zatím vám nikdo nenapsal.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {zpravy.map((z) => (
              <li
                key={z.id}
                className={`space-y-2 rounded-2xl p-5 ${
                  z.vyrizeno
                    ? 'bg-linda-sandLight shadow-neuInsetSm'
                    : 'bg-linda-cream shadow-neu'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-linda-espresso">
                      {z.jmeno}
                      {z.predmet && (
                        <span className="font-normal text-linda-espresso/75"> · {z.predmet}</span>
                      )}
                    </p>
                    <a
                      href={`mailto:${z.email}`}
                      className="text-xs text-linda-cognac underline underline-offset-2"
                    >
                      {z.email}
                    </a>
                  </div>

                  <time
                    dateTime={z.createdAt.toISOString()}
                    className="shrink-0 text-[11px] text-linda-espresso/70"
                  >
                    {formatCas(z.createdAt)}
                  </time>
                </div>

                <p className="whitespace-pre-line text-xs leading-relaxed text-linda-espresso/85">
                  {z.zprava}
                </p>

                <OznacitVyrizene id={z.id} vyrizeno={z.vyrizeno} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 font-serif text-2xl text-linda-espresso">
          <Mail className="h-5 w-5 text-linda-cognac" aria-hidden="true" />
          Odběratelé newsletteru
        </h2>

        {odberatele.length === 0 ? (
          <div className="rounded-2xl bg-linda-cream p-10 text-center shadow-neu">
            <p className="text-xs text-linda-espresso/75">Zatím se nikdo nepřihlásil.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-linda-cream shadow-neu">
            <table className="w-full min-w-[420px] text-left text-xs">
              <thead>
                <tr className="border-b border-linda-sand/60 text-[11px] uppercase tracking-wider text-linda-espresso/70">
                  <th scope="col" className="p-4 font-semibold">E-mail</th>
                  <th scope="col" className="p-4 font-semibold">Odkud</th>
                  <th scope="col" className="p-4 font-semibold">Přihlášeno</th>
                </tr>
              </thead>
              <tbody>
                {odberatele.map((o) => (
                  <tr key={o.id} className="border-b border-linda-sand/30 last:border-0">
                    <td className="p-4 text-linda-espresso">{o.email}</td>
                    <td className="p-4 text-linda-espresso/70">{o.zdroj ?? '—'}</td>
                    <td className="p-4 text-linda-espresso/70">{formatCas(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="rounded-xl bg-linda-sandLight p-4 text-[11px] text-linda-espresso/75 shadow-neuInsetSm">
          Rozesílku zatím neumíme odeslat – čeká na SMTP přístupy. Seznam je proto
          evidencí zájmu, ne potvrzeným odběrem (double opt-in doplníme spolu s e-maily).
        </p>
      </section>
    </div>
  );
}
