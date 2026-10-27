/**
 * Obsah transakčních e-mailů.
 *
 * Schválně oddělené od doručování (`jobs/odeslat-email.ts`): šablona je čistá
 * funkce `data → { predmet?, html, text }`, takže se dá číst i testovat bez
 * SMTP. Doručovací úloha zůstane jen doručovací.
 *
 * Bez aliasů `@/` a bez `next/*` – tenhle soubor se kompiluje do buildu workeru.
 *
 * ## Proč jsou tu barvy natvrdo
 *
 * Projektové pravidlo „nikdy syrový hex v komponentách" platí pro React nad
 * Tailwindem. E-mail je jiné médium: Gmail, Outlook ani Seznam nenačtou
 * stylopis, `<style>` v hlavičce se v části klientů zahazuje a třídy nemají
 * kam se navázat. Barvy proto musí být inline a doslovné. Drží se hodnot
 * z `tailwind.config.ts`, aby zpráva vypadala jako web – když se paleta
 * změní, je potřeba je přepsat i tady.
 */

// Relativně, ne přes `@/` – soubor se kompiluje do buildu workeru.
import { NAZEV_ZPUSOBU_VYRIZENI, type ZpusobVyrizeni } from '../../lib/objednavka-popisky';
import { popisSplatnosti } from '../../lib/lhuty';
import { adresaWebu } from '../../lib/adresa-webu';

const BARVY = {
  paper: '#F6F3EC',
  cream: '#FAF8F4',
  sandLight: '#F3EFE9',
  sand: '#E4D9C8',
  espresso: '#2B2019',
  cognac: '#7A4B32',
  chocolate: '#3E2E25',
} as const;

export interface VyslednyEmail {
  /** Šablona může předmět upřesnit; když ne, použije se ten z úlohy. */
  predmet?: string;
  html: string;
  /** Textová alternativa. Bez ní část klientů zprávu hodnotí jako spam. */
  text: string;
}

