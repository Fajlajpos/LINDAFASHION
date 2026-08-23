import { z } from 'zod';

/**
 * Míry jsou v databázi Json, ale ukládat tam cokoliv by znamenalo, že se do
 * detailu produktu jednou dostane pole, se kterým frontend nepočítá.
 * Držíme proto pevnou sadu z sekce 6.2 zadání.
 */
export const miryScheme = z.object({
  obvodHrudniku: z.string().max(60).optional().nullable(),
  obvodPasu: z.string().max(60).optional().nullable(),
  obvodBoku: z.string().max(60).optional().nullable(),
  delka: z.string().max(60).optional().nullable(),
  rukav: z.string().max(60).optional().nullable(),
});

export const variantaSchema = z.object({
  /** Vyplněné jen u varianty, která už v databázi existuje (editace). */
  id: z.string().cuid().optional(),
  velikost: z.string().min(1, 'Vyplňte velikost.').max(60),
  barva: z.string().max(60).optional().nullable(),
  skladem: z.coerce
    .number({ invalid_type_error: 'Počet kusů musí být číslo.' })
    .int('Počet kusů musí být celé číslo.')
    .min(0, 'Počet kusů nemůže být záporný.')
    .max(100000),
  miry: miryScheme.optional().nullable(),
});

/** Fotka nahraná do dočasného úložiště, kterou teprve přiřadíme k produktu. */
export const nahranaFotkaSchema = z.object({
  token: z.string().min(1),
  puvodniNazev: z.string().min(1).max(255),
  altText: z.string().max(255).optional().nullable(),
  /**
   * Která fotka se má zobrazovat jako první (v katalogu, v košíku, ve feedu).
   * Pořadí ostatních určuje pořadí v poli.
   *
   * Endpoint z toho stejně vybere jedinou – viz `urcitHlavni`. Prohlížeč
   * o počtu hlavních fotek rozhodovat nesmí: dvě označené by znamenaly, že
   * se v katalogu zobrazí náhodná.
   */
  jeHlavni: z.boolean().optional().default(false),
});

/**
 * Index fotky, která bude hlavní.
 *
 * Když prohlížeč neoznačil žádnou (starší formulář, ruční požadavek), bere se
 * první – produkt bez hlavní fotky by se v katalogu zobrazil se zástupným
 * symbolem, přestože fotky má.
 */
export function urcitHlavni(fotky: Array<{ jeHlavni?: boolean }>): number {
  const oznacena = fotky.findIndex((f) => f.jeHlavni);
  return oznacena === -1 ? 0 : oznacena;
}

/**
 * Hláška u produktu, který má jít do katalogu bez jediné fotky.
 * Vlastní konstanta, protože ji potřebuje POST i PUT a rozejít se nesmí.
 */
export const CHYBI_FOTKA =
  'Zveřejněný produkt musí mít alespoň jednu fotografii – GPSR ji u nabídky na dálku vyžaduje ' +
  '(čl. 19). Přidejte fotku, nebo produkt uložte jako koncept.';

/**
 * Smí produkt do katalogu?
 *
 * Čl. 19 písm. c) GPSR žádá u nabídky na dálku údaje umožňující identifikaci
 * výrobku **„včetně jeho vyobrazení“** – fotka není doplněk, je to zákonná
 * náležitost nabídky. Kontrola nemůže být v `produktSchema`: při editaci se
 * fotky spravují zvlášť (`SpravaFotek`) a prázdné pole v požadavku znamená
 * „žádné nové“, ne „produkt žádné nemá“. Počet existujících proto musí
 * dodat endpoint.
 *
 * Poukaz je vyjmutý ze stejného důvodu jako zbytek GPSR – není to výrobek.
 * Koncept taky: nezveřejněné zboží se nikomu nenabízí.
 */
export function lzeZverejnitBezFotek(p: {
  aktivni: boolean;
  jeDarkovyPoukaz: boolean;
  pocetFotek: number;
}): boolean {
  return !p.aktivni || p.jeDarkovyPoukaz || p.pocetFotek > 0;
}

