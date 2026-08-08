import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { klientskaIp, vynulovatLimit, zkontrolovatLimit } from './rate-limit';

const HODINA = 60 * 60 * 1000;
const MINUTA = 60 * 1000;

describe('zkontrolovatLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-08T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('pustí první pokusy a další zastaví', () => {
    const klic = `test-zaklad-${Math.random()}`;

    expect(zkontrolovatLimit(klic, 3, MINUTA).povoleno).toBe(true);
    expect(zkontrolovatLimit(klic, 3, MINUTA).povoleno).toBe(true);
    expect(zkontrolovatLimit(klic, 3, MINUTA).povoleno).toBe(true);

    const ctvrty = zkontrolovatLimit(klic, 3, MINUTA);
    expect(ctvrty.povoleno).toBe(false);
    expect(ctvrty.zkusitZaSekund).toBeGreaterThan(0);
  });

  it('po uplynutí okna zase pouští', () => {
    const klic = `test-okno-${Math.random()}`;

    zkontrolovatLimit(klic, 1, MINUTA);
    expect(zkontrolovatLimit(klic, 1, MINUTA).povoleno).toBe(false);

    vi.advanceTimersByTime(MINUTA + 1000);
    expect(zkontrolovatLimit(klic, 1, MINUTA).povoleno).toBe(true);
  });

  /*
   * Regrese: úklid mapy mazal všechno starší deseti minut bez ohledu na délku
   * okna. Hodinový limit (newsletter, kontaktní formulář) se tím fakticky
   * smrskl na deset minut – stačilo počkat a pět pokusů se obnovilo.
   */
  it('hodinové okno přežije úklid po deseti minutách', () => {
    const klic = `test-hodina-${Math.random()}`;

    for (let i = 0; i < 5; i++) {
      expect(zkontrolovatLimit(klic, 5, HODINA).povoleno).toBe(true);
    }
    expect(zkontrolovatLimit(klic, 5, HODINA).povoleno).toBe(false);

    // Úklid se spouští při volání, takže mezitím posuneme čas a zavoláme znovu.
    vi.advanceTimersByTime(11 * MINUTA);
    expect(zkontrolovatLimit(klic, 5, HODINA).povoleno).toBe(false);

    vi.advanceTimersByTime(20 * MINUTA);
    expect(zkontrolovatLimit(klic, 5, HODINA).povoleno).toBe(false);

    // Až po celé hodině od prvního pokusu.
    vi.advanceTimersByTime(30 * MINUTA);
    expect(zkontrolovatLimit(klic, 5, HODINA).povoleno).toBe(true);
  });

  it('vynulovatLimit uvolní klíč hned', () => {
    const klic = `test-nuluj-${Math.random()}`;

    zkontrolovatLimit(klic, 1, MINUTA);
    expect(zkontrolovatLimit(klic, 1, MINUTA).povoleno).toBe(false);

    vynulovatLimit(klic);
    expect(zkontrolovatLimit(klic, 1, MINUTA).povoleno).toBe(true);
  });

  it('různé klíče se navzájem neomezují', () => {
    const a = `test-a-${Math.random()}`;
    const b = `test-b-${Math.random()}`;

    zkontrolovatLimit(a, 1, MINUTA);
    expect(zkontrolovatLimit(a, 1, MINUTA).povoleno).toBe(false);
    expect(zkontrolovatLimit(b, 1, MINUTA).povoleno).toBe(true);
  });
});

describe('klientskaIp', () => {
  const dotaz = (hlavicky: Record<string, string>) =>
    new Request('http://localhost/api/test', { headers: hlavicky });

  it('bere první adresu z X-Forwarded-For', () => {
    expect(klientskaIp(dotaz({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe('203.0.113.7');
  });

  it('spadne na X-Real-IP, když X-Forwarded-For chybí', () => {
    expect(klientskaIp(dotaz({ 'x-real-ip': '203.0.113.9' }))).toBe('203.0.113.9');
  });

  it('bez hlaviček vrátí zástupnou hodnotu, ne prázdný řetězec', () => {
    // Prázdný klíč by sloučil všechny volající do jednoho okna omylem;
    // tady je to vědomé a pojmenované.
    expect(klientskaIp(dotaz({}))).toBe('neznama');
  });
});
