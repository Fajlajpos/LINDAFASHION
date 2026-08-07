import { z } from 'zod';

/** PSČ zapisují lidé s mezerou i bez ní. */
const psc = z
  .string()
  .min(1, 'Vyplňte PSČ.')
  .transform((v) => v.replace(/\s+/g, ''))
  .refine((v) => /^\d{5}$/.test(v), { message: 'PSČ má mít pět číslic.' });

const telefon = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v?.trim() ? v.trim().replace(/\s+/g, ' ') : null));

export const polozkaObjednavkySchema = z.object({
  variantId: z.string().min(1),
  mnozstvi: z.coerce.number().int().min(1).max(99),
});

export const objednavkaSchema = z.object({
  polozky: z.array(polozkaObjednavkySchema).min(1, 'Košík je prázdný.').max(100),

  // Guest checkout (sekce 14) – e-mail je povinný i bez účtu, jinak nemáme
  // kam poslat potvrzení objednávky.
  email: z
    .string()
    .min(1, 'Vyplňte e-mail.')
    .email('Tohle nevypadá jako platný e-mail.')
    .transform((v) => v.toLowerCase().trim()),

  dodaciJmenoPrijmeni: z.string().min(3, 'Vyplňte jméno a příjmení.').max(150),
  dodaciUlice: z.string().min(2, 'Vyplňte ulici a číslo popisné.').max(200),
  dodaciMesto: z.string().min(2, 'Vyplňte město.').max(120),
  dodaciPsc: psc,
  dodaciZeme: z.string().max(2).optional().default('CZ'),
  dodaciTelefon: telefon,

  zpusobDopravy: z.enum(['zasilkovna', 'ppl', 'ceska_posta'], {
    errorMap: () => ({ message: 'Vyberte způsob dopravy.' }),
  }),
  vydejniMistoId: z.string().max(120).optional().nullable(),
  vydejniMistoNazev: z.string().max(300).optional().nullable(),

  // Dobírka se schválně nenabízí vůbec (sekce 8). GoPay se přidá, až budou klíče.
  zpusobPlatby: z.enum(['bankovni_prevod', 'gopay'], {
    errorMap: () => ({ message: 'Vyberte způsob platby.' }),
  }),

  slevovyKod: z
    .string()
    .max(60)
    .optional()
    .nullable()
    .transform((v) => (v?.trim() ? v.trim().toUpperCase() : null)),

  darkovyPoukaz: z
    .string()
    .max(60)
    .optional()
    .nullable()
    .transform((v) => (v?.trim() ? v.trim().toUpperCase() : null)),

  poznamka: z.string().max(1000).optional().nullable(),

  // Sekce 5: bez zaškrtnutí nejde objednávku dokončit.
  souhlasPodminky: z.literal(true, {
    errorMap: () => ({ message: 'Bez souhlasu s obchodními podmínkami nelze objednávku dokončit.' }),
  }),
});

export type ObjednavkaVstup = z.infer<typeof objednavkaSchema>;

/** Zásilkovna vyžaduje výběr výdejního místa – ostatní dopravci ne. */
export function vyzadujeVydejniMisto(zpusob: string): boolean {
  return zpusob === 'zasilkovna';
}
