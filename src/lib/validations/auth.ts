import { z } from 'zod';

/**
 * Hlášky jsou česky a rovnou takové, jak je uvidí zákaznice u příslušného pole.
 */

const email = z
  .string()
  .min(1, 'Vyplňte prosím e-mail.')
  .email('Tohle nevypadá jako platný e-mail.')
  .max(180, 'E-mail je příliš dlouhý.')
  .transform((v) => v.toLowerCase().trim());

/** Sekce 10: silnější politika hesla, protože admin má přístup ke všem datům. */
const heslo = z
  .string()
  .min(8, 'Heslo musí mít alespoň 8 znaků.')
  .max(200, 'Heslo je příliš dlouhé.')
  .regex(/[a-zA-Zá-žÁ-Ž]/, 'Heslo musí obsahovat alespoň jedno písmeno.')
  .regex(/[0-9]/, 'Heslo musí obsahovat alespoň jednu číslici.');

export const registraceSchema = z
  .object({
    jmeno: z.string().min(2, 'Vyplňte prosím jméno.').max(120).optional().or(z.literal('')),
    email,
    heslo,
    hesloZnovu: z.string().min(1, 'Zopakujte prosím heslo.'),
    telefon: z.string().max(40).optional().or(z.literal('')),

    // Sekce 5: bez zaškrtnutí nejde registraci dokončit.
    souhlasPodminky: z.literal(true, {
      errorMap: () => ({ message: 'Bez souhlasu s obchodními podmínkami nelze pokračovat.' }),
    }),

    // Sekce 5 + GDPR: samostatný, dobrovolný souhlas – nesmí být schovaný
    // v souhlasu s obchodními podmínkami.
    newsletterSouhlas: z.boolean().optional().default(false),
  })
  .refine((d) => d.heslo === d.hesloZnovu, {
    message: 'Hesla se neshodují.',
    path: ['hesloZnovu'],
  });

export const prihlaseniSchema = z.object({
  email,
  heslo: z.string().min(1, 'Vyplňte prosím heslo.'),
});

export type RegistraceVstup = z.infer<typeof registraceSchema>;
export type PrihlaseniVstup = z.infer<typeof prihlaseniSchema>;
