/**
 * Dárkové poukazy (sekce 6.11 zadání).
 *
 * Poukazy se prodávají jako běžný produkt s příznakem `jeDarkovyPoukaz`,
 * kde varianta nenese velikost oblečení, ale částku („1000 Kč“).
 *
 * Bez aliasů @/ – používá to i worker.
 */
import crypto from 'crypto';

/** Bez matoucích znaků – kód se opisuje z fyzické karty (0/O, 1/I). */
const ZNAKY = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function vygenerovatKodPoukazu(): string {
  const bajty = crypto.randomBytes(12);
  const kod = Array.from(bajty, (b) => ZNAKY[b % ZNAKY.length]).join('');

  // Skupiny po čtyřech se snáz přepisují z karty.
  return `${kod.slice(0, 4)}-${kod.slice(4, 8)}-${kod.slice(8, 12)}`;
}

/**
 * Z názvu varianty vytáhne částku poukazu.
 *
 * Admin ji zadává volným textem („1000 Kč“, „500 Kc“, „2 000 Kč“, „5000“).
 * Rozpoznání je schválně přísné – celý název musí být číslo, volitelně
 * s označením měny. Kdyby stačilo „první číslo v textu“, vznikl by
 * z oděvní velikosti „M (38)“ platný poukaz na 38 Kč, kdyby někdo omylem
 * zaškrtl u produktu příznak dárkového poukazu.
 *
 * Vrací `null`, když částku nelze bezpečně určit – poukaz se pak nevydá
 * a chyba se zaloguje, místo aby vznikla karta s nesmyslnou hodnotou.
 */
export function castkaZVarianty(velikost: string): number | null {
  // Mezery i nedělitelné mezery (z „2 000 Kč“) pryč.
  const bezMezer = velikost.replace(/[\s ]/g, '');
  const nalez = bezMezer.match(/^(\d+)(kč|kc|czk|,-)?$/i);

  if (!nalez) return null;

  const castka = Number(nalez[1]);
  return Number.isFinite(castka) && castka > 0 ? castka : null;
}
