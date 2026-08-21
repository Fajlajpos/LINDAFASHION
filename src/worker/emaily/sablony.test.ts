import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sestavitEmail } from './sablony';

/**
 * Šablony transakčních e-mailů.
 *
 * Testuje se to, co se v e-mailu nedá opravit po odeslání: že se do zprávy
 * dostane odkaz, že se cizí text neprojeví jako HTML a že neznámý typ
 * neskončí prázdnou zprávou.
 */
describe('sestavitEmail', () => {
  const puvodni = { ...process.env };

  beforeEach(() => {
    process.env.APP_URL = 'https://lindafashion.cz';
  });

  afterEach(() => {
    process.env = { ...puvodni };
  });

  it('neznámý typ nevrací prázdnou zprávu, ale null', () => {
    // Kdyby vracel prázdný řetězec, odešel by prázdný e-mail a nikdo by se
    // to nedozvěděl. `null` doručovací úloha pozná a jen ho zaloguje.
    expect(sestavitEmail('neexistujici-typ')).toBeNull();
  });

  it('do obnovy hesla vloží odkaz do HTML i do textové verze', () => {
    const odkaz = 'https://lindafashion.cz/obnova-hesla?token=abc123';
    const email = sestavitEmail('obnova-hesla', { odkaz, jmeno: 'Marie' });

    expect(email).not.toBeNull();
    expect(email!.html).toContain(odkaz);
    // Textová alternativa není kosmetika: bez ní zpráva stoupá ve skóre spamu.
    expect(email!.text).toContain(odkaz);
  });

  it('escapuje text od zákaznice, aby se neprojevil jako HTML', () => {
    const email = sestavitEmail('obnova-hesla', {
      odkaz: 'https://lindafashion.cz/obnova-hesla?token=x',
      jmeno: '<script>alert(1)</script>',
    });

    expect(email!.html).not.toContain('<script>');
    expect(email!.html).toContain('&lt;script&gt;');
  });

  it('potvrzení objednávky odkazuje přes veřejný token, ne přes číslo', () => {
    // Čísla objednávek jdou po sobě – odkaz s číslem by z e-mailu udělal
    // návod, jak procházet cizí objednávky.
    const email = sestavitEmail('potvrzeni-objednavky', {
      cisloObjednavky: '2026-00042',
      verejnyToken: 'tajny-token',
      celkovaCena: 2490,
    });

    expect(email!.html).toContain('/pokladna/potvrzeni?token=tajny-token');
    expect(email!.html).not.toContain('/pokladna/potvrzeni?cislo=');
  });

  it('změna stavu si upřesní předmět podle stavu objednávky', () => {
    const expedovana = sestavitEmail('zmena-stavu-objednavky', {
      cisloObjednavky: '2026-00042',
      stav: 'EXPEDOVANA',
      cisloZasilky: 'Z123',
    });

    expect(expedovana!.predmet).toContain('2026-00042');
    expect(expedovana!.html).toContain('Z123');
  });

  it('bez APP_URL použije lokální adresu místo prázdného odkazu', () => {
    delete process.env.APP_URL;

    const email = sestavitEmail('skladem-znovu', { slug: 'hedvabne-saty', nazev: 'Hedvábné šaty (M)' });

    expect(email!.html).toContain('http://localhost:3000/produkt/hedvabne-saty');
  });

  /**
   * Potvrzení objednávky není jen zdvořilost – § 1822 odst. 1 o. z. je to
   * potvrzení smlouvy **v textové podobě**. Odkaz na web ho nenahradí: web se
   * dá přepsat, e-mail v zákaznicině schránce ne. Poučení proto musí být
   * v těle zprávy, ne za odkazem.
   */
  describe('potvrzení objednávky nese poučení, ne jen odkaz', () => {
    const data = {
      cisloObjednavky: '2026-00042',
      verejnyToken: 'tok-abc-123',
      celkovaCena: 2990,
      verzePodminek: '2026-08-19',
      adresaProVraceni: 'Sklad, Dlouhá 1, Praha',
    };

    it('obsahuje celé poučení o odstoupení, i v textové verzi', () => {
      const email = sestavitEmail('potvrzeni-objednavky', data)!;

      for (const cast of [email.html, email.text]) {
        expect(cast).toContain('14 dnů');
        expect(cast).toMatch(/bez udání důvodu/);
        // Náklady na vrácení: neuvedení je posouvá na prodávajícího
        // (§ 1820 odst. 1 písm. i), takže věta nesmí vypadnout.
        expect(cast).toMatch(/náklady na vrácení zboží nesete vy/i);
      }
    });

    it('uvádí adresu pro vrácení, když je vyplněná', () => {
      const email = sestavitEmail('potvrzeni-objednavky', data)!;

      expect(email.html).toContain('Sklad, Dlouhá 1, Praha');
      expect(email.text).toContain('Sklad, Dlouhá 1, Praha');
    });

    it('bez adresy pro vrácení žádnou nevymyslí', () => {
      const email = sestavitEmail('potvrzeni-objednavky', {
        ...data,
        adresaProVraceni: undefined,
      })!;

      expect(email.text).toMatch(/adresu vám sdělíme/i);
    });

    it('odkazuje na tu verzi podmínek, se kterou zákaznice souhlasila', () => {
      // Bez `?verze=` by odkaz po první změně znění vedl na text, který
      // nikdy neviděla – a snímek `Order.verzePodminek` by ztratil smysl.
      const email = sestavitEmail('potvrzeni-objednavky', data)!;

      expect(email.html).toContain('verze=2026-08-19');
      expect(email.text).toContain('verze=2026-08-19');
    });

    it('nese odkaz na odstoupení s tokenem, takže funguje i bez přihlášení', () => {
      const email = sestavitEmail('potvrzeni-objednavky', data)!;

      expect(email.html).toContain('/odstoupeni?token=tok-abc-123');
      expect(email.text).toContain('/odstoupeni/formular');
    });
  });

  /**
   * Potvrzení odstoupení je jediný e-mail, jehož **obsah je zákonná
   * náležitost** (§ 1830a o. z.): musí nést datum a čas přijetí. Testuje se
   * proto věcně, ne jen „něco se vykreslilo".
   */
  describe('potvrzení odstoupení od smlouvy', () => {
    const prijato = '2026-06-30T22:30:00.000Z';

    it('uvádí datum a čas v české zóně, ne v UTC', () => {
      const email = sestavitEmail('odstoupeni-potvrzeni', {
        cisloObjednavky: '2026-00042',
        prijatoAt: prijato,
      });

      // 22:30 UTC je v Praze už 1. července 00:30 (letní čas). Kontejner běží
      // v UTC, takže bez `timeZone: 'Europe/Prague'` by potvrzení uvádělo
      // předchozí den – a u lhůty počítané na dny je to rozdíl, který
      // rozhoduje o tom, jestli bylo odstoupení včasné.
      expect(email!.html).toContain('1. 7. 2026');
      expect(email!.text).toContain('00:30');
    });

    it('nese číslo objednávky a poučení o čtrnáctidenní lhůtě na odeslání zboží', () => {
      const email = sestavitEmail('odstoupeni-potvrzeni', {
        cisloObjednavky: '2026-00042',
        prijatoAt: prijato,
        adresaProVraceni: 'Sklad, Dlouhá 1, Praha',
      });

      expect(email!.predmet).toContain('2026-00042');
      expect(email!.html).toContain('Sklad, Dlouhá 1, Praha');
      expect(email!.text).toContain('14 dnů');
    });

    it('bez adresy pro vrácení slíbí pokyny e-mailem, žádnou si nevymyslí', () => {
      const email = sestavitEmail('odstoupeni-potvrzeni', {
        cisloObjednavky: '2026-00042',
        prijatoAt: prijato,
      });

      expect(email!.html).toContain('pokyny');
      expect(email!.text).toContain('pokyny');
    });
  });

  it('každá šablona má neprázdnou textovou i HTML verzi', () => {
    const typy = [
      'obnova-hesla',
      'potvrzeni-objednavky',
      'zmena-stavu-objednavky',
      'platba-prijata',
      'opusteny-kosik',
      'dochazejici-sklad',
      'skladem-znovu',
      'newsletter-potvrzeni',
      'nova-zprava-z-formulare',
      'nova-reklamace',
      'odstoupeni-potvrzeni',
    ];

    for (const typ of typy) {
      const email = sestavitEmail(typ, { odkaz: 'https://lindafashion.cz/x', cisloObjednavky: '2026-00001' });

      expect(email, `chybí šablona pro ${typ}`).not.toBeNull();
      expect(email!.html.length, `prázdné HTML u ${typ}`).toBeGreaterThan(100);
      expect(email!.text.trim().length, `prázdný text u ${typ}`).toBeGreaterThan(10);
    }
  });
});
