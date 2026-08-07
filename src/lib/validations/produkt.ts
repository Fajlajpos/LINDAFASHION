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
});

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

    varianty: z.array(variantaSchema).min(1, 'Přidejte alespoň jednu variantu.').max(60),
    fotky: z.array(nahranaFotkaSchema).max(30).optional().default([]),
  })
  .refine((d) => d.cenaPoSleve == null || d.cenaPoSleve < d.cena, {
    message: 'Akční cena musí být nižší než běžná cena.',
    path: ['cenaPoSleve'],
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