/** Escapování do HTML – do šablon jdou jména a texty od zákaznic. */
function e(hodnota: unknown): string {
  return String(hodnota ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


/**
 * Odkaz na detail objednávky.
 *
 * Parametr se jmenuje `t`, ne `token` – tak ho čte
 * [potvrzovací stránka](src/app/(shop)/pokladna/potvrzeni/page.tsx) i zbytek
 * aplikace. Rozejít se s ní znamená, že tlačítko v e-mailu skončí na 404,
 * a zrovna tenhle e-mail je pro objednávku bez registrace jediná cesta
 * k platebním údajům i k odstoupení od smlouvy.
 *
 * Bez tokenu zbývá `/muj-ucet`, což má smysl jen pro registrovanou zákaznici –
 * host se tam nedostane. Proto token předávají **všechny** úlohy, které se
 * týkají konkrétní objednávky, ne jen potvrzení nákupu.
 */
function odkazNaObjednavku(token: string | null): string {
  const web = adresaWebu();
  return token ? `${web}/pokladna/potvrzeni?t=${encodeURIComponent(token)}` : `${web}/muj-ucet`;
}

/** `verejnyToken` z dat úlohy, nebo `null`, když ho volající neposlal. */
function tokenZDat(data: Record<string, unknown>): string | null {
  return data.verejnyToken ? String(data.verejnyToken) : null;
}

/**
 * Obálka zprávy: hlavička se značkou, tělo a patička.
 *
 * Tabulkový layout není nedbalost – Outlook (Word render engine) neumí
 * `flex` ani `grid` a `max-width` na `<div>` ignoruje. Tabulka o jedné
 * buňce je jediná konstrukce, která drží šířku všude.
 */
function obalka(nadpis: string, telo: string): string {
  const web = adresaWebu();

  return `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(nadpis)}</title>
</head>
<body style="margin:0;padding:0;background-color:${BARVY.paper};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BARVY.paper};padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:${BARVY.cream};border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:32px 32px 8px 32px;text-align:center;">
            <a href="${web}" style="text-decoration:none;color:${BARVY.espresso};font-family:Georgia,'Times New Roman',serif;font-size:24px;letter-spacing:4px;">LINDA FASHION</a>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 32px 32px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:${BARVY.espresso};">
            <h1 style="margin:0 0 20px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:400;line-height:1.3;color:${BARVY.espresso};">${e(nadpis)}</h1>
            ${telo}
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px;background-color:${BARVY.chocolate};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#D9D0C7;text-align:center;">
            <a href="${web}" style="color:${BARVY.cream};text-decoration:none;">${e(web.replace(/^https?:\/\//, ''))}</a><br>
            Tento e-mail vám přišel, protože jste u nás nakoupili nebo si vyžádali zprávu.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Zvýrazněné tlačítko. `<a>` s paddingem klikne všude, `<button>` v e-mailu ne. */
function tlacitko(text: string, odkaz: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr><td style="background-color:${BARVY.cognac};border-radius:999px;">
    <a href="${e(odkaz)}" style="display:inline-block;padding:14px 28px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;">${e(text)}</a>
  </td></tr>
</table>`;
}

/** Zapuštěný panel s údaji – obdoba `sandLight` prohlubně na webu. */
function panel(radky: Array<[string, string]>): string {
  const obsah = radky
    .map(
      ([popisek, hodnota]) =>
        `<tr>
          <td style="padding:4px 0;font-size:14px;color:#6B5B4F;">${e(popisek)}</td>
          <td style="padding:4px 0;font-size:14px;font-weight:600;text-align:right;color:${BARVY.espresso};">${e(hodnota)}</td>
        </tr>`
    )
    .join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BARVY.sandLight};border-radius:12px;padding:16px 20px;margin:20px 0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  ${obsah}
</table>`;
}

function odstavec(text: string): string {
  return `<p style="margin:0 0 14px 0;">${text}</p>`;
}

/* --- Obsah smlouvy pro potvrzení objednávky ------------------------------
 *
 * § 1822 o. z. (čl. 8 odst. 7 směrnice 2011/83/EU) chce potvrzení **uzavřené
 * smlouvy** na trvalém nosiči, s údaji podle § 1820: co se kupuje, za kolik
 * včetně dopravy, kdo prodává, jak a kdy se dodává a platí. Dřív tu bylo jen
 * „Celkem: 1 999 Kč" – zákaznice z e-mailu nepoznala, co si koupila, od koho,
 * ani kam má poslat peníze.
 *
 * Všechno je volitelné a čte se obranně: data přicházejí z fronty jako
 * `unknown` a úlohy založené před touhle změnou nová pole nemají. Co chybí, se
 * nevypíše – vymyslet si to by bylo horší.
 */

function kc(castka: number): string {
  return `${castka.toLocaleString('cs-CZ')} Kč`;
}

function cisloZ(hodnota: unknown): number | null {
  return typeof hodnota === 'number' && Number.isFinite(hodnota) ? hodnota : null;
}

function textNeboNull(hodnota: unknown): string | null {
  return typeof hodnota === 'string' && hodnota.trim() !== '' ? hodnota : null;
}

function objekt(hodnota: unknown): Record<string, unknown> | null {
  return hodnota !== null && typeof hodnota === 'object' && !Array.isArray(hodnota)
    ? (hodnota as Record<string, unknown>)
    : null;
}

interface PolozkaEmailu {
  nazev: string;
  velikost: string | null;
  mnozstvi: number;
  celkemKc: number;
}

function polozkyZDat(data: Data): PolozkaEmailu[] {
  if (!Array.isArray(data.polozky)) return [];
  return data.polozky.flatMap((p) => {
    const o = objekt(p);
    const nazev = o && textNeboNull(o.nazev);
    const mnozstvi = o && cisloZ(o.mnozstvi);
    const celkemKc = o && cisloZ(o.celkemKc);
    if (!o || !nazev || mnozstvi === null || celkemKc === null) return [];
    return [{ nazev, velikost: textNeboNull(o.velikost), mnozstvi, celkemKc }];
  });
}

/** Řádky rozpisu ceny: mezisoučet, sleva, doprava, poukaz. Bez součtu. */
function rozpisZDat(data: Data): Array<[string, string]> {
  const radky: Array<[string, string]> = [];
  const mezisoucet = cisloZ(data.mezisoucetKc);
  const sleva = cisloZ(data.slevaKc);
  const doprava = cisloZ(data.dopravaKc);
  const zPoukazu = cisloZ(data.zPoukazuKc);
  const nazevDopravy = textNeboNull(data.zpusobDopravy);

  if (mezisoucet !== null) radky.push(['Zboží celkem', kc(mezisoucet)]);
  if (sleva) radky.push(['Sleva', `−${kc(sleva)}`]);
  if (doprava !== null) {
    radky.push([nazevDopravy ? `Doprava (${nazevDopravy})` : 'Doprava', doprava === 0 ? 'zdarma' : kc(doprava)]);
  }
  if (zPoukazu) radky.push(['Uhrazeno dárkovým poukazem', `−${kc(zPoukazu)}`]);
  return radky;
}

/**
 * Věta o DPH ze **snímku objednávky**, ne z dnešního nastavení – stejné
 * pravidlo jako u faktury. Bez snímku se nevypíše nic.
 */
function vetaDph(data: Data): string | null {
  const dph = objekt(data.dph);
  if (!dph || typeof dph.jePlatce !== 'boolean') return null;
  if (!dph.jePlatce) return 'Nejsme plátci DPH.';
  const sazba = cisloZ(dph.sazba);
  const castka = cisloZ(dph.dphKc);
  return sazba !== null && castka !== null
    ? `Cena obsahuje DPH ${sazba} % ve výši ${kc(castka)}.`
    : 'Ceny jsou včetně DPH.';
}

function radkyDoruceni(data: Data): Array<[string, string]> {
  const d = objekt(data.dodani);
  const radky: Array<[string, string]> = [];
  if (d) {
    const jmeno = textNeboNull(d.jmeno);
    const misto = textNeboNull(d.vydejniMisto);
    const adresa = textNeboNull(d.adresa);
    if (jmeno) radky.push(['Příjemce', jmeno]);
    if (misto) radky.push(['Výdejní místo', misto]);
    else if (adresa) radky.push(['Adresa', adresa]);
  }
  const lhuta = textNeboNull(data.dodaciLhuta);
  if (lhuta) radky.push(['Dodací lhůta', lhuta]);
  return radky;
}

/**
 * Platební údaje k převodu. Jen když je volající pošle – tedy u převodu,
 * kde ještě něco zbývá zaplatit. Dřív e-mail odkazoval „na stránku
 * objednávky": web není trvalý nosič, a kdo zavřel záložku, neměl podle čeho
 * zaplatit.
 */
function radkyPlatby(data: Data): Array<[string, string]> {
  const p = objekt(data.platebniUdaje);
  if (!p) return [];
  const radky: Array<[string, string]> = [];
  const ucet = textNeboNull(p.cisloUctu);
  const iban = textNeboNull(p.iban);
  const vs = textNeboNull(p.vs);
  const castka = cisloZ(p.castkaKc);
  if (ucet) radky.push(['Číslo účtu', ucet]);
  if (iban) radky.push(['IBAN', iban]);
  if (vs) radky.push(['Variabilní symbol', vs]);
  if (castka !== null) radky.push(['Částka', kc(castka)]);
  // Splatnost z podmínek (čl. 5) – bez ní zákaznice neví, dokdy zaplatit.
  radky.push(['Splatnost', popisSplatnosti()]);
  return ucet || iban ? radky : [];
}

/** Identifikace prodávajícího ze snímku na objednávce (§ 1820 odst. 1 písm. b, § 435). */
function radkyProdavajiciho(data: Data): Array<[string, string]> {
  const d = objekt(data.dodavatel);
  if (!d) return [];
  const radky: Array<[string, string]> = [];
  const pole: Array<[string, string]> = [
    ['nazev', 'Prodávající'],
    ['ico', 'IČO'],
    ['dic', 'DIČ'],
    ['adresa', 'Sídlo'],
    ['email', 'E-mail'],
    ['zapisVRejstriku', 'Zápis'],
  ];
  for (const [klic, popisek] of pole) {
    const hodnota = textNeboNull(d[klic]);
    if (hodnota) radky.push([popisek, hodnota]);
  }
  return radky;
}

/** Tabulka položek s cenou za řádek. */
function tabulkaPolozek(polozky: PolozkaEmailu[]): string {
  const radky = polozky
    .map(
      (p) => `<tr>
          <td style="padding:6px 0;font-size:14px;color:${BARVY.espresso};border-bottom:1px solid ${BARVY.sand};">
            <strong>${e(p.nazev)}</strong><br>
            <span style="font-size:13px;color:#6B5B4F;">${p.velikost ? `${e(p.velikost)} · ` : ''}${p.mnozstvi} ks</span>
          </td>
          <td style="padding:6px 0;font-size:14px;font-weight:600;text-align:right;vertical-align:top;color:${BARVY.espresso};border-bottom:1px solid ${BARVY.sand};">${e(kc(p.celkemKc))}</td>
        </tr>`
    )
    .join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 8px 0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  ${radky}
</table>`;
}

function nadpisBloku(text: string): string {
  return `<p style="margin:24px 0 4px 0;font-family:Georgia,'Times New Roman',serif;font-size:18px;color:${BARVY.espresso};">${e(text)}</p>`;
}

/** Popisky stavů objednávky pro zákaznici. */
const POPIS_STAVU: Record<string, string> = {
  NOVA: 'přijali jsme ji a chystáme se do ní pustit',
  ZPRACOVAVA_SE: 'právě ji balíme',
  EXPEDOVANA: 'předali jsme ji dopravci',
  DORUCENA: 'byla doručena',
  ZRUSENA: 'byla zrušena',
  VRACENA: 'byla vrácena',
};

const NADPIS_STAVU: Record<string, string> = {
  NOVA: 'Objednávka přijata',
  ZPRACOVAVA_SE: 'Objednávku připravujeme',
  EXPEDOVANA: 'Objednávka je na cestě',
  DORUCENA: 'Objednávka doručena',
  ZRUSENA: 'Objednávka zrušena',
  VRACENA: 'Objednávka vrácena',
};

type Data = Record<string, unknown>;

/**
 * Sestaví obsah zprávy podle typu. Neznámý typ vrátí `null` – doručovací
 * úloha ho pak jen zaloguje místo aby poslala prázdný e-mail.
 */
export function sestavitEmail(typ: string, data: Data = {}): VyslednyEmail | null {
  const web = adresaWebu();

  switch (typ) {
    case 'obnova-hesla': {
      const odkaz = String(data.odkaz ?? '');
      const oslovení = data.jmeno ? `Dobrý den, ${e(data.jmeno)},` : 'Dobrý den,';

      return {
        html: obalka(
          'Nastavení nového hesla',
          odstavec(oslovení) +
          odstavec('požádali jste o nové heslo k účtu LINDA FASHION. Odkaz níže platí <strong>jednu hodinu</strong> a dá se použít jen jednou.') +
          tlacitko('Nastavit nové heslo', odkaz) +
          odstavec(
            `Kdyby tlačítko nefungovalo, zkopírujte si do prohlížeče tuhle adresu:<br><span style="word-break:break-all;font-size:13px;color:#6B5B4F;">${e(odkaz)}</span>`
          ) +
          odstavec(
            '<strong>O nic jste nežádali?</strong> Pak tenhle e-mail v klidu smažte – bez kliknutí na odkaz se vaše heslo nezmění.'
          )
        ),
        text: [
          'Dobrý den,',
          '',
          'požádali jste o nové heslo k účtu LINDA FASHION.',
          'Odkaz platí jednu hodinu a dá se použít jen jednou:',
          odkaz,
          '',
          'Pokud jste o nic nežádali, e-mail smažte – heslo se bez kliknutí nezmění.',
        ].join('\n'),
      };
    }

    /*
     * Změna přihlašovacího e-mailu, čl. 16 GDPR.
     *
     * Potvrzení míří na **novou** adresu – kliknutím se prokáže, že k ní má
     * zákaznice přístup. Bez toho by pár vteřin u odemčeného prohlížeče
     * stačilo k převzetí účtu přes „zapomenuté heslo".
     */
    case 'zmena-emailu-potvrzeni': {
      const odkaz = String(data.odkaz ?? '');
      const puvodni = String(data.puvodniEmail ?? '');
      const hodin = Number(data.platnostHodin ?? 24);
      const oslovení = data.jmeno ? `Dobrý den, ${e(data.jmeno)},` : 'Dobrý den,';

      return {
        html: obalka(
          'Potvrzení nové e-mailové adresy',
          odstavec(oslovení) +
          odstavec(
            `u účtu LINDA FASHION jste požádala o změnu přihlašovacího e-mailu` +
              (puvodni ? ` z <strong>${e(puvodni)}</strong>` : '') +
              ` na tuhle adresu. Potvrďte ji prosím tlačítkem níž – odkaz platí <strong>${hodin} hodin</strong>.`
          ) +
          tlacitko('Potvrdit novou adresu', odkaz) +
          odstavec(
            `Kdyby tlačítko nefungovalo, zkopírujte si do prohlížeče tuhle adresu:<br><span style="word-break:break-all;font-size:13px;color:#6B5B4F;">${e(odkaz)}</span>`
          ) +
          odstavec(
            '<strong>O nic jste nežádala?</strong> Pak tenhle e-mail smažte – bez potvrzení se ' +
              'na účtu nic nezmění a přihlašujete se dál původní adresou.'
          )
        ),
        text: [
          'Dobrý den,',
          '',
          'u účtu LINDA FASHION jste požádala o změnu přihlašovacího e-mailu na tuhle adresu.',
          `Potvrďte ji prosím odkazem, platí ${hodin} hodin:`,
          odkaz,
          '',
          'Pokud jste o nic nežádala, e-mail smažte – bez potvrzení se nic nezmění.',
        ].join('\n'),
      };
    }

    /*
     * Upozornění na **starou** adresu. Poslední pojistka: kdyby se někdo
     * k účtu dostal a zkusil ho přesměrovat na sebe, majitelka se to dozví
     * do schránky, ke které pořád má přístup.
     */
    case 'zmena-emailu-upozorneni': {
      const novy = String(data.novyEmail ?? '');
      const oslovení = data.jmeno ? `Dobrý den, ${e(data.jmeno)},` : 'Dobrý den,';

      return {
        html: obalka(
          'Žádost o změnu e-mailu',
          odstavec(oslovení) +
          odstavec(
            `u vašeho účtu někdo požádal o změnu přihlašovacího e-mailu na <strong>${e(novy)}</strong>. ` +
              'Potvrzovací odkaz jsme poslali na tuhle novou adresu; dokud na něj nikdo neklikne, ' +
              'zůstává vše beze změny.'
          ) +
          odstavec(
            '<strong>Nebyla jste to vy?</strong> Změňte si prosím hned heslo – někdo se dostal ' +
              'k vašemu přihlášení. Změnou hesla se zároveň odhlásí všechna ostatní zařízení.'
          )
        ),
        text: [
          'Dobrý den,',
          '',
          `u vašeho účtu někdo požádal o změnu přihlašovacího e-mailu na ${novy}.`,
          'Potvrzovací odkaz šel na tu novou adresu; dokud na něj nikdo neklikne, nic se nemění.',
          '',
          'Nebyla jste to vy? Změňte si hned heslo – tím se odhlásí i všechna ostatní zařízení.',
        ].join('\n'),
      };
    }

    case 'potvrzeni-objednavky': {
      const cislo = String(data.cisloObjednavky ?? '');
      const token = tokenZDat(data);
      const odkaz = odkazNaObjednavku(token);

      /*
       * Odkaz na odstoupení od smlouvy patří přímo do potvrzení objednávky.
       * § 1830a chce funkci snadno dostupnou; potvrzovací e-mail je jediná
       * věc, kterou má zákaznice po nákupu jistě u sebe – i ta, která u nás
       * nemá účet. S tokenem přeskočí hledání objednávky a rovnou vidí
       * rekapitulaci.
       */
      const odkazOdstoupeni = token
        ? `${web}/odstoupeni?token=${encodeURIComponent(token)}`
        : `${web}/odstoupeni`;

      /*
       * --- Obsah smlouvy ---
       *
       * Číslo, zboží, cena s rozpisem, doprava, platba, prodávající a podmínky.
       * Úloha z doby před touhle změnou nese jen `celkovaCena` – pak se
       * vypíše aspoň ta, aby e-mail z fronty nespadl ani neztratil cenu.
       */
      const polozky = polozkyZDat(data);
      const rozpis = rozpisZDat(data);
      const kUhrade = cisloZ(data.kUhradeKc) ?? cisloZ(data.celkovaCena);
      const dph = vetaDph(data);
      const doruceni = radkyDoruceni(data);
      const platebniUdaje = radkyPlatby(data);
      const prodavajici = radkyProdavajiciho(data);
      const sKUhrade: Array<[string, string]> = [
        ...rozpis,
        ...(kUhrade !== null ? ([['K úhradě', kc(kUhrade)]] as Array<[string, string]>) : []),
      ];

      const radky: Array<[string, string]> = [['Číslo objednávky', cislo]];
      if (kUhrade !== null) radky.push(['Celkem k úhradě', kc(kUhrade)]);
      if (data.zpusobPlatby) radky.push(['Platba', String(data.zpusobPlatby)]);
      if (data.zpusobDopravy) radky.push(['Doprava', String(data.zpusobDopravy)]);
      // Verze podmínek patří do potvrzení, ne jen do databáze: bez ní se
      // z e-mailu nepozná, s jakým zněním kupující souhlasil.
      if (data.verzePodminek) radky.push(['Obchodní podmínky', `verze ${String(data.verzePodminek)}`]);

      const odkazPodminky = data.verzePodminek
        ? `${web}/obchodni-podminky?verze=${encodeURIComponent(String(data.verzePodminek))}`
        : `${web}/obchodni-podminky`;

      const adresaProVraceni = data.adresaProVraceni ? String(data.adresaProVraceni) : null;

      /*
       * Neutrální formulace. Šablona mluvila v ženském rodě („jakým jste
       * platila", „souhlasila") – web míří na ženy, ale nakupují i muži,
       * třeba dárek, a potvrzení smlouvy je dokument, ne oslovení.
       *
       * --- Poučení o odstoupení, § 1820 odst. 1 a § 1822 odst. 1 o. z. ---
       *
       * Poučení musí kupující dostat **v textové podobě na trvalém nosiči**.
       * Odkaz na web to nesplňuje: web se dá kdykoliv přepsat, takže z něj
       * po roce nejde doložit, co bylo sděleno. E-mail ve schránce trvalý
       * nosič je – proto tu stojí celé poučení, ne jen cesta k němu.
       *
       * Věta o nákladech na vrácení není zdvořilost: podle § 1820 odst. 1
       * písm. i) je nese prodávající, pokud na ně kupujícího neupozornil.
       */
      const pouceni =
        nadpisBloku('Poučení o právu odstoupit od smlouvy') +
        odstavec(
          'Máte právo odstoupit od smlouvy bez udání důvodu do 14 dnů ode dne, kdy vy nebo vámi ' +
            'určená třetí osoba (jiná než dopravce) převezmete poslední kus zboží z objednávky.'
        ) +
        odstavec(
          `Odstoupit stačí jednoznačným prohlášením – nejrychleji <a href="${odkazOdstoupeni}" style="color:${BARVY.cognac};">formulářem na našem webu</a> (bez přihlášení), ` +
            `dále e-mailem, dopisem nebo <a href="${web}/odstoupeni/formular" style="color:${BARVY.cognac};">vzorovým formulářem</a>. ` +
            'Lhůta je zachována, pokud odstoupení odešlete její poslední den. Přijetí vám potvrdíme s uvedením data a času.'
        ) +
        odstavec(
          'Peníze vám vrátíme do 14 dnů od doručení odstoupení, stejným způsobem, jakým byla objednávka zaplacena. ' +
            'S vrácením můžeme počkat, dokud zboží neobdržíme zpět nebo dokud nám neprokážete jeho odeslání.'
        ) +
        odstavec(
          (adresaProVraceni
            ? `Zboží nám odešlete nejpozději do 14 dnů od odstoupení na adresu <strong>${e(adresaProVraceni)}</strong>. `
            : 'Zboží nám odešlete nejpozději do 14 dnů od odstoupení; adresu vám sdělíme e-mailem. ') +
            '<strong>Přímé náklady na vrácení zboží nesete vy.</strong> Odpovídáte za snížení hodnoty zboží, ' +
            'které vzniklo nakládáním s ním jinak, než je nutné k obeznámení se s jeho povahou a vlastnostmi.'
        );

      const pouceniText = [
        'POUČENÍ O PRÁVU ODSTOUPIT OD SMLOUVY',
        '',
        'Máte právo odstoupit od smlouvy bez udání důvodu do 14 dnů ode dne převzetí',
        'posledního kusu zboží z objednávky.',
        '',
        'Odstoupit stačí jednoznačným prohlášením – nejrychleji formulářem na webu',
        `(bez přihlášení): ${odkazOdstoupeni}`,
        `Vzorový formulář: ${web}/odstoupeni/formular`,
        'Lhůta je zachována, pokud odstoupení odešlete její poslední den.',
        'Přijetí vám potvrdíme s uvedením data a času.',
        '',
        'Peníze vrátíme do 14 dnů od doručení odstoupení, stejným způsobem, jakým',
        'byla objednávka zaplacena. Můžeme počkat, dokud zboží neobdržíme zpět',
        'nebo dokud nám neprokážete jeho odeslání.',
        '',
        adresaProVraceni
          ? `Zboží odešlete do 14 dnů od odstoupení na adresu: ${adresaProVraceni}`
          : 'Zboží odešlete do 14 dnů od odstoupení; adresu vám sdělíme e-mailem.',
        'Přímé náklady na vrácení zboží nesete vy. Odpovídáte za snížení hodnoty',
        'zboží, které vzniklo nakládáním s ním jinak, než je nutné k obeznámení se',
        's jeho povahou a vlastnostmi.',
      ];

      // --- HTML ---------------------------------------------------------
      const htmlObjednavka =
        (polozky.length ? nadpisBloku('Co jste si objednali') + tabulkaPolozek(polozky) : '') +
        (polozky.length && sKUhrade.length ? panel(sKUhrade) : '') +
        (dph ? odstavec(`<span style="font-size:13px;color:#6B5B4F;">${e(dph)}</span>`) : '');

      const htmlPlatba = platebniUdaje.length
        ? nadpisBloku('Platba převodem') +
          panel(platebniUdaje) +
          odstavec('Zboží odešleme, jakmile platba dorazí na účet. QR kód k platbě najdete také na stránce objednávky.')
        : '';

      const htmlDoruceni = doruceni.length ? nadpisBloku('Doručení') + panel(doruceni) : '';
      const htmlProdavajici = prodavajici.length ? nadpisBloku('Prodávající') + panel(prodavajici) : '';

      // --- Text ---------------------------------------------------------
      const blokText = (nadpis: string, r: Array<[string, string]>): string[] =>
        r.length ? [nadpis.toUpperCase(), ...r.map(([k, v]) => `${k}: ${v}`), ''] : [];

      const textPolozky = polozky.length
        ? [
            'CO JSTE SI OBJEDNALI',
            ...polozky.map(
              (p) => `${p.nazev}${p.velikost ? ` (${p.velikost})` : ''}, ${p.mnozstvi} ks: ${kc(p.celkemKc)}`
            ),
            '',
            ...blokText('Rozpis ceny', sKUhrade),
          ]
        : [];

      return {
        predmet: `Potvrzení objednávky ${cislo} – LINDA FASHION`,
        html: obalka(
          'Děkujeme za objednávku',
          odstavec('Dobrý den,') +
          odstavec('vaši objednávku jsme přijali a pustíme se do ní. Jakmile ji předáme dopravci, dáme vám vědět.') +
          panel(radky) +
          htmlObjednavka +
          htmlPlatba +
          htmlDoruceni +
          tlacitko('Zobrazit objednávku', odkaz) +
          pouceni +
          odstavec(
            `Na zboží se vztahuje zákonná odpovědnost za vady; jak ji uplatnit, popisuje <a href="${web}/reklamacni-rad" style="color:${BARVY.cognac};">reklamační řád</a>.`
          ) +
          odstavec(
            `Objednávka se řídí <a href="${odkazPodminky}" style="color:${BARVY.cognac};">obchodními podmínkami ve znění platném pro tuto objednávku</a>. Odkaz vede na přesně to znění i po jeho pozdější změně – e-mail si proto uschovejte.`
          ) +
          htmlProdavajici
        ),
        text: [
          'Dobrý den,',
          '',
          `vaši objednávku ${cislo} jsme přijali a pustíme se do ní.`,
          '',
          ...radky.slice(1).map(([k, v]) => `${k}: ${v}`),
          '',
          ...textPolozky,
          ...(dph ? [dph, ''] : []),
          ...blokText('Platba převodem', platebniUdaje),
          ...blokText('Doručení', doruceni),
          `Detail objednávky: ${odkaz}`,
          '',
          ...pouceniText,
          '',
          `Reklamační řád (zákonná odpovědnost za vady): ${web}/reklamacni-rad`,
          `Obchodní podmínky ve znění platném pro tuto objednávku: ${odkazPodminky}`,
          '',
          ...blokText('Prodávající', prodavajici),
          'Tento e-mail si prosím uschovejte.',
        ].join('\n'),
      };
    }

    /*
     * Zpráva majitelce o nové objednávce.
     *
     * Dřív žádná nebyla: o reklamaci se majitelka e-mailem dozvěděla, o nákupu
     * ne – objednávka jen tiše přibyla v administraci. U převodu to nevadí
     * hned, ale dodací lhůta běží od objednání, ne od chvíle, kdy se někdo
     * náhodou podívá do adminu.
     *
     * Schválně bez adresy a telefonu kupujícího: e-mail leží v cizí schránce
     * (Gmail) a k vyřízení stačí odkaz do administrace, kde údaje jsou.
     */
    case 'nova-objednavka': {
      const cislo = String(data.cisloObjednavky ?? '');
      const polozky = polozkyZDat(data);
      const kUhrade = cisloZ(data.kUhradeKc);
      const odkazAdmin = data.orderId
        ? `${web}/admin/objednavky/${encodeURIComponent(String(data.orderId))}`
        : `${web}/admin/objednavky`;

      const radky: Array<[string, string]> = [['Číslo objednávky', cislo]];
      const jmeno = textNeboNull(data.jmeno);
      if (jmeno) radky.push(['Kupující', jmeno]);
      if (kUhrade !== null) radky.push(['K úhradě', kc(kUhrade)]);
      if (data.zpusobPlatby) radky.push(['Platba', String(data.zpusobPlatby)]);
      if (data.zpusobDopravy) radky.push(['Doprava', String(data.zpusobDopravy)]);

      return {
        predmet: `Nová objednávka ${cislo}${kUhrade !== null ? ` – ${kc(kUhrade)}` : ''}`,
        html: obalka(
          'Nová objednávka',
          panel(radky) +
            (polozky.length ? tabulkaPolozek(polozky) : '') +
            tlacitko('Otevřít v administraci', odkazAdmin)
        ),
        text: [
          `Nová objednávka ${cislo}`,
          '',
          ...radky.slice(1).map(([k, v]) => `${k}: ${v}`),
          '',
          ...polozky.map(
            (p) => `${p.nazev}${p.velikost ? ` (${p.velikost})` : ''}, ${p.mnozstvi} ks: ${kc(p.celkemKc)}`
          ),
          '',
          `Administrace: ${odkazAdmin}`,
        ].join('\n'),
      };
    }

    case 'zmena-stavu-objednavky': {
      const cislo = String(data.cisloObjednavky ?? '');
      const stav = String(data.stav ?? '');
      const zasilka = data.cisloZasilky ? String(data.cisloZasilky) : null;
      const odkaz = odkazNaObjednavku(tokenZDat(data));

      const radky: Array<[string, string]> = [['Číslo objednávky', cislo]];
      if (zasilka) radky.push(['Číslo zásilky', zasilka]);

      return {
        predmet: `Objednávka ${cislo} – ${(NADPIS_STAVU[stav] ?? 'změna stavu').toLowerCase()}`,
        html: obalka(
          NADPIS_STAVU[stav] ?? 'Změna stavu objednávky',
          odstavec('Dobrý den,') +
          odstavec(`vaše objednávka <strong>${e(cislo)}</strong> ${e(POPIS_STAVU[stav] ?? 'změnila stav')}.`) +
          panel(radky) +
          (zasilka
            ? odstavec('Podle čísla zásilky si zásilku najdete na webu dopravce.')
            : '') +
          tlacitko('Zobrazit objednávku', odkaz)
        ),
        text: [
          'Dobrý den,',
          '',
          `vaše objednávka ${cislo} ${POPIS_STAVU[stav] ?? 'změnila stav'}.`,
          zasilka ? `Číslo zásilky: ${zasilka}` : '',
          '',
          `Detail objednávky: ${odkaz}`,
        ]
          .filter(Boolean)
          .join('\n'),
      };
    }

    case 'skladem-znovu': {
      const nazev = String(data.nazev ?? 'Hlídané zboží');
      const odkaz = data.slug ? `${web}/produkt/${encodeURIComponent(String(data.slug))}` : `${web}/produkty`;

      return {
        html: obalka(
          'Je to zpátky skladem',
          odstavec('Dobrý den,') +
          odstavec(`hlídali jste si <strong>${e(nazev)}</strong> – právě je znovu k dispozici.`) +
          tlacitko('Zobrazit zboží', odkaz) +
          odstavec(
            'Kousků bývá málo, tak s nákupem neváhejte. Tuhle zprávu posíláme jen jednou; na další naskladnění si hlídání nastavte znovu.'
          )
        ),
        text: [
          'Dobrý den,',
          '',
          `hlídané zboží ${nazev} je znovu skladem.`,
          odkaz,
          '',
          'Tuhle zprávu posíláme jen jednou.',
        ].join('\n'),
      };
    }

    case 'newsletter-potvrzeni': {
      const odkaz = String(data.odkaz ?? '');

      return {
        predmet: 'Potvrďte prosím odběr novinek – LINDA FASHION',
        html: obalka(
          'Ještě jedno kliknutí',
          odstavec('Dobrý den,') +
          odstavec('do odběru novinek vás zapíšeme, jakmile potvrdíte, že e-mail patří opravdu vám.') +
          tlacitko('Potvrdit odběr', odkaz) +
          odstavec(
            `Kdyby tlačítko nefungovalo, otevřete tuhle adresu:<br><span style="word-break:break-all;font-size:13px;color:#6B5B4F;">${e(odkaz)}</span>`
          ) +
          odstavec('Pokud jste se nepřihlašovali, nedělejte nic – bez potvrzení vám nic posílat nebudeme.')
        ),
        text: [
          'Dobrý den,',
          '',
          'do odběru novinek vás zapíšeme po potvrzení:',
          odkaz,
          '',
          'Pokud jste se nepřihlašovali, nedělejte nic – bez potvrzení vám nic neposíláme.',
        ].join('\n'),
      };
    }

    case 'opusteny-kosik': {
      const odkaz = `${web}/kosik`;

      return {
        predmet: 'Zapomněli jste u nás košík – LINDA FASHION',
        html: obalka(
          'Váš košík na vás čeká',
          odstavec('Dobrý den,') +
          odstavec('nechali jste u nás plný košík. Držíme vám ho, ale zboží nerezervujeme – u posledních kousků rozhoduje, kdo dokončí nákup dřív.') +
          tlacitko('Dokončit nákup', odkaz)
        ),
        text: ['Dobrý den,', '', 'nechali jste u nás plný košík:', odkaz, '', 'Zboží v košíku nerezervujeme.'].join(
          '\n'
        ),
      };
    }

    /*
     * Docházející sklad. Táž událost přichází ze dvou míst a `slug` je rozlišuje:
     *
     *   • bez `slug` – kousek leží zákaznici v košíku, odkaz vede do košíku;
     *   • se `slug` – má ho mezi oblíbenými, odkaz vede na produkt.
     *
     * Dokud šablona znala jen košík, věta „ve vašem košíku" by u oblíbených
     * lhala a tlačítko „Dokončit nákup" by ji poslalo do prázdného košíku.
     * Nový `TypEmailu` to nedostalo schválně: je to jedna zpráva o jedné
     * události, jen jinak nalezená.
     */
    case 'dochazejici-sklad': {
      const slug = data.slug ? String(data.slug) : null;
      const nazev = String(
        data.nazev ?? (slug ? 'Zboží z vašich oblíbených' : 'Zboží z vašeho košíku')
      );

      const odkaz = slug ? `${web}/produkt/${slug}` : `${web}/kosik`;
      const kde = slug ? 'z vašich oblíbených' : 've vašem košíku';
      const popisek = slug ? 'Zobrazit kousek' : 'Dokončit nákup';

      return {
        predmet: `${nazev} dochází – LINDA FASHION`,
        html: obalka(
          'Posledních pár kousků',
          odstavec('Dobrý den,') +
          odstavec(`z <strong>${e(nazev)}</strong> ${e(kde)} zbývá jen pár kusů.`) +
          tlacitko(popisek, odkaz)
        ),
        text: ['Dobrý den,', '', `z ${nazev} ${kde} zbývá jen pár kusů.`, odkaz].join('\n'),
      };
    }

    // --- Zprávy pro majitelku ------------------------------------------------
    case 'nova-zprava-z-formulare': {
      const odkaz = `${web}/admin/zpravy`;

      return {
        html: obalka(
          'Nová zpráva z kontaktního formuláře',
          panel([
            ['Od', String(data.od ?? '')],
            ['Předmět', String(data.predmet ?? '(bez předmětu)')],
          ]) +
          odstavec('Celé znění je v administraci – tenhle e-mail je jen upozornění, obsah zprávy se posílá nešifrovaně.') +
          tlacitko('Otevřít v administraci', odkaz)
        ),
        text: [
          'Nová zpráva z kontaktního formuláře.',
          `Od: ${String(data.od ?? '')}`,
          `Předmět: ${String(data.predmet ?? '(bez předmětu)')}`,
          '',
          odkaz,
        ].join('\n'),
      };
    }

    /*
     * Automatické potvrzení odstoupení od smlouvy – § 1830a o. z.
     *
     * Zákon chce potvrzení **s datem a časem přijetí** a s kopií toho, co
     * zákaznice podala. Není to zdvořilostní zpráva: je to doklad, že
     * odstoupení dorazilo včas, a nese ho zákaznice, ne my.
     *
     * Čas se formátuje v české zóně, ne v zóně kontejneru. V Dockeru je UTC,
     * takže odstoupení podané v 00:30 SELČ by v potvrzení vyšlo na předchozí
     * den – u lhůty počítané na dny je to rozdíl, který rozhoduje.
     */
    case 'odstoupeni-potvrzeni': {
      const cislo = String(data.cisloObjednavky ?? '');
      const prijato = data.prijatoAt ? new Date(String(data.prijatoAt)) : new Date();

      const kdy = prijato.toLocaleString('cs-CZ', {
        timeZone: 'Europe/Prague',
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const adresa = data.adresaProVraceni ? String(data.adresaProVraceni) : null;

      const polozky = Array.isArray(data.polozky)
        ? (data.polozky as Array<{ nazev?: unknown; velikost?: unknown; mnozstvi?: unknown }>)
        : [];

      /* Nadpis seznamu rozlišuje celou objednávku od částečného vrácení.
         „Zboží z objednávky" u částečného odstoupení vypadá, jako by se
         vracelo všechno – a potvrzení je doklad, ne shrnutí. */
      const celaObjednavka = data.celaObjednavka === true;
      const nadpisSeznamu = celaObjednavka ? 'Zboží z objednávky:' : 'Vracíte tyto kusy:';

      const seznamHtml = polozky.length
        ? '<ul style="margin:0 0 14px 0;padding-left:20px;">' +
        polozky
          .map(
            (i) =>
              `<li style="font-size:14px;color:#6B5B4F;">${e(i.nazev)} (${e(i.velikost)}) – ${e(i.mnozstvi)} ks</li>`
          )
          .join('') +
        '</ul>'
        : '';

      const seznamText = polozky.map((i) => `  • ${String(i.nazev)} (${String(i.velikost)}) – ${String(i.mnozstvi)} ks`);

      return {
        predmet: `Potvrzení odstoupení od smlouvy – objednávka ${cislo}`,
        html: obalka(
          'Odstoupení od smlouvy přijato',
          odstavec('Dobrý den,') +
          odstavec(
            'potvrzujeme, že jsme přijali vaše odstoupení od kupní smlouvy. Tenhle e-mail je zároveň dokladem o tom, kdy odstoupení dorazilo – uschovejte si ho prosím.'
          ) +
          panel([
            ['Objednávka', cislo],
            ['Přijato', kdy],
          ]) +
          (seznamHtml ? odstavec(`<strong>${nadpisSeznamu}</strong>`) + seznamHtml : '') +
          (data.duvod ? odstavec(`<strong>Vaše poznámka:</strong> ${e(data.duvod)}`) : '') +
          odstavec(
            adresa
              ? `Zboží prosím odešlete zpět na adresu:<br><strong>${e(adresa)}</strong><br>Nejpozději do 14 dnů od tohohle odstoupení.`
              : 'Ozveme se vám s pokyny, kam zboží poslat. Odeslat ho potřebujete nejpozději do 14 dnů od tohohle odstoupení.'
          ) +
          odstavec(
            'Peníze vám vrátíme do 14 dnů od doručení odstoupení. Můžeme s vrácením počkat, dokud zboží nedorazí zpět nebo dokud nedoložíte jeho odeslání.'
          )
        ),
        text: [
          'Dobrý den,',
          '',
          'potvrzujeme přijetí vašeho odstoupení od kupní smlouvy.',
          '',
          `Objednávka: ${cislo}`,
          `Přijato: ${kdy}`,
          ...(seznamText.length ? ['', nadpisSeznamu, ...seznamText] : []),
          ...(data.duvod ? ['', `Vaše poznámka: ${String(data.duvod)}`] : []),
          '',
          adresa
            ? `Zboží prosím odešlete zpět na adresu: ${adresa}`
            : 'Ozveme se vám s pokyny, kam zboží poslat.',
          'Odeslat ho potřebujete nejpozději do 14 dnů od tohohle odstoupení.',
          '',
          'Peníze vám vrátíme do 14 dnů od doručení odstoupení.',
          'Tenhle e-mail je dokladem o tom, kdy odstoupení dorazilo – uschovejte si ho.',
        ].join('\n'),
      };
    }

    /*
     * Potvrzení o uplatnění reklamace – povinné podle § 19 odst. 1 zák.
     * č. 634/1992 Sb.: kdy spotřebitelka právo uplatnila, co je obsahem
     * reklamace a jak se vyřídí. Do téhle chvíle chodilo jen upozornění
     * majitelce a zákaznice neměla v ruce nic – přestože reklamační řád jí
     * potvrzení výslovně slibuje, i s adresou pro zaslání zboží.
     *
     * Čas v české zóně ze stejného důvodu jako u odstoupení: kontejner běží
     * v UTC a reklamace podaná po půlnoci by nesla předchozí den – a od
     * uplatnění běží třicetidenní lhůta na vyřízení.
     */
    case 'reklamace-prijata': {
      const cislo = String(data.cisloObjednavky ?? '');
      const prijato = data.prijatoAt ? new Date(String(data.prijatoAt)) : new Date();
      const lhuta = data.lhutaDo ? new Date(String(data.lhutaDo)) : null;

      const kdy = prijato.toLocaleString('cs-CZ', {
        timeZone: 'Europe/Prague',
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const doKdy = lhuta
        ? lhuta.toLocaleDateString('cs-CZ', {
          timeZone: 'Europe/Prague',
          day: 'numeric',
          month: 'numeric',
          year: 'numeric',
        })
        : null;

      const zbozi = data.polozka ? String(data.polozka) : 'celá objednávka';
      const adresa = data.adresaProVraceni ? String(data.adresaProVraceni) : null;

      // Požadovaný způsob vyřízení (§ 19 odst. 1). U reklamace zapsané
      // v administraci může chybět – pak se řádek vynechá, nic se nedomýšlí.
      const zpusob =
        typeof data.pozadovanyZpusob === 'string' && data.pozadovanyZpusob in NAZEV_ZPUSOBU_VYRIZENI
          ? NAZEV_ZPUSOBU_VYRIZENI[data.pozadovanyZpusob as ZpusobVyrizeni]
          : null;
      const token = data.token ? String(data.token) : null;
      // Parametr je `t`, stejně jako u potvrzení objednávky – viz stránka stavu.
      const odkaz = token ? `${web}/reklamace/stav?t=${encodeURIComponent(token)}` : `${web}/reklamace/stav`;

      return {
        predmet: `Potvrzení reklamace – objednávka ${cislo}`,
        html: obalka(
          'Reklamaci jsme přijali',
          odstavec('Dobrý den,') +
          odstavec(
            'potvrzujeme, že jsme přijali vaši reklamaci. Tenhle e-mail je zároveň dokladem o tom, kdy jste ji uplatnila – uschovejte si ho prosím.'
          ) +
          panel([
            ['Objednávka', cislo],
            ['Uplatněno', kdy],
            ['Reklamované zboží', zbozi],
            ...(zpusob ? ([['Požadujete', zpusob]] as Array<[string, string]>) : []),
            ...(doKdy ? ([['Vyřídíme nejpozději', doKdy]] as Array<[string, string]>) : []),
          ]) +
          (data.duvod ? odstavec(`<strong>Popis vady:</strong> ${e(data.duvod)}`) : '') +
          odstavec(
            adresa
              ? `Reklamované zboží posílejte na adresu:<br><strong>${e(adresa)}</strong><br>Nejdřív ale prosím počkejte na naši odpověď – někdy stačí fotka a posílat nic nemusíte.`
              : 'Ozveme se vám s pokyny, kam zboží poslat. Než odpovíme, nic prosím neposílejte – někdy stačí fotka.'
          ) +
          odstavec(
            'Reklamaci vyřídíme nejpozději do 30 dnů od uplatnění. Pokud to nestihneme, máte právo od smlouvy odstoupit nebo požadovat přiměřenou slevu.'
          ) +
          tlacitko('Sledovat stav reklamace', odkaz)
        ),
        text: [
          'Dobrý den,',
          '',
          'potvrzujeme přijetí vaší reklamace.',
          '',
          `Objednávka: ${cislo}`,
          `Uplatněno: ${kdy}`,
          `Reklamované zboží: ${zbozi}`,
          ...(zpusob ? [`Požadujete: ${zpusob}`] : []),
          ...(doKdy ? [`Vyřídíme nejpozději: ${doKdy}`] : []),
          ...(data.duvod ? ['', `Popis vady: ${String(data.duvod)}`] : []),
          '',
          adresa
            ? `Reklamované zboží posílejte na adresu: ${adresa} – ale až po naší odpovědi.`
            : 'Ozveme se vám s pokyny, kam zboží poslat. Než odpovíme, nic neposílejte.',
          '',
          'Reklamaci vyřídíme nejpozději do 30 dnů od uplatnění. Pokud to nestihneme,',
          'máte právo od smlouvy odstoupit nebo požadovat přiměřenou slevu.',
          '',
          `Stav reklamace: ${odkaz}`,
          '',
          'Tenhle e-mail je dokladem o tom, kdy jste reklamaci uplatnila – uschovejte si ho.',
        ].join('\n'),
      };
    }

    case 'nova-reklamace': {
      const odkaz = `${web}/admin/reklamace`;
      const typReklamace = data.typ === 'VRACENI' ? 'Vrácení zboží' : 'Reklamace';

      return {
        html: obalka(
          `${typReklamace} – nová žádost`,
          panel([
            ['Typ', typReklamace],
            ['Objednávka', String(data.cisloObjednavky ?? '')],
          ]) + tlacitko('Otevřít v administraci', odkaz)
        ),
        text: [
          `${typReklamace} – nová žádost.`,
          `Objednávka: ${String(data.cisloObjednavky ?? '')}`,
          '',
          odkaz,
        ].join('\n'),
      };
    }

    case 'platba-prijata': {
      const cislo = String(data.cisloObjednavky ?? '');
      const odkaz = odkazNaObjednavku(tokenZDat(data));

      return {
        predmet: `Platba k objednávce ${cislo} přijata – LINDA FASHION`,
        html: obalka(
          'Platbu máme',
          odstavec('Dobrý den,') +
          odstavec(`platbu k objednávce <strong>${e(cislo)}</strong> jsme přijali. Zboží připravíme k odeslání.`) +
          tlacitko('Zobrazit objednávku', odkaz)
        ),
        text: ['Dobrý den,', '', `platbu k objednávce ${cislo} jsme přijali.`, `Detail objednávky: ${odkaz}`].join('\n'),
      };
    }

    /*
     * Kódy zakoupených dárkových poukazů.
     *
     * Bez téhle zprávy končily vydané poukazy slepou uličkou: worker je po
     * zaplacení založil v databázi a nikdo se je nedozvěděl – administrace je
     * nevypisovala a e-mail neexistoval. Zákaznice zaplatila za kód, který
     * nikdy neviděla.
     *
     * Kódy jdou do těla zprávy, ne za odkaz. Poukaz je platidlo na doručitele;
     * odkaz na stránku s kódem by z něj udělal něco, co se dá přeposlat dál
     * i poté, co ho zákaznice předá obdarované.
     */
    case 'poukazy-vydane': {
      const cislo = String(data.cisloObjednavky ?? '');
      const kody = Array.isArray(data.kody) ? data.kody.map(String) : [];
      if (kody.length === 0) return null;

      const jedenKus = kody.length === 1;
      const platnost = data.platnyDo ? String(data.platnyDo) : null;

      const seznam = kody
        .map(
          (kod) =>
            `<tr><td style="padding:10px 0;font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:700;letter-spacing:2px;text-align:center;color:${BARVY.espresso};">${e(kod)}</td></tr>`
        )
        .join('');

      return {
        predmet: jedenKus
          ? `Váš dárkový poukaz – LINDA FASHION`
          : `Vaše dárkové poukazy (${kody.length}×) – LINDA FASHION`,
        html: obalka(
          jedenKus ? 'Váš dárkový poukaz' : 'Vaše dárkové poukazy',
          odstavec('Dobrý den,') +
          odstavec(
            jedenKus
              ? `k objednávce <strong>${e(cislo)}</strong> jsme vystavili dárkový poukaz. Kód níž stačí zadat v pokladně.`
              : `k objednávce <strong>${e(cislo)}</strong> jsme vystavili <strong>${kody.length} dárkové poukazy</strong>. Každý kód platí samostatně a zadává se v pokladně.`
          ) +
          `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BARVY.sandLight};border-radius:12px;padding:12px 20px;margin:20px 0;">${seznam}</table>` +
          odstavec(
            platnost
              ? `Poukaz můžete uplatnit do <strong>${e(platnost)}</strong>. Nevyčerpaný zůstatek zůstává na kódu i po částečném použití.`
              : 'Poukaz nemá omezenou platnost. Nevyčerpaný zůstatek zůstává na kódu i po částečném použití.'
          ) +
          odstavec('Kód nikam nepřeposílejte – kdo ho zná, může ho uplatnit.')
        ),
        text: [
          'Dobrý den,',
          '',
          jedenKus
            ? `k objednávce ${cislo} jsme vystavili dárkový poukaz.`
            : `k objednávce ${cislo} jsme vystavili ${kody.length} dárkové poukazy.`,
          '',
          ...kody.map((kod) => `  ${kod}`),
          '',
          platnost
            ? `Poukaz uplatníte v pokladně do ${platnost}.`
            : 'Poukaz uplatníte v pokladně, platnost není omezená.',
          'Nevyčerpaný zůstatek zůstává na kódu i po částečném použití.',
          'Kód nikam nepřeposílejte – kdo ho zná, může ho uplatnit.',
        ].join('\n'),
      };
    }

    /*
     * Vyřízení reklamace nebo vrácení.
     *
     * § 19 odst. 3 zák. č. 634/1992 Sb. dává prodávajícímu třicet dnů na
     * vyřízení **a na vyrozumění**. Do téhle chvíle administrace stav jen
     * přepnula a nikam nic neposlala; zákaznice bez účtu – a ta smí reklamovat
     * stejně jako registrovaná – tak neměla jak výsledek zjistit vůbec.
     */
    case 'reklamace-vyrizena': {
      const cislo = String(data.cisloObjednavky ?? '');
      const jeVraceni = data.typ === 'VRACENI';
      const uznano = data.stav === 'VYRIZENA_UZNANA';
      const poznamka = data.poznamka ? String(data.poznamka) : null;
      const nazev = jeVraceni ? 'Vrácení zboží' : 'Reklamace';

      /* Odkaz na stav žádosti. `Reklamace.token` se generoval od začátku, ale
         nikam se neposílal, takže se k němu zákaznice neměla jak dostat.
         Bez tokenu odkaz míří na vyhledávací formulář – ten funguje taky,
         jen po ní chce číslo objednávky a e-mail. */
      const tokenZadosti = data.token ? String(data.token) : null;
      const odkazNaStav = `${adresaWebu()}/reklamace/stav${
        tokenZadosti ? `?t=${encodeURIComponent(tokenZadosti)}` : ''
      }`;

      /* Datum vyřízení – § 19 odst. 1 zák. o ochraně spotřebitele chce
         potvrzení o datu a způsobu vyřízení. Starší úlohy ve frontě ho
         nemají, řádek pak prostě chybí. */
      const datumVyrizeni = data.datumVyrizeni
        ? new Date(String(data.datumVyrizeni)).toLocaleDateString('cs-CZ', { timeZone: 'Europe/Prague' })
        : null;
      const popisekPoznamky = uznano ? 'Vyjádření' : 'Odůvodnění';

      const radky: Array<[string, string]> = [
        ['Objednávka', cislo],
        ['Výsledek', uznano ? 'Uznáno' : 'Zamítnuto'],
        ...(datumVyrizeni ? [['Datum vyřízení', datumVyrizeni] as [string, string]] : []),
      ];

      const zaver = uznano
        ? jeVraceni
          ? 'Peníze vám vrátíme do 14 dnů stejným způsobem, jakým jste platila.'
          : 'Ozveme se vám s domluvou na opravě, výměně nebo vrácení peněz.'
        : 'Pokud s posouzením nesouhlasíte, ozvěte se nám – spor lze řešit i mimosoudně u České obchodní inspekce (coi.cz).';

      return {
        predmet: `${nazev} k objednávce ${cislo} – vyřízeno`,
        html: obalka(
          `${nazev} vyřízena`,
          odstavec('Dobrý den,') +
          odstavec(
            `vaši ${jeVraceni ? 'žádost o vrácení' : 'reklamaci'} k objednávce <strong>${e(cislo)}</strong> jsme vyřídili.`
          ) +
          panel(radky) +
          (poznamka ? odstavec(`<strong>${popisekPoznamky}:</strong> ${e(poznamka)}`) : '') +
          odstavec(zaver) +
          tlacitko('Zobrazit stav žádosti', odkazNaStav)
        ),
        text: [
          'Dobrý den,',
          '',
          `vaši ${jeVraceni ? 'žádost o vrácení' : 'reklamaci'} k objednávce ${cislo} jsme vyřídili.`,
          '',
          `Výsledek: ${uznano ? 'Uznáno' : 'Zamítnuto'}`,
          datumVyrizeni ? `Datum vyřízení: ${datumVyrizeni}` : '',
          poznamka ? `${popisekPoznamky}: ${poznamka}` : '',
          '',
          zaver,
          '',
          `Stav žádosti: ${odkazNaStav}`,
        ]
          .filter(Boolean)
          .join('\n'),
      };
    }

    default:
      return null;
  }
}
