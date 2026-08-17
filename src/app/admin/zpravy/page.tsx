import React from 'react';
import { Clock, Inbox, Mail, MailCheck, MailOpen } from 'lucide-react';
import { db } from '@/lib/db';
import { OznacitVyrizene } from '@/components/admin/OznacitVyrizene';
import { Strankovani, cisloStranky } from '@/components/ui/Strankovani';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Zprávy z webu | Administrace LINDA FASHION',
};

/**
 * Zprávy z kontaktního formuláře a přihlášky k newsletteru.
 *
 * Obojí se dřív nikam neukládalo – formuláře jen potvrdily přijetí. Teď zpráva
 * skončí tady, takže se neztratí ani bez zapojeného SMTP.
 *
 * Oba seznamy jsou stránkované vlastním parametrem (`zprava`, `odberatel`),
 * aby procházení jednoho nezahodilo pozici v druhém.
 */
const ZPRAV_NA_STRANKU = 25;
const ODBERATELU_NA_STRANKU = 50;

interface Props {
  searchParams: { zprava?: string; odberatel?: string };
}

/** „1 potvrzený odběratel“, ne „1 potvrzených odběratelů“. */
function potvrzeniOdberatele(pocet: number): string {
  if (pocet === 0) return 'Žádný potvrzený odběratel newsletteru';
  if (pocet === 1) return '1 potvrzený odběratel newsletteru';
  if (pocet < 5) return `${pocet} potvrzení odběratelé newsletteru`;

  return `${pocet} potvrzených odběratelů newsletteru`;
}