/** Kolik ze tří údajů o odpovědné osobě je vyplněných – 0, nebo 3, nikdy mezi tím. */
function pocetUdajuOdpovedneOsoby(d: {
  odpovednaOsobaNazev?: string | null;
  odpovednaOsobaAdresa?: string | null;
  odpovednaOsobaEmail?: string | null;
}): number {
  return [d.odpovednaOsobaNazev, d.odpovednaOsobaAdresa, d.odpovednaOsobaEmail].filter((c) => !!c?.trim())
    .length;
}

export const produktSchema = z
  .object({
    nazev: z.string().min(2, 'Název musí mít alespoň 2 znaky.').max(200),
    popis: z.string().min(1, 'Vyplňte popis produktu.').max(20000),
    categoryId: z.string().min(1, 'Vyberte kategorii.'),

    cena: z.coerce
      .number({ invalid_type_error: 'Cena musí být číslo.' })
      .positive('Cena musí být větší než nula.')
      .max(10_000_000),

    cenaPoSleve: z.coerce
      .number({ invalid_type_error: 'Akční cena musí být číslo.' })
      .positive('Akční cena musí být větší než nula.')
      .max(10_000_000)
      .nullable()
      .optional(),

    znacka: z.string().max(120).optional().nullable(),
    material: z.string().max(500).optional().nullable(),
    udrzba: z.string().max(500).optional().nullable(),
    sku: z.string().max(80).optional().nullable(),

    aktivni: z.boolean().optional().default(true),
    doporuceny: z.boolean().optional().default(false),
    jeDarkovyPoukaz: z.boolean().optional().default(false),

    metaTitle: z.string().max(180).optional().nullable(),
    metaDescription: z.string().max(400).optional().nullable(),

    /*
     * GPSR – nařízení (EU) 2023/988, účinné od 13. 12. 2024.
     *
     * Čl. 19 žádá, aby u výrobku nabízeného online byly uvedeny údaje
     * o výrobci a kontakt na něj. Pole jsou tu volitelná na úrovni typu, ale
     * `refine` níž je u běžného zboží vyžaduje – jinak by nový produkt šel
     * uložit bez nich a rovnou by byl v katalogu v rozporu s nařízením.
     */
    vyrobceNazev: z.string().max(200).optional().nullable(),
    vyrobceAdresa: z.string().max(300).optional().nullable(),
    vyrobceEmail: z
      .string()
      .max(200)
      .optional()
      .nullable()
      .refine((v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim()), {
        message: 'Zadejte platný e-mail výrobce.',
      }),

    /**
     * Sídlí výrobce mimo EU? Rozhoduje o povinnosti odpovědné osoby
     * (čl. 19 písm. b GPSR) – viz `refine` níž. Ze země původu se to
     * odvodit nedá, ta popisuje místo výroby, ne sídlo odpovědného subjektu.
     */
    vyrobceMimoEu: z.boolean().optional().default(false),

    odpovednaOsobaNazev: z.string().max(200).optional().nullable(),
    odpovednaOsobaAdresa: z.string().max(300).optional().nullable(),
    odpovednaOsobaEmail: z
      .string()
      .max(200)
      .optional()
      .nullable()
      .refine((v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim()), {
        message: 'Zadejte platný e-mail odpovědné osoby.',
      }),

    bezpecnostniUpozorneni: z.string().max(2000).optional().nullable(),
    ean: z.string().max(60).optional().nullable(),
    cisloSarze: z.string().max(60).optional().nullable(),
    zemePuvodu: z.string().max(120).optional().nullable(),

    /** Nařízení (EU) 1007/2011 – složení v procentech hmotnosti, sestupně. */
    slozeniMaterialu: z.string().max(500).optional().nullable(),

    /**
     * Čl. 12 téhož nařízení. Nepovinné v tom smyslu, že většina kusů živočišné
     * části nemá – ale je to vědomá volba majitelky, ne výchozí pravda. Uvést
     * větu u výrobku, který je nemá, je stejná vada jako zamlčet ji u toho,
     * který je má.
     */
    obsahujeZivocisneCasti: z.boolean().optional().default(false),

    varianty: z.array(variantaSchema).min(1, 'Přidejte alespoň jednu variantu.').max(60),
    fotky: z.array(nahranaFotkaSchema).max(30).optional().default([]),
  })
  .refine((d) => d.cenaPoSleve == null || d.cenaPoSleve < d.cena, {
    message: 'Akční cena musí být nižší než běžná cena.',
    path: ['cenaPoSleve'],
  })
  /*
   * GPSR: výrobce a kontakt na něj jsou u zboží povinné.
   *
   * Dárkový poukaz je vyjmutý – není to výrobek ve smyslu nařízení, nemá
   * výrobce ani bezpečnostní pokyny. Stejná výjimka jako u materiálu a údržby.
   */
  .refine((d) => d.jeDarkovyPoukaz || !!d.vyrobceNazev?.trim(), {
    message: 'Vyplňte výrobce – GPSR ho u nabízeného zboží vyžaduje.',
    path: ['vyrobceNazev'],
  })
  .refine((d) => d.jeDarkovyPoukaz || !!d.vyrobceAdresa?.trim(), {
    message: 'Vyplňte poštovní adresu výrobce – GPSR ji vyžaduje.',
    path: ['vyrobceAdresa'],
  })
  .refine((d) => d.jeDarkovyPoukaz || !!d.vyrobceEmail?.trim(), {
    message: 'Vyplňte kontaktní e-mail výrobce – GPSR ho vyžaduje.',
    path: ['vyrobceEmail'],
  })
  /*
   * Nařízení (EU) 1007/2011: textilní výrobek se nesmí dodávat na trh bez
   * údaje o materiálovém složení. Volný popis v `material`
   * („jemný praný len“) tu povinnost neplní – potřeba jsou procenta.
   */
  .refine((d) => d.jeDarkovyPoukaz || !!d.slozeniMaterialu?.trim(), {
    message: 'Vyplňte materiálové složení v procentech – u textilu je povinné.',
    path: ['slozeniMaterialu'],
  })
  /*
   * Odpovědná osoba v EU (čl. 16 GPSR). Když je vyplněná jen částečně, je to
   * skoro jistě nedopatření – údaj, který na stránce vyjde jako „jméno bez
   * adresy“, povinnost nesplní.
   */
  .refine((d) => pocetUdajuOdpovedneOsoby(d) !== 1 && pocetUdajuOdpovedneOsoby(d) !== 2, {
    message:
      'U odpovědné osoby v EU vyplňte název, adresu i e-mail – nebo nechte všechna tři pole prázdná.',
    path: ['odpovednaOsobaNazev'],
  })
  /*
   * A tohle je ta vlastní povinnost: čl. 19 písm. b) GPSR žádá odpovědnou
   * osobu usazenou v EU vždy, když výrobce v Unii nesídlí. Bez téhle kontroly
   * byla prázdná odpovědná osoba pořád platná odpověď a zboží od
   * mimoevropského dodavatele šlo zveřejnit bez kontaktu, na který se má
   * spotřebitel i dozorový orgán obracet.
   */
  .refine((d) => d.jeDarkovyPoukaz || !d.vyrobceMimoEu || pocetUdajuOdpovedneOsoby(d) === 3, {
    message:
      'Výrobce sídlí mimo EU – vyplňte odpovědnou osobu usazenou v EU (název, adresu i e-mail). Čl. 19 GPSR ji v takovém případě vyžaduje.',
    path: ['odpovednaOsobaNazev'],
  })
  .refine(
    (d) => {
      // Varianty se rozlišují podle velikosti (u poukazu podle částky) –
      // dvě stejné by dělaly nejednoznačný sklad.
      const klice = d.varianty.map((v) => `${v.velikost.trim().toLowerCase()}|${(v.barva ?? '').trim().toLowerCase()}`);
      return new Set(klice).size === klice.length;
    },
    { message: 'Dvě varianty mají stejnou velikost i barvu.', path: ['varianty'] }
  );

export const kategorieSchema = z.object({
  nazev: z.string().min(2, 'Název musí mít alespoň 2 znaky.').max(120),
  popis: z.string().max(2000).optional().nullable(),
  parentId: z.string().cuid().nullable().optional(),
  poradi: z.coerce.number().int().min(0).max(9999).optional().default(0),
});

export type ProduktVstup = z.infer<typeof produktSchema>;
export type VariantaVstup = z.infer<typeof variantaSchema>;
export type KategorieVstup = z.infer<typeof kategorieSchema>;
