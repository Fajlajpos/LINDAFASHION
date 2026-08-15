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
    ];

    for (const typ of typy) {
      const email = sestavitEmail(typ, { odkaz: 'https://lindafashion.cz/x', cisloObjednavky: '2026-00001' });

      expect(email, `chybí šablona pro ${typ}`).not.toBeNull();
      expect(email!.html.length, `prázdné HTML u ${typ}`).toBeGreaterThan(100);
      expect(email!.text.trim().length, `prázdný text u ${typ}`).toBeGreaterThan(10);
    }
  });
});
