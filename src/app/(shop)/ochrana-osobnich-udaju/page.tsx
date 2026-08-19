import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, ShieldCheck } from 'lucide-react';
import { nacistNastaveni } from '@/lib/nastaveni';
import { RETENCE } from '@/lib/retence';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Ochrana osobních údajů | LINDA FASHION',
  description:
    'Jaké osobní údaje zpracováváme, z jakého právního titulu, jak dlouho je uchováváme, komu je předáváme a jaká máte práva podle GDPR.',
  alternates: { canonical: '/ochrana-osobnich-udaju' },
};

/**
 * Zásady zpracování osobních údajů.
 *
 * Původní verze měla tři odstavce: správce, účel a věta o právech. Čl. 13
 * GDPR ale vyjmenovává, co všechno musí být uvedeno **v okamžiku získání
 * údajů**, a chybějící položka není formalita – je to porušení informační
 * povinnosti. Doplněno je: právní tituly u každého účelu, doby uchování,
 * příjemci a zpracovatelé, předávání mimo EU, všechna práva subjektu údajů
 * včetně přenositelnosti a námitky, právo odvolat souhlas a stížnost u ÚOOÚ.
 *
 * ## Dvě věci, které tu nesmí zdomácnět
 *
 * 1. **Údaje správce se čtou z `Settings`, ne z kódu.** Dřív tu byly natvrdo
 *    („LINDA FASHION s.r.o., Pařížská 12") a byly vymyšlené. Zásady, které
 *    uvádějí nesprávného správce, jsou horší než žádné: zákaznice se podle
 *    nich obrátí jinam, než měla, a lhůta na vyřízení žádosti běží dál.
 * 2. **Doby uchování se berou z `RETENCE`.** Text a úloha, která doopravdy
 *    maže, tak nemůžou tvrdit každý něco jiného. Jakmile se lhůta v kódu
 *    změní, změní se i tady – opačně to nefunguje a nemá se to zkoušet.
 */

/** Měsíce vypadají v textu líp než „365 dnů", ale počítají se ze dnů v kódu. */
function mesice(dnu: number): string {
  const m = Math.round(dnu / 30.4);
  if (m === 1) return '1 měsíc';
  if (m < 5) return `${m} měsíce`;
  return `${m} měsíců`;
}

function Sekce({
  cislo,
  nadpis,
  children,
}: {
  cislo: number;
  nadpis: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-2xl bg-linda-cream p-6 shadow-neu">
      <h2 className="font-serif text-lg text-linda-cognac">
        {cislo}. {nadpis}
      </h2>
      <div className="space-y-3 text-xs leading-relaxed text-linda-espresso/85">{children}</div>
    </section>
  );
}

/** Tabulka účel → titul → doba. Na mobilu se přeleje do karet. */
function Ucel({
  ucel,
  udaje,
  titul,
  doba,
}: {
  ucel: string;
  udaje: string;
  titul: string;
  doba: string;
}) {
  return (
    <div className="space-y-1 rounded-xl bg-linda-sandLight p-4 shadow-neuInsetSm">
      <p className="text-xs font-semibold text-linda-espresso">{ucel}</p>
      <dl className="space-y-0.5 text-[11px] text-linda-espresso/80">
        <div className="flex gap-2">
          <dt className="w-24 shrink-0 text-linda-espresso/60">Údaje</dt>
          <dd>{udaje}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-24 shrink-0 text-linda-espresso/60">Právní titul</dt>
          <dd>{titul}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-24 shrink-0 text-linda-espresso/60">Doba</dt>
          <dd>{doba}</dd>
        </div>
      </dl>
    </div>
  );
}

