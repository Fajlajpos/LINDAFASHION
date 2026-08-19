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

function adresaWebu(): string {
  return (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
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

    case 'potvrzeni-objednavky': {
      const cislo = String(data.cisloObjednavky ?? '');
      const token = data.verejnyToken ? String(data.verejnyToken) : null;
      const odkaz = token ? `${web}/pokladna/potvrzeni?token=${encodeURIComponent(token)}` : `${web}/muj-ucet`;

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

      const radky: Array<[string, string]> = [['Číslo objednávky', cislo]];
      if (typeof data.celkovaCena === 'number') {
        radky.push(['Celkem', `${data.celkovaCena.toLocaleString('cs-CZ')} Kč`]);
      }
      if (data.zpusobPlatby) radky.push(['Platba', String(data.zpusobPlatby)]);
      if (data.zpusobDopravy) radky.push(['Doprava', String(data.zpusobDopravy)]);

      return {
        predmet: `Potvrzení objednávky ${cislo} – LINDA FASHION`,
        html: obalka(
          'Děkujeme za objednávku',
          odstavec('Dobrý den,') +
            odstavec('vaši objednávku jsme přijali a pustíme se do ní. Jakmile ji předáme dopravci, dáme vám vědět.') +
            panel(radky) +
            tlacitko('Zobrazit objednávku', odkaz) +
            odstavec(
              'Platíte-li převodem, najdete platební údaje i QR platbu na stránce objednávky. Zboží odesíláme po připsání částky.'
            ) +
            odstavec(
              `Zboží můžete do 14 dnů od převzetí vrátit bez udání důvodu – <a href="${odkazOdstoupeni}" style="color:${BARVY.cognac};">odstoupit od smlouvy</a> jde přímo z tohoto odkazu, přihlašovat se nemusíte.`
            )
        ),
        text: [
          'Dobrý den,',
          '',
          `vaši objednávku ${cislo} jsme přijali a pustíme se do ní.`,
          '',
          ...radky.slice(1).map(([k, v]) => `${k}: ${v}`),
          '',
          `Detail objednávky: ${odkaz}`,
          '',
          'Platíte-li převodem, platební údaje i QR platbu najdete na stránce objednávky.',
          '',
          'Zboží můžete do 14 dnů od převzetí vrátit bez udání důvodu.',
          `Odstoupení od smlouvy: ${odkazOdstoupeni}`,
        ].join('\n'),
      };
    }

    case 'zmena-stavu-objednavky': {
      const cislo = String(data.cisloObjednavky ?? '');
      const stav = String(data.stav ?? '');
      const zasilka = data.cisloZasilky ? String(data.cisloZasilky) : null;

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
            tlacitko('Přehled objednávek', `${web}/muj-ucet`)
        ),
        text: [
          'Dobrý den,',
          '',
          `vaše objednávka ${cislo} ${POPIS_STAVU[stav] ?? 'změnila stav'}.`,
          zasilka ? `Číslo zásilky: ${zasilka}` : '',
          '',
          `Přehled objednávek: ${web}/muj-ucet`,
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

    case 'dochazejici-sklad': {
      const nazev = String(data.nazev ?? 'Zboží z vašeho košíku');
      const odkaz = `${web}/kosik`;

      return {
        predmet: `${nazev} dochází – LINDA FASHION`,
        html: obalka(
          'Posledních pár kousků',
          odstavec('Dobrý den,') +
            odstavec(`z <strong>${e(nazev)}</strong> ve vašem košíku zbývá jen pár kusů.`) +
            tlacitko('Dokončit nákup', odkaz)
        ),
        text: ['Dobrý den,', '', `z ${nazev} ve vašem košíku zbývá jen pár kusů.`, odkaz].join('\n'),
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

      return {
        predmet: `Platba k objednávce ${cislo} přijata – LINDA FASHION`,
        html: obalka(
          'Platbu máme',
          odstavec('Dobrý den,') +
            odstavec(`platbu k objednávce <strong>${e(cislo)}</strong> jsme přijali. Zboží připravíme k odeslání.`) +
            tlacitko('Přehled objednávek', `${web}/muj-ucet`)
        ),
        text: ['Dobrý den,', '', `platbu k objednávce ${cislo} jsme přijali.`, `${web}/muj-ucet`].join('\n'),
      };
    }

    default:
      return null;
  }
}
