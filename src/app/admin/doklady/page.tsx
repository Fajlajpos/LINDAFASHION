'use client';

import React, { useState } from 'react';
import { AlertCircle, FileSearch, Loader2, Search, Tag, UserCheck } from 'lucide-react';
import { nacist } from '@/lib/api-klient';
import { Hlaska } from '@/components/ui/PoleFormulare';
import { TiskoveTlacitko } from '@/components/ui/TiskoveTlacitko';

/**
 * Podklady pro kontrolu.
 *
 * Kontrola z ČOI ani z ÚOOÚ nechodí do databáze — pošle dopis s jednou
 * konkrétní otázkou a dá lhůtu. Odpovídá se **vytištěným výpisem k té jedné
 * věci**, ne přístupem k datům a rozhodně ne kopií databáze (ta by navíc
 * vydala osobní údaje všech ostatních zákaznic, tedy porušila minimalizaci).
 *
 * Data pro obě odpovědi v databázi byla vždycky. Číst se ale dala jen SQL
 * dotazem, což v praxi znamená „když je po ruce vývojář" — a lhůta od úřadu
 * běží i o dovolené. Tahle stránka je tedy hlavně **cesta k datům**, ne nová
 * evidence.
 *
 * Obojí je **jen ke čtení**. Evidence, ze které jde ubrat, nedokládá nic.
 */

interface Produkt {
  id: string;
  nazev: string;
  sku: string | null;
}

interface ZaznamCeny {
  id: string;
  cena: number;
  zakladniCena: number;
  jeSleva: boolean;
  platnaOd: string;
  zdroj: string;
}

interface DokladCeny {
  produkt: {
    nazev: string;
    sku: string | null;
    cena: number;
    cenaPoSleve: number | null;
    slevaOd: string | null;
    nejnizsiCena30Dni: number | null;
  };
  okno: { kDatu: string; zacatek: string; dnu: number; nejnizsiCena: number | null };
  zaznamy: ZaznamCeny[];
}

interface DokladSouhlasu {
  email: string;
  nalezeno: boolean;
  zaznamy: Array<{
    id: string;
    typ: string;
    udeleno: boolean;
    verze: string | null;
    ip: string | null;
    createdAt: string;
  }>;
  newsletter: {
    potvrzeno: boolean;
    createdAt: string;
    potvrzenoAt: string | null;
    odhlasenAt: string | null;
    ipPrihlaseni: string | null;
    ipPotvrzeni: string | null;
    zdroj: string | null;
  } | null;
  objednavky: Array<{
    cisloObjednavky: string;
    souhlasPodminkyAt: string | null;
    verzePodminek: string | null;
    ipObjednavky: string | null;
    createdAt: string;
  }>;
}

const POLE =
  'w-full bg-linda-sandLight shadow-neuInsetSm min-h-touch rounded-xl px-4 py-2.5 text-xs text-linda-espresso disabled:opacity-60';

const TLACITKO =
  'flex min-h-touch cursor-pointer items-center justify-center gap-2 rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm disabled:cursor-not-allowed disabled:opacity-60';

