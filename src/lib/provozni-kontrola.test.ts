import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { NastaveniWebu } from './nastaveni';
import { jeEmailNastaveny, provozniVarovani } from './provozni-kontrola';

/**
 * Kontrola hlídá věci, jejichž selhání není vidět: e-mail, který se neodešle,
 * vypadá stejně jako e-mail, který dorazil. Testy proto ověřují hlavně to, že
 * varování **zmizí až tehdy**, když je věc opravdu nastavená.
 */

/*
 * Fixture se píše celý, místo rozpuštění `VYCHOZI_NASTAVENI` – ten modul táhne
 * `cache()` z Reactu, který v `npm test` (běží bez databáze i bez serverového
 * buildu Nextu) neexistuje. Typ se importuje jen jako typ, ten se při překladu
 * zahodí. Stejná hranice runtimů jako u `session.ts` vs `auth.ts`.
 */
const VYPLNENO: NastaveniWebu = {
  rezimDovolene: false,
  datumNavratu: null,
  zpravaProZakazniky: null,
  zablokovatObjednavky: false,

  nazevFirmy: 'Martina Ludvíková',
  icoFirmy: '02688468',
  dicFirmy: null,
  adresaFirmy: 'Jednoty 1441, 356 01 Sokolov',
  telefonFirmy: '+420 607 030 764',
  emailFirmy: 'obchod@example.cz',
  jePlatceDph: false,

  socialInstagram: null,
  socialFacebook: null,

  cenaDopravyZasilkovna: 79,
  cenaDopravyPPL: 109,
  cenaDopravyCeskaPosta: 99,
  prahDopravaZdarma: 2500,

  zapisVRejstriku: 'Zapsána v živnostenském rejstříku',
  sazbaDph: 21,
  adresaProVraceni: 'Rokycanova 1929, 356 01 Sokolov',
  adresaProvozovny: 'Rokycanova 1929, 356 01 Sokolov',
  dodaciLhutaDnu: 3,
  emailProGdpr: 'gdpr@example.cz',
  verzePodminek: '1',
};

const puvodni = { host: process.env.SMTP_HOST, from: process.env.EMAIL_FROM };

beforeEach(() => {
  process.env.SMTP_HOST = 'smtp.example.cz';
  process.env.EMAIL_FROM = 'obchod@example.cz';
});

afterEach(() => {
  /* Proměnné se vracejí, ne mažou – jiný test na ně může spoléhat. */
  process.env.SMTP_HOST = puvodni.host;
  process.env.EMAIL_FROM = puvodni.from;
});

describe('jeEmailNastaveny', () => {
  it('vyžaduje obě proměnné, ne jen jednu', () => {
    expect(jeEmailNastaveny()).toBe(true);

    delete process.env.SMTP_HOST;
    expect(jeEmailNastaveny()).toBe(false);

    process.env.SMTP_HOST = 'smtp.example.cz';
    process.env.EMAIL_FROM = '';
    expect(jeEmailNastaveny()).toBe(false);
  });

  it('samá mezera se nepočítá jako vyplněná hodnota', () => {
    process.env.SMTP_HOST = '   ';
    expect(jeEmailNastaveny()).toBe(false);
  });
});

describe('provozniVarovani', () => {
  it('u vyplněného obchodu s SMTP nehlásí nic', () => {
    expect(provozniVarovani(VYPLNENO)).toEqual([]);
  });

  it('bez SMTP hlásí, že se neodesílají e-maily', () => {
    delete process.env.SMTP_HOST;

    const klice = provozniVarovani(VYPLNENO).map((v) => v.klic);
    expect(klice).toContain('smtp');
  });

  it('chybějící e-mail obchodu i SMTP jsou kritické a jdou první', () => {
    delete process.env.SMTP_HOST;

    const varovani = provozniVarovani({ ...VYPLNENO, emailFirmy: null, adresaProVraceni: null });

    // Doporučené se nesmí vklínit mezi kritická – jinak se to podstatné ztratí.
    const prvniDoporucene = varovani.findIndex((v) => v.zavaznost === 'doporucene');
    const posledniKriticke = varovani.map((v) => v.zavaznost).lastIndexOf('kriticke');
    expect(posledniKriticke).toBeLessThan(prvniDoporucene);
  });

  it('neúplnou identifikaci hlásí, i když chybí jen jedno pole', () => {
    for (const dira of ['nazevFirmy', 'icoFirmy', 'adresaFirmy'] as const) {
      const klice = provozniVarovani({ ...VYPLNENO, [dira]: null }).map((v) => v.klic);
      expect(klice, `chybí ${dira}`).toContain('identifikace');
    }
  });

  it('kontakt pro GDPR nechybí, když je aspoň obecný e-mail', () => {
    // Zásady zpracování na `emailFirmy` spadnou zpět, takže díra to není.
    const klice = provozniVarovani({ ...VYPLNENO, emailProGdpr: null }).map((v) => v.klic);
    expect(klice).not.toContain('email-gdpr');
  });

  it('bez obou e-mailů hlásí i chybějící kontakt pro GDPR', () => {
    const klice = provozniVarovani({
      ...VYPLNENO,
      emailProGdpr: null,
      emailFirmy: null,
    }).map((v) => v.klic);

    expect(klice).toContain('email-gdpr');
  });

  it('odkaz na opravu chybí jen u věcí, které se řeší v .env', () => {
    delete process.env.SMTP_HOST;

    for (const v of provozniVarovani(VYPLNENO)) {
      expect(v.odkaz === null, v.klic).toBe(v.klic === 'smtp');
    }
  });
});
