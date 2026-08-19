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

    // § 435 o. z. – údaj o zápisu v rejstříku patří na obchodní listiny i na web.
    zapisVRejstriku: volitelnyText(300),

    /*
     * Sazba DPH. Neomezuje se na výčet platných sazeb schválně – sazby mění
     * zákon a pevný seznam v kódu je přesně ten kus, na který se při novele
     * zapomene. Rozsah 0–99 stačí jako pojistka proti překlepu.
     */
    sazbaDph: z.coerce.number().int().min(0).max(99).optional().default(21),

    adresaProVraceni: volitelnyText(300),
    emailProGdpr: volitelnyText(180),

    /*
     * Doba dodání v pracovních dnech (§ 1820 odst. 1 písm. h o. z.).
     * Minimum je 1: nula by na webu slíbila odeslání „do 0 dnů", což není
     * informace, ale nesplnitelný závazek.
     */
    dodaciLhutaDnu: z.coerce.number().int().min(1).max(90).optional().default(3),

    /*
     * Verze obchodních podmínek. Prázdná být nesmí: zapisuje se ke každé
     * objednávce jako součást dokladu a prázdný snímek nedokládá nic.
     */
    verzePodminek: z
      .string()
      .min(1, 'Vyplňte verzi obchodních podmínek.')
      .max(60)
      .optional()
      .default('1')
      .transform((v) => v.trim()),
  })
  .refine((d) => !d.rezimDovolene || d.datumNavratu !== null, {
    message: 'U zapnuté dovolené vyplňte datum návratu – zákaznice se podle něj řídí.',
    path: ['datumNavratu'],
  });

export type NastaveniVstup = z.infer<typeof nastaveniSchema>;
