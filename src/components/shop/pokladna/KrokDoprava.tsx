'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CreditCard, Loader2, MapPin, QrCode, Truck, Wallet } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { usePokladna, useStrazceKroku } from '@/lib/pokladna-kontext';
import { czkNaHalere, halereNaCzk, spocitatObjednavku } from '@/lib/penize';
import { nacistKody } from '@/lib/ulozene-kody';
import { vybratVydejniMisto } from '@/lib/packeta-widget';
import { Hlaska, KrokKarty, NavigaceKroku, Pole, TRIDY_HLAVNIHO_TLACITKA, Volba } from './prvky';
import { NacitaniKroku } from './NacitaniKroku';
import { PrubeznySouhrn } from './PrubeznySouhrn';

/** Krok 3 – způsob dopravy (s výdejním místem) a platby. */
export function KrokDoprava() {
  const router = useRouter();
  const pripraveno = useStrazceKroku(3);
  const { cart } = useCart();
  const { data, koncept, upravit, vybranaDoprava } = usePokladna();
  const { dopravy, packetaKlicWidgetu, platbaKartouDostupna } = data;

  /** Rozepsaný text pobočky – oddělený od potvrzené volby, ať jde psát plynule. */
  const [vydejniMistoText, setVydejniMistoText] = useState(koncept.vydejniMisto?.nazev ?? '');
  /** Běží stahování knihovny Zásilkovny? Mapa se otevře až po něm. */
  const [otviraMapu, setOtviraMapu] = useState(false);
  /**
   * Mapu se nepodařilo načíst (blokovaný skript, výpadek).
   *
   * Nespadne kvůli tomu celá pokladna: přepne se na ruční zápis pobočky,
   * tedy na stav, ve kterém e-shop fungoval, než widget existoval.
   */
  const [mapaSelhala, setMapaSelhala] = useState(false);
  const [chybaMista, setChybaMista] = useState<string | null>(null);

  /*
   * Mapu nabízíme jen u Zásilkovny, ne u každé dopravy s výdejním místem.
   * Widget zná výhradně pobočky Packety – otevřít ho nad Balíkovnou (až
   * přibude) by zákaznici nechalo vybrat místo, kam žádná zásilka nepřijde.
   */
  const mapaDostupna =
    Boolean(packetaKlicWidgetu) && vybranaDoprava?.id === 'zasilkovna' && !mapaSelhala;

  /** Doprava zdarma se posuzuje z ceny zboží po slevě – stejně jako na serveru. */
  const dopravaZdarma = (() => {
    if (data.prahDopravaZdarma === null) return false;
    const { sleva } = nacistKody();
    const rozpis = spocitatObjednavku({
      polozky: cart.map((p) => ({ cenaZaKus: czkNaHalere(p.cenaPoSleve ?? p.cena), mnozstvi: p.mnozstvi })),
      procentoSlevy: sleva?.procentoSlevy ?? 0,
    });
    return halereNaCzk(rozpis.mezisoucet - rozpis.sleva) >= data.prahDopravaZdarma;
  })();

  const nastavitMisto = (misto: { id: string; nazev: string } | null) =>
    upravit((k) => ({ ...k, vydejniMisto: misto }));

  async function otevritMapu() {
    if (!packetaKlicWidgetu) return;

    setOtviraMapu(true);
    try {
      /*
       * „Načítám" končí ve chvíli, kdy je mapa na obrazovce, ne až po výběru.
       * Jinak tlačítko hlásí „Otevírám mapu…" po celou dobu prohlížení poboček
       * a po zavření křížkem zůstane zablokované.
       */
      const misto = await vybratVydejniMisto(packetaKlicWidgetu, () => setOtviraMapu(false));
      // `null` = zavřela okno bez výběru. Dosavadní volbu jí nebereme.
      if (misto) {
        nastavitMisto(misto);
        setChybaMista(null);
      }
    } catch {
      // Detail chyby je z cizího skriptu; zákaznici pomůže jen náhradní cesta.
      setMapaSelhala(true);
    } finally {
      setOtviraMapu(false);
    }
  }

  const pokracovat = (e: React.FormEvent) => {
    e.preventDefault();

    if (vybranaDoprava?.vyzadujeVydejniMisto && !koncept.vydejniMisto) {
      setChybaMista('Vyberte prosím výdejní místo.');
      document.getElementById('vydejni-misto')?.focus();
      return;
    }

    upravit((k) => ({ ...k, potvrzeno: { ...k.potvrzeno, doprava: true } }));
    router.push('/pokladna/shrnuti');
  };

  if (!pripraveno) return <NacitaniKroku />;

  return (
    <form onSubmit={pokracovat} noValidate className="grid grid-cols-1 gap-10 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-7">
        {data.zpravaODovolene && <Hlaska>{data.zpravaODovolene}</Hlaska>}

        <KrokKarty nadpis="Doprava" ikona={<Truck className="h-5 w-5 text-linda-cognac" aria-hidden="true" />}>
          {dopravy.length === 0 ? (
            <p className="rounded-xl bg-linda-sandLight p-4 text-xs text-linda-espresso/85 shadow-neuInsetSm">
              Momentálně nemáme nastavený žádný způsob dopravy. Napište nám prosím a domluvíme se.
            </p>
          ) : (
            <fieldset className="space-y-3">
              <legend className="sr-only">Způsob dopravy</legend>
              {dopravy.map((d) => (
                <Volba
                  key={d.id}
                  name="doprava"
                  value={d.id}
                  checked={koncept.zpusobDopravy === d.id}
                  onSelect={() => {
                    if (d.id === koncept.zpusobDopravy) return;
                    /*
                     * Pobočka patří ke konkrétnímu dopravci, takže se při
                     * přepnutí zahodí vždycky – mezi dvěma dopravci s pobočkami
                     * by si jinak objednávka odnesla id z cizí sítě.
                     */
                    upravit((k) => ({ ...k, zpusobDopravy: d.id, vydejniMisto: null }));
                    setVydejniMistoText('');
                    setChybaMista(null);
                  }}
                  nadpis={d.nazev}
                  popis={d.popis}
                  cena={
                    dopravaZdarma ? (
                      <span className="text-linda-sage">Zdarma</span>
                    ) : (
                      `${d.cena.toLocaleString('cs-CZ')} Kč`
                    )
                  }
                />
              ))}
            </fieldset>
          )}

          {vybranaDoprava?.vyzadujeVydejniMisto && (
            <div className="space-y-2 rounded-xl bg-linda-sandLight p-4 shadow-neuInsetSm">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-linda-espresso">
                <MapPin className="h-3.5 w-3.5 text-linda-cognac" aria-hidden="true" />
                Výdejní místo
              </p>

              {koncept.vydejniMisto && mapaDostupna ? (
                <p className="flex items-center justify-between gap-2 text-xs text-linda-espresso/85">
                  {koncept.vydejniMisto.nazev}
                  <button
                    id="vydejni-misto"
                    type="button"
                    onClick={() => void otevritMapu()}
                    disabled={otviraMapu}
                    className="min-h-touch shrink-0 cursor-pointer text-[11px] font-semibold text-linda-cognac underline disabled:opacity-60"
                  >
                    Změnit
                  </button>
                </p>
              ) : mapaDostupna ? (
                <>
                  <button
                    id="vydejni-misto"
                    type="button"
                    onClick={() => void otevritMapu()}
                    disabled={otviraMapu}
                    aria-describedby={chybaMista ? 'vydejni-misto-chyba' : undefined}
                    className="flex min-h-touch w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-linda-cream px-4 text-xs font-semibold text-linda-cognac shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {otviraMapu ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        Otevírám mapu…
                      </>
                    ) : (
                      <>
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        Vybrat výdejní místo nebo Z-BOX
                      </>
                    )}
                  </button>
                  {chybaMista && (
                    <p id="vydejni-misto-chyba" role="alert" className="text-[11px] font-medium text-red-800">
                      {chybaMista}
                    </p>
                  )}
                </>
              ) : (
                /* Ruční zápis. Platí, dokud Zásilkovna nemá v `.env` klíč – a taky
                   když se mapu nepodaří načíst. Ani jedno nesmí zákaznici
                   zabránit objednávku dokončit. */
                <Pole
                  id="vydejni-misto"
                  label="Název pobočky nebo Z-BOXu"
                  required
                  placeholder="Např. Praha 1, Vodičkova 45"
                  value={vydejniMistoText}
                  onChange={(v) => {
                    setVydejniMistoText(v);
                    nastavitMisto(v.trim() ? { id: v.trim(), nazev: v.trim() } : null);
                    if (v.trim()) setChybaMista(null);
                  }}
                  chyba={chybaMista ?? undefined}
                  napoveda={
                    mapaSelhala
                      ? 'Mapu výdejních míst se teď nepodařilo načíst. Napište prosím pobočku ručně – objednávku to nezdrží.'
                      : 'Výběr z mapy doplníme, jakmile napojíme Zásilkovnu.'
                  }
                />
              )}
            </div>
          )}

          <p className="text-[11px] text-linda-espresso/70">{data.dodaciLhuta} Doručujeme v rámci České republiky.</p>
        </KrokKarty>

        <KrokKarty nadpis="Platba" ikona={<Wallet className="h-5 w-5 text-linda-cognac" aria-hidden="true" />}>
          <fieldset className="space-y-3">
            <legend className="sr-only">Způsob platby</legend>
            <Volba
              name="platba"
              value="bankovni_prevod"
              checked={koncept.zpusobPlatby === 'bankovni_prevod'}
              onSelect={() => upravit((k) => ({ ...k, zpusobPlatby: 'bankovni_prevod' }))}
              nadpis={
                <>
                  <QrCode className="h-3.5 w-3.5 text-linda-cognac" aria-hidden="true" />
                  Bankovní převod
                </>
              }
              popis="Údaje k platbě i QR kód dostanete hned po odeslání objednávky."
              cena={<span className="text-linda-sage">Zdarma</span>}
            />

            {/* Karta se nabídne, jen když jsou v .env klíče GoPay. */}
            <Volba
              name="platba"
              value="gopay"
              checked={platbaKartouDostupna && koncept.zpusobPlatby === 'gopay'}
              onSelect={() => platbaKartouDostupna && upravit((k) => ({ ...k, zpusobPlatby: 'gopay' }))}
              disabled={!platbaKartouDostupna}
              nadpis={
                <>
                  <CreditCard className="h-3.5 w-3.5 text-linda-cognac" aria-hidden="true" />
                  Platba kartou
                </>
              }
              popis={
                platbaKartouDostupna
                  ? 'Po odeslání objednávky vás přesměrujeme do zabezpečené brány GoPay.'
                  : 'Připravujeme – zatím prosím využijte bankovní převod.'
              }
              cena={platbaKartouDostupna ? <span className="text-linda-sage">Zdarma</span> : '—'}
            />
          </fieldset>
        </KrokKarty>

        <NavigaceKroku zpetHref="/pokladna" zpetText="Zpět na údaje">
          <button type="submit" disabled={dopravy.length === 0} className={TRIDY_HLAVNIHO_TLACITKA}>
            Pokračovat ke shrnutí
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </NavigaceKroku>
      </div>

      <PrubeznySouhrn />
    </form>
  );
}