function cas(hodnota: string | null): string {
  if (!hodnota) return '—';
  return new Date(hodnota).toLocaleString('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function den(hodnota: string | null): string {
  if (!hodnota) return '—';
  return new Date(hodnota).toLocaleDateString('cs-CZ');
}

function koruny(castka: number | null): string {
  return castka === null ? '—' : `${castka.toLocaleString('cs-CZ')} Kč`;
}

const NAZVY_SOUHLASU: Record<string, string> = {
  COOKIES: 'Cookies',
  NEWSLETTER: 'Newsletter',
  OBCHODNI_PODMINKY: 'Obchodní podmínky',
};

export default function AdminDokladyPage() {
  return (
    <div className="max-w-4xl space-y-8">
      <div data-tisk="skryt" className="border-b border-linda-sand pb-6">
        <h1 className="flex items-center gap-2 font-serif text-3xl text-linda-espresso sm:text-4xl">
          <FileSearch className="h-7 w-7 text-linda-cognac" aria-hidden="true" />
          Podklady pro kontrolu
        </h1>
        <p className="mt-1 text-xs text-linda-espresso/70">
          Výpisy k jedné konkrétní otázce, připravené k vytištění
        </p>
      </div>

      <p
        data-tisk="skryt"
        className="flex items-start gap-2 rounded-xl bg-linda-sandLight p-4 text-xs leading-relaxed text-linda-espresso/85 shadow-neuInsetSm"
      >
        <AlertCircle className="mt-px h-4 w-4 shrink-0 text-linda-cognac" aria-hidden="true" />
        <span>
          Když přijde dotaz z ČOI nebo z ÚOOÚ, odpovídá se{' '}
          <strong className="font-semibold">písemně a s výpisem k té jedné věci</strong>, na kterou
          se ptají. Nikdy se neposílá databáze ani její záloha — obsahuje údaje všech ostatních
          zákaznic a jejím předáním by vznikl nový problém místo vyřešení starého. Výpis níž si
          vytiskněte a přiložte k odpovědi.
        </span>
      </p>

      <CenovaEvidence />
      <SouhlasyOsoby />
    </div>
  );
}

/* --- § 12a: za kolik se zboží nabízelo ------------------------------------ */

function CenovaEvidence() {
  const [dotaz, setDotaz] = useState('');
  const [nalezene, setNalezene] = useState<Produkt[]>([]);
  const [kDatu, setKDatu] = useState('');
  const [doklad, setDoklad] = useState<DokladCeny | null>(null);
  const [nacitam, setNacitam] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);

  const hledat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dotaz.trim() || nacitam) return;

    setNacitam(true);
    setChyba(null);
    setDoklad(null);

    const vysledek = await nacist<{ produkty: Produkt[] }>(
      `/api/admin/produkty?hledat=${encodeURIComponent(dotaz.trim())}`
    );

    if (vysledek.ok) setNalezene(vysledek.data.produkty);
    else setChyba(vysledek.chyba);

    setNacitam(false);
  };

  const nacistDoklad = async (productId: string) => {
    setNacitam(true);
    setChyba(null);

    const dotazUrl = kDatu
      ? `/api/admin/doklady/ceny?productId=${productId}&kDatu=${encodeURIComponent(kDatu)}`
      : `/api/admin/doklady/ceny?productId=${productId}`;

    const vysledek = await nacist<DokladCeny>(dotazUrl);

    if (vysledek.ok) setDoklad(vysledek.data);
    else setChyba(vysledek.chyba);

    setNacitam(false);
  };

  return (
    <section className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu">
      <div data-tisk="skryt">
        <h2 className="flex items-center gap-2 font-serif text-xl text-linda-espresso">
          <Tag className="h-5 w-5 text-linda-cognac" aria-hidden="true" />
          Cenová evidence produktu
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-linda-espresso/75">
          Odpověď na otázku „za kolik jste zboží nabízeli před slevou&ldquo; (§ 12a zák. č. 634/1992
          Sb.). Vyhledejte produkt a případně zadejte den, ke kterému se má okno 30 dnů spočítat —
          kontrola se ptá na minulost, ne na dnešek.
        </p>
      </div>

      <form onSubmit={(e) => void hledat(e)} className="flex flex-wrap gap-3" data-tisk="skryt">
        <input
          type="search"
          value={dotaz}
          onChange={(e) => setDotaz(e.target.value)}
          placeholder="Název produktu nebo SKU"
          aria-label="Vyhledat produkt"
          disabled={nacitam}
          className={`${POLE} flex-1`}
        />
        <div>
          <label htmlFor="kDatu" className="sr-only">
            Ke dni
          </label>
          <input
            id="kDatu"
            type="date"
            value={kDatu}
            onChange={(e) => setKDatu(e.target.value)}
            disabled={nacitam}
            title="Ke kterému dni se má okno 30 dnů spočítat"
            className={`${POLE} cursor-pointer`}
          />
        </div>
        <button type="submit" disabled={nacitam || !dotaz.trim()} className={TLACITKO}>
          {nacitam ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Search className="h-4 w-4" aria-hidden="true" />
          )}
          Hledat
        </button>
      </form>

      {chyba && <Hlaska druh="chyba">{chyba}</Hlaska>}

      {nalezene.length > 0 && !doklad && (
        <ul data-tisk="skryt" className="space-y-2">
          {nalezene.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => void nacistDoklad(p.id)}
                className="flex min-h-touch w-full cursor-pointer items-center justify-between gap-3 rounded-xl bg-linda-cream px-4 py-2.5 text-left text-xs text-linda-espresso shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
              >
                <span>{p.nazev}</span>
                {p.sku && <span className="shrink-0 text-linda-espresso/60">{p.sku}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {doklad && (
        <div className="tisk-list space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-serif text-lg text-linda-espresso">{doklad.produkt.nazev}</h3>
              {doklad.produkt.sku && (
                <p className="text-[11px] text-linda-espresso/70">SKU {doklad.produkt.sku}</p>
              )}
            </div>
            <div className="flex gap-2" data-tisk="skryt">
              <TiskoveTlacitko popis="Vytisknout výpis" />
              <button
                type="button"
                onClick={() => setDoklad(null)}
                className="flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cream px-5 text-xs font-semibold text-linda-espresso shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
              >
                Zpět na hledání
              </button>
            </div>
          </div>

          <dl className="space-y-1.5 rounded-xl bg-linda-sandLight p-4 text-xs shadow-neuInsetSm">
            <div className="flex justify-between gap-3">
              <dt className="text-linda-espresso/70">Okno {doklad.okno.dnu} dnů</dt>
              <dd className="font-semibold text-linda-espresso">
                {den(doklad.okno.zacatek)} – {den(doklad.okno.kDatu)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-linda-espresso/70">Nejnižší cena v tomto okně</dt>
              <dd className="font-semibold text-linda-espresso">
                {koruny(doklad.okno.nejnizsiCena)}
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-linda-sand/60 pt-1.5">
              <dt className="text-linda-espresso/70">
                Referenční cena uvedená na webu
                {/* Zmrazená hodnota z okamžiku vyhlášení slevy – právě tu vidí
                    zákaznice, takže právě ta se dokládá. */}
              </dt>
              <dd className="font-semibold text-linda-cognac">
                {koruny(doklad.produkt.nejnizsiCena30Dni)}
              </dd>
            </div>
            {doklad.produkt.slevaOd && (
              <div className="flex justify-between gap-3">
                <dt className="text-linda-espresso/70">Sleva běží od</dt>
                <dd className="font-semibold text-linda-espresso">{den(doklad.produkt.slevaOd)}</dd>
              </div>
            )}
          </dl>

          <div>
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-linda-espresso/70">
              Všechny změny ceny
            </h4>

            {doklad.zaznamy.length === 0 ? (
              <p className="rounded-xl bg-linda-sandLight p-4 text-xs text-linda-espresso/75 shadow-neuInsetSm">
                U tohoto produktu není zaznamenaná žádná změna ceny. To je normální u zboží
                založeného před zavedením evidence — první záznam vznikne při nejbližší změně ceny.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-linda-sand text-[10px] uppercase tracking-wider text-linda-espresso/60">
                      <th className="py-2 pr-3 font-semibold">Platná od</th>
                      <th className="py-2 pr-3 font-semibold">Prodejní cena</th>
                      <th className="py-2 pr-3 font-semibold">Základní cena</th>
                      <th className="py-2 pr-3 font-semibold">Sleva</th>
                      <th className="py-2 font-semibold">Zdroj</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doklad.zaznamy.map((z) => (
                      <tr key={z.id} className="border-b border-linda-sand/40">
                        <td className="py-2 pr-3 text-linda-espresso">{cas(z.platnaOd)}</td>
                        <td className="py-2 pr-3 font-semibold text-linda-espresso">
                          {koruny(z.cena)}
                        </td>
                        <td className="py-2 pr-3 text-linda-espresso/75">
                          {koruny(z.zakladniCena)}
                        </td>
                        <td className="py-2 pr-3 text-linda-espresso/75">
                          {z.jeSleva ? 'ano' : 'ne'}
                        </td>
                        <td className="py-2 text-linda-espresso/70">{z.zdroj}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-[10px] leading-relaxed text-linda-espresso/60">
            Výpis z cenové evidence vedené podle § 12a zák. č. 634/1992 Sb. Záznamy se pouze
            přidávají, nikdy nemění ani nemažou. Vytištěno {cas(new Date().toISOString())}.
          </p>
        </div>
      )}
    </section>
  );
}

/* --- Čl. 7 GDPR: doložení souhlasu --------------------------------------- */

function SouhlasyOsoby() {
  const [email, setEmail] = useState('');
  const [doklad, setDoklad] = useState<DokladSouhlasu | null>(null);
  const [nacitam, setNacitam] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);

  const hledat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || nacitam) return;

    setNacitam(true);
    setChyba(null);

    const vysledek = await nacist<DokladSouhlasu>(
      `/api/admin/doklady/souhlasy?email=${encodeURIComponent(email.trim())}`
    );

    if (vysledek.ok) setDoklad(vysledek.data);
    else setChyba(vysledek.chyba);

    setNacitam(false);
  };

  return (
    <section className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu">
      <div data-tisk="skryt">
        <h2 className="flex items-center gap-2 font-serif text-xl text-linda-espresso">
          <UserCheck className="h-5 w-5 text-linda-cognac" aria-hidden="true" />
          Souhlasy jedné osoby
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-linda-espresso/75">
          Odpověď na otázku „doložte souhlas paní X&ldquo; (čl. 7 odst. 1 GDPR). Ukazuje udělení
          i odvolání, u newsletteru oba kroky dvojího potvrzení včetně IP adres.
        </p>
      </div>

      <form onSubmit={(e) => void hledat(e)} className="flex flex-wrap gap-3" data-tisk="skryt">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="zakaznice@example.com"
          aria-label="E-mail zákaznice"
          disabled={nacitam}
          className={`${POLE} flex-1`}
        />
        <button type="submit" disabled={nacitam || !email.trim()} className={TLACITKO}>
          {nacitam ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Search className="h-4 w-4" aria-hidden="true" />
          )}
          Vyhledat
        </button>
      </form>

      {chyba && <Hlaska druh="chyba">{chyba}</Hlaska>}

      {doklad && (
        <div className="tisk-list space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3 className="font-serif text-lg text-linda-espresso">{doklad.email}</h3>
            <div data-tisk="skryt">
              <TiskoveTlacitko popis="Vytisknout výpis" />
            </div>
          </div>

          {!doklad.nalezeno ? (
            /* Prázdný výsledek je platná odpověď úřadu, ne chyba hledání. */
            <p className="rounded-xl bg-linda-sandLight p-4 text-xs text-linda-espresso/85 shadow-neuInsetSm">
              K této adrese nevedeme žádný záznam o souhlasu, žádný odběr novinek ani objednávku.
            </p>
          ) : (
            <>
              {doklad.newsletter && (
                <div>
                  <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-linda-espresso/70">
                    Odběr novinek (dvojí potvrzení)
                  </h4>
                  <dl className="space-y-1.5 rounded-xl bg-linda-sandLight p-4 text-xs shadow-neuInsetSm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-linda-espresso/70">Přihlášení</dt>
                      <dd className="font-semibold text-linda-espresso">
                        {cas(doklad.newsletter.createdAt)}
                        {doklad.newsletter.ipPrihlaseni && ` · IP ${doklad.newsletter.ipPrihlaseni}`}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-linda-espresso/70">Potvrzení z e-mailu</dt>
                      <dd className="font-semibold text-linda-espresso">
                        {doklad.newsletter.potvrzenoAt
                          ? `${cas(doklad.newsletter.potvrzenoAt)}${doklad.newsletter.ipPotvrzeni ? ` · IP ${doklad.newsletter.ipPotvrzeni}` : ''}`
                          : 'nepotvrzeno'}
                      </dd>
                    </div>
                    {doklad.newsletter.odhlasenAt && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-linda-espresso/70">Odhlášení</dt>
                        <dd className="font-semibold text-linda-espresso">
                          {cas(doklad.newsletter.odhlasenAt)}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {doklad.zaznamy.length > 0 && (
                <div>
                  <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-linda-espresso/70">
                    Záznamy o souhlasu
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-linda-sand text-[10px] uppercase tracking-wider text-linda-espresso/60">
                          <th className="py-2 pr-3 font-semibold">Kdy</th>
                          <th className="py-2 pr-3 font-semibold">Čeho se týká</th>
                          <th className="py-2 pr-3 font-semibold">Stav</th>
                          <th className="py-2 pr-3 font-semibold">Verze</th>
                          <th className="py-2 font-semibold">IP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {doklad.zaznamy.map((z) => (
                          <tr key={z.id} className="border-b border-linda-sand/40">
                            <td className="py-2 pr-3 text-linda-espresso">{cas(z.createdAt)}</td>
                            <td className="py-2 pr-3 text-linda-espresso/85">
                              {NAZVY_SOUHLASU[z.typ] ?? z.typ}
                            </td>
                            {/* Význam nese text, ne barva – výpis se tiskne černobíle. */}
                            <td className="py-2 pr-3 font-semibold text-linda-espresso">
                              {z.udeleno ? 'udělen' : 'odvolán'}
                            </td>
                            <td className="py-2 pr-3 text-linda-espresso/75">{z.verze ?? '—'}</td>
                            <td className="py-2 text-linda-espresso/70">{z.ip ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {doklad.objednavky.length > 0 && (
                <div>
                  <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-linda-espresso/70">
                    Souhlas s obchodními podmínkami u objednávek
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-linda-sand text-[10px] uppercase tracking-wider text-linda-espresso/60">
                          <th className="py-2 pr-3 font-semibold">Objednávka</th>
                          <th className="py-2 pr-3 font-semibold">Souhlas udělen</th>
                          <th className="py-2 pr-3 font-semibold">Verze podmínek</th>
                          <th className="py-2 font-semibold">IP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {doklad.objednavky.map((o) => (
                          <tr key={o.cisloObjednavky} className="border-b border-linda-sand/40">
                            <td className="py-2 pr-3 font-semibold text-linda-espresso">
                              {o.cisloObjednavky}
                            </td>
                            <td className="py-2 pr-3 text-linda-espresso/85">
                              {cas(o.souhlasPodminkyAt)}
                            </td>
                            <td className="py-2 pr-3 text-linda-espresso/85">
                              {o.verzePodminek ?? '—'}
                            </td>
                            <td className="py-2 text-linda-espresso/70">
                              {o.ipObjednavky ?? '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-[10px] leading-relaxed text-linda-espresso/60">
                    Znění podmínek pro každou verzi otevřete odkazem
                    <code className="mx-1">/obchodni-podminky?verze=…</code>
                    a přiložte k odpovědi. Prázdná IP znamená, že už ji smazala retenční úloha po
                    12 měsících — samotný souhlas i jeho čas zůstávají.
                  </p>
                </div>
              )}
            </>
          )}

          <p className="text-[10px] leading-relaxed text-linda-espresso/60">
            Výpis pořízen {cas(new Date().toISOString())}. Souhlasy s cookies se vedou pod náhodným
            identifikátorem prohlížeče, ne pod e-mailem, a proto v tomto výpisu nejsou — to
            propojení by samo bylo sledováním, které má souhlas teprve povolit.
          </p>
        </div>
      )}
    </section>
  );
}
