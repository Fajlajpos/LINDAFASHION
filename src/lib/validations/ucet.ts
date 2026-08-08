/**
 * Validace pro samoobsluhu zákaznického účtu.
 *
 * Do téhle chvíle uměl účet jen dvě věci: vypsat objednávky a smazat se.
 * Změnit si jméno, heslo nebo uložit adresu nešlo – model `Address` sice
 * existoval a administrace ho zobrazovala, ale zákaznice do něj neměla jak
 * zapsat a pokladna se proto ptala na adresu při každém nákupu znovu.
 *
 * Hlášky jsou česky a rovnou takové, jak je uvidí u příslušného pole.
 */
import { z } from 'zod';

/** Stejná politika jako u registrace – heslo se nesmí jinde měnit volněji. */
export const hesloSchema = z
  .string()
  .min(8, 'Heslo musí mít alespoň 8 znaků.')
  .max(200, 'Heslo je příliš dlouhé.')
  .regex(/[a-zA-Zá-žÁ-Ž]/, 'Heslo musí obsahovat alespoň jedno písmeno.')
  .regex(/[0-9]/, 'Heslo musí obsahovat alespoň jednu číslici.');

/** PSČ zapisují lidé s mezerou i bez ní – stejně jako v pokladně. */
const psc = z
  .string()
  .min(1, 'Vyplňte PSČ.')
  .transform((v) => v.replace(/\s+/g, ''))
  .refine((v) => /^\d{5}$/.test(v), { message: 'PSČ má mít pět číslic.' });

const nepovinnyText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v?.trim() ? v.trim() : null));

/**
 * Úprava profilu.
 *
 * E-mail tu schválně **není**. Je to přihlašovací jméno i adresa, na kterou
 * chodí doklady, takže jeho změna potřebuje ověření nové schránky – a to bez
 * funkčního odesílání e-mailů udělat nejde. Kdyby šel změnit rovnou, stačilo
 * by pár vteřin u odemčeného prohlížeče k převzetí účtu.
 */
export const profilSchema = z.object({
  jmeno: nepovinnyText(120),
  telefon: nepovinnyText(40),
  newsletterSouhlas: z.boolean().optional(),
});

export const zmenaHeslaSchema = z
  .object({
    // Staré heslo se vyžaduje i u přihlášené zákaznice: bez něj by změnu
    // hesla provedl kdokoliv, kdo se dostane k odemčenému prohlížeči.
    stareHeslo: z.string().min(1, 'Zadejte prosím stávající heslo.'),
    heslo: hesloSchema,
    hesloZnovu: z.string().min(1, 'Zopakujte prosím nové heslo.'),
  })
  .refine((d) => d.heslo === d.hesloZnovu, {
    message: 'Hesla se neshodují.',
    path: ['hesloZnovu'],
  })
  .refine((d) => d.heslo !== d.stareHeslo, {
    message: 'Nové heslo musí být jiné než stávající.',
    path: ['heslo'],
  });

export const adresaSchema = z.object({
  jmenoPrijmeni: z.string().min(3, 'Vyplňte jméno a příjmení.').max(150).transform((v) => v.trim()),
  ulice: z.string().min(2, 'Vyplňte ulici a číslo popisné.').max(200).transform((v) => v.trim()),
  mesto: z.string().min(2, 'Vyplňte město.').max(120).transform((v) => v.trim()),
  psc,
  zeme: z.string().length(2, 'Kód země má dvě písmena.').optional().default('CZ'),
  telefon: nepovinnyText(40),
  typ: z.enum(['DODACI', 'FAKTURACNI'], {
    errorMap: () => ({ message: 'Vyberte, k čemu adresa slouží.' }),
  }),
  jeVychozi: z.boolean().optional().default(false),
});

/**
 * Reklamace nebo vrácení podané zákaznicí.
 *
 * `orderItemId` prázdné = týká se celé objednávky. Konkrétní položka se
 * ověřuje proti objednávce až v endpointu – schéma o cizích klíčích nic neví.
 */
export const reklamaceSchema = z.object({
  orderId: z.string().min(1, 'Vyberte objednávku.'),
  orderItemId: z.string().min(1).optional().nullable(),
  typ: z.enum(['REKLAMACE', 'VRACENI'], {
    errorMap: () => ({ message: 'Vyberte, jestli jde o reklamaci, nebo o vrácení.' }),
  }),
  duvod: z
    .string()
    .min(10, 'Popište prosím alespoň pár větami, co se stalo.')
    .max(2000, 'Popis je příliš dlouhý.')
    .transform((v) => v.trim()),
});

export type ProfilVstup = z.infer<typeof profilSchema>;
export type ZmenaHeslaVstup = z.infer<typeof zmenaHeslaSchema>;
export type AdresaVstup = z.infer<typeof adresaSchema>;
export type ReklamaceVstup = z.infer<typeof reklamaceSchema>;
