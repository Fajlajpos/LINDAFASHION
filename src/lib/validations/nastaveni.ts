import { z } from 'zod';

/** Prázdný text z formuláře znamená „nevyplněno", tedy null v databázi. */
const volitelnyText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v?.trim() ? v.trim() : null));

const volitelnaCena = z
  .union([z.coerce.number().min(0).max(100000), z.literal(''), z.null()])
  .optional()
  .transform((v) => (v === '' || v === null || v === undefined ? null : Number(v)));

const volitelnaUrl = z
  .string()
  .max(300)
  .optional()
  .nullable()
  .transform((v) => (v?.trim() ? v.trim() : null))
  .refine((v) => v === null || /^https?:\/\//i.test(v), {
    message: 'Odkaz musí začínat http:// nebo https://',
  });

export const nastaveniSchema = z
  .object({
    // Režim dovolené (sekce 6.7)
    rezimDovolene: z.boolean().optional().default(false),
    datumNavratu: z
      .union([z.string(), z.null()])
      .optional()
      .transform((v) => (v ? new Date(v) : null))
      .refine((d) => d === null || !Number.isNaN(d.getTime()), { message: 'Neplatné datum návratu.' }),
    zpravaProZakazniky: volitelnyText(500),
    zablokovatObjednavky: z.boolean().optional().default(false),

    // Firemní údaje (sekce 6.8)
    nazevFirmy: volitelnyText(200),
    icoFirmy: volitelnyText(20),
    dicFirmy: volitelnyText(20),
    adresaFirmy: volitelnyText(300),
    telefonFirmy: volitelnyText(40),
    emailFirmy: volitelnyText(180),
    jePlatceDph: z.boolean().optional().default(false),

    socialInstagram: volitelnaUrl,
    socialFacebook: volitelnaUrl,

    cenaDopravyZasilkovna: volitelnaCena,
    cenaDopravyPPL: volitelnaCena,
    cenaDopravyCeskaPosta: volitelnaCena,
    prahDopravaZdarma: volitelnaCena,
  })
  .refine((d) => !d.rezimDovolene || d.datumNavratu !== null, {
    message: 'U zapnuté dovolené vyplňte datum návratu – zákaznice se podle něj řídí.',
    path: ['datumNavratu'],
  });

export type NastaveniVstup = z.infer<typeof nastaveniSchema>;