export default async function GDPRPage() {
  const nastaveni = await nacistNastaveni();

  /* Pro žádosti subjektu údajů má e-shop zvláštní adresu; když není vyplněná,
     platí obecný kontakt. Nevymýšlí se – bez obojího se ukáže odkaz na
     kontaktní formulář, který funguje vždy. */
  const kontaktProPrava = nastaveni.emailProGdpr ?? nastaveni.emailFirmy;

  const spravce = [
    nastaveni.nazevFirmy,
    nastaveni.adresaFirmy,
    nastaveni.icoFirmy ? `IČO: ${nastaveni.icoFirmy}` : null,
    nastaveni.dicFirmy ? `DIČ: ${nastaveni.dicFirmy}` : null,
    nastaveni.zapisVRejstriku,
  ].filter((r): r is string => Boolean(r && r.trim()));

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <header className="space-y-3 border-b border-linda-sand pb-8">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-linda-cognac">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          GDPR
        </p>
        <h1 className="font-serif text-4xl text-linda-espresso">Ochrana osobních údajů</h1>
        <p className="max-w-2xl text-xs leading-relaxed text-linda-espresso/75">
          Informace o zpracování osobních údajů podle čl. 13 a 14 nařízení (EU) 2016/679 (GDPR).
          Najdete tu, co o vás vedeme, proč to smíme, jak dlouho si to necháváme a co s tím můžete
          udělat.
        </p>
      </header>

      <div className="space-y-4">
        <Sekce cislo={1} nadpis="Kdo je správce">
          {spravce.length > 0 ? (
            <address className="whitespace-pre-line rounded-xl bg-linda-sandLight p-4 not-italic shadow-neuInsetSm">
              {spravce.join('\n')}
            </address>
          ) : (
            <p>Identifikační údaje správce najdete na stránce Kontakt.</p>
          )}

          <p>
            Správce nejmenoval pověřence pro ochranu osobních údajů – nejde o orgán veřejné moci
            ani o rozsáhlé či systematické monitorování, takže povinnost podle čl. 37 GDPR
            nevzniká.
          </p>

          {kontaktProPrava ? (
            <p className="flex flex-wrap items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 shrink-0 text-linda-cognac" aria-hidden="true" />
              Žádosti k osobním údajům posílejte na{' '}
              <a
                href={`mailto:${kontaktProPrava}`}
                className="font-semibold text-linda-cognac underline underline-offset-2"
              >
                {kontaktProPrava}
              </a>
              .
            </p>
          ) : (
            <p>
              Žádosti k osobním údajům nám pošlete přes{' '}
              <Link
                href="/kontakt"
                className="font-semibold text-linda-cognac underline underline-offset-2"
              >
                kontaktní formulář
              </Link>
              .
            </p>
          )}
        </Sekce>

        <Sekce cislo={2} nadpis="Co zpracováváme, proč a jak dlouho">
          <p>
            Ke každému účelu patří vlastní právní titul a vlastní doba uchování. Nezpracováváme
            žádné zvláštní kategorie údajů (čl. 9) a nepoužíváme automatizované rozhodování ani
            profilování s právními účinky (čl. 22).
          </p>

          <div className="space-y-3">
            <Ucel
              ucel="Vyřízení objednávky a doručení zboží"
              udaje="jméno, dodací a fakturační adresa, e-mail, telefon, obsah objednávky"
              titul="plnění smlouvy – čl. 6 odst. 1 písm. b)"
              doba="po dobu trvání smlouvy a záruční doby"
            />
            <Ucel
              ucel="Účetní a daňové doklady"
              udaje="fakturační údaje, částky, datum, sazba DPH"
              titul="plnění právní povinnosti – čl. 6 odst. 1 písm. c) (zákon o účetnictví, zákon o DPH)"
              doba="10 let od konce zdaňovacího období, ve kterém se plnění uskutečnilo"
            />
            <Ucel
              ucel="Doklad o uzavření smlouvy na dálku (IP adresa objednávky)"
              udaje="IP adresa, ze které objednávka přišla, čas a verze obchodních podmínek"
              titul="oprávněný zájem – čl. 6 odst. 1 písm. f): doložit, kdy a s čím jste souhlasila"
              doba={`${mesice(RETENCE.ipObjednavkyDnu)} – pak se IP z objednávky maže, doklad zůstává`}
            />
            <Ucel
              ucel="Zákaznický účet"
              udaje="e-mail, jméno, telefon, uložené adresy, oblíbené kousky, obsah košíku"
              titul="plnění smlouvy – čl. 6 odst. 1 písm. b)"
              doba={`po dobu existence účtu; nepoužitý košík se maže po ${mesice(RETENCE.kosikDnu)}`}
            />
            <Ucel
              ucel="Reklamace, vrácení a odstoupení od smlouvy"
              udaje="e-mail, popis závady, průběh vyřízení"
              titul="plnění právní povinnosti – čl. 6 odst. 1 písm. c)"
              doba="4 roky od vyřízení (promlčecí lhůta u sporů z reklamace)"
            />
            <Ucel
              ucel="Zasílání novinek (newsletter)"
              udaje="e-mail, datum a IP přihlášení i potvrzení"
              titul="souhlas – čl. 6 odst. 1 písm. a); potvrzujete ho klikem v e-mailu"
              doba={`do odvolání souhlasu; doklad o odhlášení uchováváme ${mesice(RETENCE.odhlasenyNewsletterDnu)}, nepotvrzenou přihlášku mažeme po ${mesice(RETENCE.nepotvrzenyNewsletterDnu)}`}
            />
            <Ucel
              ucel="Dotazy z kontaktního formuláře"
              udaje="jméno, e-mail, text zprávy"
              titul="oprávněný zájem – čl. 6 odst. 1 písm. f): odpovědět vám"
              doba={mesice(RETENCE.zpravyDnu)}
            />
            <Ucel
              ucel="Hlídání dostupnosti velikosti"
              udaje="e-mail, hlídaná varianta"
              titul="souhlas – čl. 6 odst. 1 písm. a)"
              doba={`${mesice(RETENCE.hlidaniVyrizenoDnu)} po odeslání upozornění, nejdéle ${mesice(RETENCE.hlidaniNevyrizenoDnu)}`}
            />
            <Ucel
              ucel="Cookies a měření návštěvnosti"
              udaje="identifikátor souhlasu, údaje z analytických a marketingových nástrojů"
              titul="souhlas – čl. 6 odst. 1 písm. a); nezbytné cookies běží z oprávněného zájmu"
              doba={`záznam o souhlasu ${mesice(RETENCE.souhlasCookiesDnu)}`}
            />
          </div>
        </Sekce>

        <Sekce cislo={3} nadpis="Komu údaje předáváme">
          <p>
            Údaje nepředáváme nikomu, kdo je k vyřízení vašeho nákupu nepotřebuje, a neprodáváme
            je. Příjemci jsou:
          </p>

          <ul className="ml-4 list-disc space-y-1.5">
            <li>
              <strong>Dopravci</strong> – jméno, adresa, telefon a e-mail v rozsahu potřebném
              k doručení zásilky. Dopravce je samostatný správce.
            </li>
            <li>
              <strong>Poskytovatel platební brány</strong> – při platbě kartou. Číslo karty se
              k nám vůbec nedostane, zpracovává ho přímo brána.
            </li>
            <li>
              <strong>Poskytovatel serveru a e-mailové služby</strong> – jako zpracovatelé podle
              čl. 28 GDPR, na základě smlouvy o zpracování osobních údajů.
            </li>
            <li>
              <strong>Analytické a marketingové nástroje</strong> – jen pokud k tomu dáte souhlas
              v{' '}
              <Link
                href="/cookies"
                className="font-semibold text-linda-cognac underline underline-offset-2"
              >
                nastavení cookies
              </Link>
              . Bez souhlasu se nespustí.
            </li>
            <li>
              <strong>Účetní a daňoví poradci, případně orgány veřejné moci</strong> – v rozsahu,
              který ukládá zákon.
            </li>
          </ul>

          <p>
            Údaje zpracováváme v Evropské unii. Pokud by některý nástroj přenášel data do třetí
            země, děje se tak na základě standardních smluvních doložek podle čl. 46 GDPR, nebo
            rozhodnutí o odpovídající ochraně.
          </p>
        </Sekce>

        <Sekce cislo={4} nadpis="Jaká máte práva">
          <p>
            Vůči nám jako správci můžete kdykoliv uplatnit tato práva. Vyřídíme je bez zbytečného
            odkladu, nejpozději do jednoho měsíce od doručení žádosti (čl. 12 odst. 3).
          </p>

          <ul className="ml-4 list-disc space-y-1.5">
            <li>
              <strong>Přístup k údajům</strong> (čl. 15) – dozvědět se, co o vás vedeme, a dostat
              kopii. Přihlášená zákaznice si ji stáhne rovnou v{' '}
              <Link
                href="/muj-ucet"
                className="font-semibold text-linda-cognac underline underline-offset-2"
              >
                mém účtu
              </Link>
              .
            </li>
            <li>
              <strong>Oprava</strong> (čl. 16) – nechat opravit nepřesný nebo doplnit neúplný údaj.
            </li>
            <li>
              <strong>Výmaz</strong> (čl. 17) – nechat údaje smazat, pokud pominul důvod, proč je
              vedeme. Účetní doklady smazat nemůžeme, ty drží zákon; účet ale anonymizujeme.
            </li>
            <li>
              <strong>Omezení zpracování</strong> (čl. 18) – nechat zpracování pozastavit,
              například po dobu, kdy prověřujeme přesnost údaje.
            </li>
            <li>
              <strong>Přenositelnost</strong> (čl. 20) – dostat údaje ve strojově čitelném formátu
              a předat je jinému správci. Export ve formátu JSON najdete v mém účtu.
            </li>
            <li>
              <strong>Námitka</strong> (čl. 21) – vznést námitku proti zpracování z oprávněného
              zájmu. Proti přímému marketingu můžete namítat vždy a bez odůvodnění.
            </li>
            <li>
              <strong>Odvolání souhlasu</strong> (čl. 7 odst. 3) – kdykoliv, stejně snadno, jako
              jste ho udělila. Odvolání nemá vliv na zákonnost zpracování před ním. Odběr novinek
              odhlásíte odkazem v každém e-mailu.
            </li>
            <li>
              <strong>Nebýt předmětem automatizovaného rozhodování</strong> (čl. 22) – žádné
              takové rozhodování neprovádíme.
            </li>
          </ul>
        </Sekce>

        <Sekce cislo={5} nadpis="Je poskytnutí údajů povinné?">
          <p>
            Údaje potřebné k vyřízení objednávky (jméno, adresa, kontakt) jsou požadavkem
            <strong> smluvním</strong>: bez nich vám nemůžeme zboží poslat ani vystavit doklad.
            Fakturační údaje navíc požaduje <strong>zákon</strong>. Ostatní údaje – newsletter,
            hlídání dostupnosti, analytické cookies – jsou <strong>dobrovolné</strong> a jejich
            neposkytnutí nemá na nákup žádný vliv.
          </p>
        </Sekce>

        <Sekce cislo={6} nadpis="Stížnost u dozorového úřadu">
          <p>
            Pokud si myslíte, že s vašimi údaji nezacházíme správně, ozvěte se prosím nejdřív nám –
            většina věcí se vyřeší jedním e-mailem. Máte ale právo podat stížnost přímo u
            dozorového úřadu (čl. 77 GDPR):
          </p>
          <address className="rounded-xl bg-linda-sandLight p-4 not-italic shadow-neuInsetSm">
            Úřad pro ochranu osobních údajů
            <br />
            Pplk. Sochora 27, 170 00 Praha 7
            <br />
            <a
              href="https://www.uoou.cz"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-linda-cognac underline underline-offset-2"
            >
              www.uoou.cz
            </a>
          </address>
        </Sekce>
      </div>
    </div>
  );
}
