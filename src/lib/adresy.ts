/**
 * Uložené adresy zákaznice (sekce 7 zadání).
 *
 * Model `Address` v databázi byl od začátku a administrace adresy zobrazovala,
 * jenže zákaznice neměla jak nějakou založit – pokladna se proto ptala na
 * doručovací údaje při každém nákupu znovu.
 *
 * Adresa v objednávce zůstává **snímkem**, ne odkazem sem: pozdější úprava
 * adresy nesmí přepsat, kam se zboží doopravdy poslalo.
 *
 * Načítání sedí tady, ne v `route.ts` – Next.js kontroluje tvar route
 * handlerů a jiný než povolený export z nich odmítne přeložit.
 */
import type { AddressType, Prisma } from '@prisma/client';
import { db } from './db';

/** Strop na počet adres. Víc než pár jich nikdo nepotřebuje a seznam nemá růst donekonečna. */
export const MAX_ADRES = 20;

export interface AdresaVen {
  id: string;
  jmenoPrijmeni: string;
  ulice: string;
  mesto: string;
  psc: string;
  zeme: string;
  telefon: string | null;
  typ: 'DODACI' | 'FAKTURACNI';
  jeVychozi: boolean;
}

/**
 * Dorovná výchozí adresu daného typu, když po zápisu žádná nezbyla.
 *
 * Volá se po **každé** změně, ne jen při mazání. Původní pojistka se chytala
 * jen tehdy, když měla zákaznice adresu daného typu jedinou – jenže stačilo
 * mít dvě doručovací, u té výchozí odškrtnout „výchozí" a typ zůstal bez ní.
 * Pokladna pak přestala předvyplňovat, přestože adresy uložené byly.
 *
 * Nástupcem je nejstarší adresa typu. `Address` nemá `createdAt`, takže se
 * řadí podle `id`: cuid začíná časovým razítkem, takže vzestupné řazení
 * odpovídá pořadí vzniku.
 */
export async function zajistitVychoziAdresu(
  tx: Prisma.TransactionClient,
  userId: string,
  typ: AddressType
): Promise<void> {
  const maVychozi = await tx.address.count({ where: { userId, typ, jeVychozi: true } });
  if (maVychozi > 0) return;

  const nastupce = await tx.address.findFirst({
    where: { userId, typ },
    orderBy: { id: 'asc' },
    select: { id: true },
  });

  if (nastupce) {
    await tx.address.update({ where: { id: nastupce.id }, data: { jeVychozi: true } });
  }
}

export async function nacistAdresy(userId: string): Promise<AdresaVen[]> {
  const adresy = await db.address.findMany({
    where: { userId },
    // Výchozí adresa nahoře – pokladna z ní předvyplňuje formulář.
    orderBy: [{ jeVychozi: 'desc' }, { typ: 'asc' }, { mesto: 'asc' }],
  });

  return adresy.map((a) => ({
    id: a.id,
    jmenoPrijmeni: a.jmenoPrijmeni,
    ulice: a.ulice,
    mesto: a.mesto,
    psc: a.psc,
    zeme: a.zeme,
    telefon: a.telefon,
    typ: a.typ,
    jeVychozi: a.jeVychozi,
  }));
}
