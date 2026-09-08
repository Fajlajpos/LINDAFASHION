/**
 * Provozní kontrola e-shopu.
 *
 * Existuje kvůli jedné vlastnosti odesílání e-mailů: bez `SMTP_HOST` a
 * `EMAIL_FROM` se zpráva jen zapíše do logu workeru a fronta ohlásí úspěch
 * (viz `odeslat-email.ts`). To je záměr – chybějící konfigurace nesmí nutit
 * pg-boss opakovat něco, co projít nemůže – ale navenek to vypadá úplně
 * stejně jako fungující obchod. Nikde není chyba, nikde varování a majitelka
 * do logu workeru nekouká.
 *
 * Cena toho ticha je vysoká: potvrzení objednávky je podle § 1822 odst. 1
 * o. z. povinné a musí přijít na trvalém nosiči. Když neodejde, obchod tu
 * povinnost neplní a nikdo se to nedozví.
 *
 * Kontrola je proto **čtecí a zobrazovací**, nic neblokuje. Objednávat se dá
 * dál; jen je na přehledu vidět, co zrovna nefunguje.
 */
import type { NastaveniWebu } from './nastaveni';
import { ZASTARALA_PO_HODINACH, stariHodin, type StavZaloh } from './zalohy';

export type ZavaznostVarovani = 'kriticke' | 'doporucene';

export interface ProvozniVarovani {
  klic: string;
  nadpis: string;
  /** Co se konkrétně neděje – ne „chybí nastavení", ale co to stojí. */
  dopad: string;
  zavaznost: ZavaznostVarovani;
  /** Kam se to jde spravit. `null` u věcí, které se řeší v `.env`. */
  odkaz: string | null;
}

/** Odesílání je zapnuté, jen když jsou obě proměnné – stejně jako v workeru. */
export function jeEmailNastaveny(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim() && process.env.EMAIL_FROM?.trim());
}

/**
 * Seznam toho, co v provozu nefunguje. Prázdné pole = vše v pořádku.
 *
 * Pořadí je podle závažnosti, ne podle toho, jak se to sem psalo – kritické
 * věci musí být první i kdyby jich přibylo víc.
 */