function formatCas(datum: Date): string {
  return datum.toLocaleString('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function AdminZpravyPage({ searchParams }: Props) {
  const strankaZprav = cisloStranky(searchParams.zprava);
  const strankaOdberatelu = cisloStranky(searchParams.odberatel);

  const [zpravy, pocetZprav, nevyrizene, odberatele, pocetOdberatelu, pocetPotvrzenych] =
    await Promise.all([
      db.contactMessage.findMany({
        orderBy: [{ vyrizeno: 'asc' }, { createdAt: 'desc' }],
        skip: (strankaZprav - 1) * ZPRAV_NA_STRANKU,
        take: ZPRAV_NA_STRANKU,
      }),
      db.contactMessage.count(),
      db.contactMessage.count({ where: { vyrizeno: false } }),
      db.newsletterSubscriber.findMany({
        where: { odhlasenAt: null },
        orderBy: { createdAt: 'desc' },
        skip: (strankaOdberatelu - 1) * ODBERATELU_NA_STRANKU,
        take: ODBERATELU_NA_STRANKU,
      }),
      db.newsletterSubscriber.count({ where: { odhlasenAt: null } }),
      // Rozesílat se smí jen na potvrzené adresy – to číslo je ta podstatná velikost seznamu.
      db.newsletterSubscriber.count({ where: { odhlasenAt: null, potvrzeno: true } }),
    ]);

  const stranekZprav = Math.ceil(pocetZprav / ZPRAV_NA_STRANKU);
  const stranekOdberatelu = Math.ceil(pocetOdberatelu / ODBERATELU_NA_STRANKU);

  /* Odkazy si nesou i pozici v druhém seznamu – jinak by přechod na druhou
     stránku zpráv poslal odběratele zpátky na první. */
  const odkaz = (klic: 'zprava' | 'odberatel') => (cislo: number) => {
    const parametry = new URLSearchParams();
    const zprava = klic === 'zprava' ? cislo : strankaZprav;
    const odberatel = klic === 'odberatel' ? cislo : strankaOdberatelu;

    if (zprava > 1) parametry.set('zprava', String(zprava));
    if (odberatel > 1) parametry.set('odberatel', String(odberatel));

    const dotaz = parametry.toString();
    return `/admin/zpravy${dotaz ? `?${dotaz}` : ''}#${klic === 'zprava' ? 'zpravy' : 'odberatele'}`;
  };

  return (
    <div className="max-w-4xl space-y-10 pb-12">
      <div className="border-b border-linda-sand pb-6">
        <h1 className="font-serif text-3xl text-linda-espresso sm:text-4xl">Zprávy z webu</h1>
        <p className="mt-1 text-xs text-linda-espresso/70">
          {nevyrizene > 0
            ? `${nevyrizene} ${nevyrizene === 1 ? 'nevyřízená zpráva' : nevyrizene < 5 ? 'nevyřízené zprávy' : 'nevyřízených zpráv'} z ${pocetZprav}`
            : 'Žádná nevyřízená zpráva'}
          {' · '}
          {potvrzeniOdberatele(pocetPotvrzenych)}
        </p>
      </div>

      <section id="zpravy" className="space-y-4 scroll-mt-6">
        <h2 className="flex items-center gap-2 font-serif text-2xl text-linda-espresso">
          <Inbox className="h-5 w-5 text-linda-cognac" aria-hidden="true" />
          Kontaktní formulář
        </h2>

        {pocetZprav === 0 ? (
          <div className="space-y-2 rounded-2xl bg-linda-cream p-10 text-center shadow-neu">
            <MailOpen className="mx-auto h-8 w-8 text-linda-cognac opacity-60" aria-hidden="true" />
            <p className="text-xs text-linda-espresso/75">Zatím vám nikdo nenapsal.</p>
          </div>
        ) : zpravy.length === 0 ? (
          /* Stránka za koncem seznamu – typicky po vyřízení poslední zprávy. */
          <div className="rounded-2xl bg-linda-cream p-10 text-center shadow-neu">
            <p className="text-xs text-linda-espresso/75">
              Na této stránce už nic není. Vraťte se prosím na{' '}
              <a href="/admin/zpravy#zpravy" className="font-semibold text-linda-cognac underline">
                první stránku
              </a>
              .
            </p>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {zpravy.map((z) => (
                <li
                  key={z.id}
                  className={`space-y-2 rounded-2xl p-5 ${
                    z.vyrizeno ? 'bg-linda-sandLight shadow-neuInsetSm' : 'bg-linda-cream shadow-neu'
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

            <Strankovani
              stranka={strankaZprav}
              stranek={stranekZprav}
              odkaz={odkaz('zprava')}
              popisek="Stránkování zpráv"
            />
          </>
        )}
      </section>

      <section id="odberatele" className="space-y-4 scroll-mt-6">
        <h2 className="flex items-center gap-2 font-serif text-2xl text-linda-espresso">
          <Mail className="h-5 w-5 text-linda-cognac" aria-hidden="true" />
          Odběratelé newsletteru
        </h2>

        {pocetOdberatelu === 0 ? (
          <div className="rounded-2xl bg-linda-cream p-10 text-center shadow-neu">
            <p className="text-xs text-linda-espresso/75">Zatím se nikdo nepřihlásil.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl bg-linda-cream shadow-neu">
              <table className="w-full min-w-[520px] text-left text-xs">
                <caption className="sr-only">
                  Seznam odběratelů newsletteru, stránka {strankaOdberatelu} z {stranekOdberatelu}
                </caption>
                <thead>
                  <tr className="border-b border-linda-sand/60 text-[11px] uppercase tracking-wider text-linda-espresso/70">
                    <th scope="col" className="p-4 font-semibold">E-mail</th>
                    <th scope="col" className="p-4 font-semibold">Souhlas</th>
                    <th scope="col" className="p-4 font-semibold">Odkud</th>
                    <th scope="col" className="p-4 font-semibold">Přihlášeno</th>
                  </tr>
                </thead>
                <tbody>
                  {odberatele.map((o) => (
                    <tr key={o.id} className="border-b border-linda-sand/30 last:border-0">
                      <td className="p-4 text-linda-espresso">{o.email}</td>
                      <td className="p-4">
                        {/* Stav nese ikona i slovo, ne jen barva. Bez tohohle
                            sloupce nebylo z administrace poznat, komu se smí
                            napsat a kdo jen odeslal formulář. */}
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            o.potvrzeno
                              ? 'bg-linda-sageLight text-linda-sage'
                              : 'bg-linda-sandLight text-linda-espresso/75 shadow-neuInsetSm'
                          }`}
                        >
                          {o.potvrzeno ? (
                            <MailCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          )}
                          {o.potvrzeno ? 'Potvrzeno' : 'Čeká na potvrzení'}
                        </span>
                      </td>
                      <td className="p-4 text-linda-espresso/70">{o.zdroj ?? '—'}</td>
                      <td className="p-4 text-linda-espresso/70">{formatCas(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Strankovani
              stranka={strankaOdberatelu}
              stranek={stranekOdberatelu}
              odkaz={odkaz('odberatel')}
              popisek="Stránkování odběratelů"
            />
          </>
        )}

        {/* Text tady dřív tvrdil, že double opt-in chybí a seznam je jen
            evidence zájmu. Potvrzování mezitím funguje, takže to bylo tvrzení
            o vlastním souhlasu, které neplatilo – a přesně na tom stojí,
            komu se smí napsat. */}
        <p className="rounded-xl bg-linda-sandLight p-4 text-xs leading-relaxed text-linda-espresso/80 shadow-neuInsetSm">
          Přihlášení se dokončuje kliknutím na odkaz v potvrzovacím e-mailu. Rozesílat
          novinky můžete jen na adresy se stavem <strong className="font-semibold">Potvrzeno</strong>{' '}
          – u ostatních jde zatím o vyplněný formulář, ne o souhlas.
          {pocetOdberatelu > pocetPotvrzenych && (
            <>
              {' '}
              Nepotvrzených čeká {pocetOdberatelu - pocetPotvrzenych}; dokud nejsou vyplněné
              přístupy k odesílání e-mailů, potvrzovací zpráva se nikam neodešle.
            </>
          )}
        </p>
      </section>
    </div>
  );
}