export function provozniVarovani(
  nastaveni: NastaveniWebu,
  /**
   * Stav noční zálohy z `nacistStavZaloh()`. Je to jediný vstup, který se čte
   * z disku, takže se sem předává hotový — funkce zůstává čistá a synchronní
   * a testy si stav podstrčí bez sahání na souborový systém.
   *
   * `undefined` (parametr se nepředal) se schválně liší od `null` (předal se,
   * ale soubor neexistuje): volající, který zálohy neřeší, o nich nesmí dostat
   * varování.
   */
  zalohy?: StavZaloh | null
): ProvozniVarovani[] {
  const varovani: ProvozniVarovani[] = [];

  if (!jeEmailNastaveny()) {
    varovani.push({
      klic: 'smtp',
      nadpis: 'Neodesílají se žádné e-maily',
      dopad:
        'Zákaznice nedostane potvrzení objednávky ani potvrzení odstoupení od smlouvy. ' +
        'Zprávy se jen zapisují do logu. Potvrzení objednávky je přitom povinné ' +
        '(§ 1822 odst. 1 občanského zákoníku). Doplňte SMTP_HOST a EMAIL_FROM v .env.',
      zavaznost: 'kriticke',
      odkaz: null,
    });
  }

  /*
   * Bez adresy obchodu se notifikace o reklamaci a odstoupení nikam neodešlou.
   * Žádost se uloží a čeká v administraci, takže se nic neztratí – ale
   * třicetidenní lhůta na vyřízení reklamace (§ 19 odst. 3 zák. o ochraně
   * spotřebitele) běží bez ohledu na to, jestli se o ní ví.
   */
  if (!nastaveni.emailFirmy) {
    varovani.push({
      klic: 'email-firmy',
      nadpis: 'Chybí e-mail obchodu',
      dopad:
        'Nechodí upozornění na nové reklamace, odstoupení od smlouvy ani zprávy ' +
        'z kontaktního formuláře – všechno čeká jen v administraci. ' +
        'E-mail zároveň chybí v obchodních podmínkách a na faktuře.',
      zavaznost: 'kriticke',
      odkaz: '/admin/nastaveni',
    });
  }

  if (!nastaveni.nazevFirmy || !nastaveni.icoFirmy || !nastaveni.adresaFirmy) {
    varovani.push({
      klic: 'identifikace',
      nadpis: 'Neúplná identifikace prodávajícího',
      dopad:
        'Jméno, IČO a sídlo musí být na faktuře, v patičce webu i v obchodních ' +
        'podmínkách (§ 435 občanského zákoníku). Co není vyplněné, se nikde nezobrazí.',
      zavaznost: 'kriticke',
      odkaz: '/admin/nastaveni',
    });
  }

  if (!nastaveni.adresaProVraceni) {
    varovani.push({
      klic: 'adresa-vraceni',
      nadpis: 'Chybí adresa pro vrácené zboží',
      dopad:
        'Poučení o odstoupení od smlouvy místo adresy slibuje, že ji pošlete e-mailem. ' +
        'Zákaznice tak neví, kam zboží poslat.',
      zavaznost: 'doporucene',
      odkaz: '/admin/nastaveni',
    });
  }

  if (!nastaveni.emailProGdpr && !nastaveni.emailFirmy) {
    varovani.push({
      klic: 'email-gdpr',
      nadpis: 'Chybí kontakt pro žádosti podle GDPR',
      dopad:
        'Zásady zpracování odkazují jen na kontaktní formulář. Čl. 13 GDPR chce ' +
        'kontaktní údaje správce, kam se dá obrátit se žádostí o výmaz nebo o kopii údajů.',
      zavaznost: 'doporucene',
      odkaz: '/admin/nastaveni',
    });
  }

  if (!nastaveni.zapisVRejstriku) {
    varovani.push({
      klic: 'zapis-rejstrik',
      nadpis: 'Chybí údaj o zápisu v rejstříku',
      dopad:
        '§ 435 občanského zákoníku ho vyžaduje na obchodních listinách i na webu. ' +
        'Dnes není ani na faktuře, ani v patičce.',
      zavaznost: 'doporucene',
      odkaz: '/admin/nastaveni',
    });
  }

  /*
   * Zálohy. Řeší se odděleně od nastavení, protože to není nevyplněné políčko,
   * ale běžící (nebo neběžící) služba.
   *
   * Záloha, která tiše přestane běžet, vypadá zvenčí úplně stejně jako záloha,
   * která běží. Přijde se na to až ve chvíli, kdy je potřeba obnovit – tedy
   * v tu nejhorší možnou chvíli. Proto je selhání i zastarání kritické.
   *
   * Odkaz je `null` u všech tří: zálohy se nespravují v administraci, ale na
   * serveru (`docker compose logs zalohy`). Ukázat sem odkaz do nastavení by
   * poslal majitelku někam, kde s tím nic nesvede.
   */
  if (zalohy !== undefined) {
    if (zalohy === null) {
      varovani.push({
        klic: 'zalohy-chybi',
        nadpis: 'Neběží zálohování',
        dopad:
          'Nenašel se žádný záznam o proběhlé záloze. Při ztrátě databáze by nebylo z čeho ' +
          'obnovit objednávky, faktury ani fotky produktů – originály fotek se po zpracování ' +
          'mažou, takže je nejde vyrobit znovu. Zkontrolujte službu `zalohy` ' +
          '(`docker compose logs zalohy`). Ve vývoji je tahle hláška v pořádku.',
        zavaznost: 'doporucene',
        odkaz: null,
      });
    } else if (!zalohy.uspech) {
      varovani.push({
        klic: 'zalohy-selhaly',
        nadpis: 'Poslední záloha selhala',
        dopad:
          `Zálohování skončilo chybou: ${zalohy.chyba ?? 'důvod není zaznamenaný'}. ` +
          'Starší zálohy zůstávají na místě, ale nových nepřibývá. ' +
          'Podrobnosti jsou v `docker compose logs zalohy`.',
        zavaznost: 'kriticke',
        odkaz: null,
      });
    } else if (stariHodin(zalohy) > ZASTARALA_PO_HODINACH) {
      const dnu = Math.floor(stariHodin(zalohy) / 24);
      varovani.push({
        klic: 'zalohy-zastaraly',
        nadpis: 'Zálohy přestaly přibývat',
        dopad:
          `Poslední záloha proběhla před ${dnu === 0 ? 'více než dnem' : `${dnu} dny`}, ` +
          'ačkoliv má běžet každou noc. Zálohovací služba nejspíš neběží – ' +
          'zkontrolujte `docker compose ps zalohy`.',
        zavaznost: 'kriticke',
        odkaz: null,
      });
    }
  }

  const poradi: Record<ZavaznostVarovani, number> = { kriticke: 0, doporucene: 1 };
  return varovani.sort((a, b) => poradi[a.zavaznost] - poradi[b.zavaznost]);
}
