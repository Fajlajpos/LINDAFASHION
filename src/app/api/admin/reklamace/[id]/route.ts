import { z } from 'zod';
import { db } from '@/lib/db';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { overitAdmina, odpovedNeautorizovano, zapsatDoAuditu } from '@/lib/admin';
import { FRONTY, publishJob } from '@/lib/queue';

export const dynamic = 'force-dynamic';

/** Stavy, ze kterých už není cesta zpět – vyřízená reklamace se znovu nevyřizuje. */
const FINALNI = ['VYRIZENA_UZNANA', 'VYRIZENA_ZAMITNUTA'] as const;
type FinalniStav = (typeof FINALNI)[number];

function jeFinalni(stav: string): stav is FinalniStav {
  return (FINALNI as readonly string[]).includes(stav);
}

const schema = z.object({
  stav: z.enum(['PRIJATA', 'RESI_SE', 'VYRIZENA_UZNANA', 'VYRIZENA_ZAMITNUTA']),
  poznamkaAdmina: z
    .string()
    .max(2000)
    .optional()
    .nullable()
    .transform((v) => (v?.trim() ? v.trim() : null)),
});

/**
 * PATCH /api/admin/reklamace/[id] – změna stavu reklamace či vrácení.
 *
 * Sekce 6.10: uznané **vrácení** automaticky vrátí kusy zpátky na sklad
 * a u vrácení celé objednávky přepne její stav na VRACENA. Majitelka to
 * nemá dopočítávat ručně.
 *
 * Uznaná *reklamace* sklad nezvyšuje – vadný kus se zpátky do prodeje nevrací.
 *
 * Uznané vrácení **celé** objednávky navíc vrací i to, co si objednávka
 * ukrojila mimo sklad: použití slevového kódu a částku strženou z dárkového
 * poukazu. Do téhle chvíle to uměla jen storna – vrácení nechávalo kód
 * vyčerpaný a peníze z poukazu propadly, přestože zboží přišlo zpátky.
 * U vrácení **jedné položky** se nic z toho neděje: objednávka dál platí.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await overitAdmina();
    if (!admin) return odpovedNeautorizovano();
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const vstup = schema.parse(await request.json());

    const reklamace = await db.reklamace.findUnique({
      where: { id: params.id },
      include: {
        order: { include: { items: true } },
        orderItem: true,
      },
    });

    if (!reklamace) return odpovedChyba('Záznam nebyl nalezen.', 404);

    /*
     * Reklamace může nést položku z úplně jiné objednávky – `orderItemId`
     * je jen cizí klíč na OrderItem, nic ho k `orderId` neváže. Vrácení by
     * pak zvýšilo sklad o zboží, které nikdo neposlal zpátky.
     */
    if (reklamace.orderItem && reklamace.orderItem.orderId !== reklamace.orderId) {
      return odpovedChyba(
        'Záznam odkazuje na položku z jiné objednávky. Založte prosím reklamaci znovu.',
        409
      );
    }

    // Uznané vrácení vrací zboží na sklad; uznaná reklamace ne.
    const chceVratitNaSklad = vstup.stav === 'VYRIZENA_UZNANA' && reklamace.typ === 'VRACENI';

    // `orderItemId` je null = vrací se celá objednávka.
    const celaObjednavka = reklamace.orderItem === null;

    const vysledek = await db.$transaction(async (tx) => {
      /*
       * Přechod do konečného stavu je zároveň zámek: podmínka je součástí
       * UPDATE, ne kontroly nad ním.
       *
       * Dvojklik na „Uznat" jinak poslal dva požadavky, oba přečetly stav
       * PRIJATA ještě před transakcí, oba prošly a sklad se navýšil dvakrát.
       * Je to tentýž závod, jaký se už řešil u storna objednávky – jen tady
       * zboží přibývá místo aby ubývalo.
       */
      const data = {
        stav: vstup.stav,
        poznamkaAdmina: vstup.poznamkaAdmina,
        datumVyrizeni: jeFinalni(vstup.stav) ? new Date() : null,
      };

      const zmeneno = await tx.reklamace.updateMany({
        where: jeFinalni(vstup.stav)
          ? { id: params.id, stav: { notIn: [...FINALNI] } }
          : { id: params.id },
        data,
      });

      if (zmeneno.count !== 1) return 'kolize' as const;

      if (!chceVratitNaSklad) return 'ok' as const;

      /*
       * Kusy, které už vrátila jiná **uznaná** žádost, se nepřičítají znovu.
       *
       * U vrácení celé objednávky se jinak projedou všechny `order.items` —
       * včetně toho, který zákaznice vrátila minulý týden samostatně a který
       * se tehdy na sklad vrátil. Jeden fyzický kus by se tak započítal
       * dvakrát a e-shop by nabízel zboží, které nemá.
       *
       * Nestačí to hlídat ve formuláři (`najitProOdstoupeni`): `/api/admin/reklamace`
       * umí založit vrácení celé objednávky i po uznaném částečném, takže se
       * sem dá dojít bez jediného kliknutí zákaznice. Podmínka patří k zápisu,
       * ne k tomu, kdo ho vyvolal.
       */
      const jizVracene = celaObjednavka
        ? await tx.reklamace.findMany({
            where: {
              orderId: reklamace.orderId,
              typ: 'VRACENI',
              stav: 'VYRIZENA_UZNANA',
              orderItemId: { not: null },
              NOT: { id: params.id },
            },
            select: { orderItemId: true },
          })
        : [];

      const jizVraceneId = new Set(jizVracene.map((r) => r.orderItemId));

      const polozky = (
        reklamace.orderItem ? [reklamace.orderItem] : reklamace.order.items
      ).filter((p) => !jizVraceneId.has(p.id));

      if (celaObjednavka) {
        /*
         * Objednávka, kterou už někdo zrušil, má zboží zpátky na skladě ze
         * storna – druhé navýšení by ho zdvojilo. Podmínka je proto zase
         * uvnitř UPDATE, ne vedle něj.
         */
        const objednavkaZmenena = await tx.order.updateMany({
          where: { id: reklamace.orderId, stav: { notIn: ['ZRUSENA', 'VRACENA'] } },
          data: { stav: 'VRACENA' },
        });

        if (objednavkaZmenena.count !== 1) return 'objednavka-uz-vracena' as const;
      }

      for (const polozka of polozky) {
        await tx.productVariant.update({
          where: { id: polozka.variantId },
          data: { skladem: { increment: polozka.mnozstvi } },
        });
      }

      if (celaObjednavka) {
        // Slevový kód objednávka spotřebovala z limitu – vrácením ho uvolníme.
        if (reklamace.order.discountCodeId) {
          await tx.discountCode.update({
            where: { id: reklamace.order.discountCodeId },
            data: { pocetPouziti: { decrement: 1 } },
          });
        }

        // Peníze stržené z poukazu patří zpátky na poukaz, ne do ztracena.
        if (reklamace.order.giftCardId && reklamace.order.castkaZGiftCard) {
          await tx.giftCard.update({
            where: { id: reklamace.order.giftCardId },
            data: {
              zustatek: { increment: reklamace.order.castkaZGiftCard },
              aktivni: true,
            },
          });
        }
      }

      return 'vraceno' as const;
    });

    if (vysledek === 'kolize') {
      return odpovedChyba(
        'Tento záznam už mezitím někdo vyřídil. Načtěte prosím stránku znovu.',
        409
      );
    }

    if (vysledek === 'objednavka-uz-vracena') {
      return odpovedChyba(
        'Objednávka je už zrušená nebo vrácená – zboží se na sklad vrátilo dřív. Zkontrolujte prosím stav objednávky.',
        409
      );
    }

    const vracenoNaSklad = vysledek === 'vraceno';

    /*
     * --- Vyrozumění zákaznice (§ 19 odst. 3 zák. č. 634/1992 Sb.) ---
     *
     * Zákon dává třicet dnů na vyřízení **a na vyrozumění**; marným uplynutím
     * vzniká právo odstoupit od smlouvy. Administrace přitom stav jen přepnula
     * a nikam nic neposílala. Přihlášená zákaznice si výsledek našla v účtu,
     * ale reklamovat smí i ta bez registrace – a ta neměla jak zjistit vůbec
     * nic. Lhůta běžela a odpověď se k ní nedostala.
     *
     * Posílá se jen u konečného stavu: „řeší se" není výsledek a zpráva o něm
     * by byla šum, který zákaznice po třetím e-mailu přestane číst.
     *
     * `reklamace.email` je první v pořadí – nese ho i objednávka bez účtu.
     */
    if (jeFinalni(vstup.stav)) {
      const kontakt = reklamace.email ?? reklamace.order.email ?? null;

      if (kontakt) {
        await publishJob(FRONTY.ODESLAT_EMAIL, {
          typ: 'reklamace-vyrizena',
          to: kontakt,
          subject: `${reklamace.typ === 'VRACENI' ? 'Vrácení' : 'Reklamace'} k objednávce ${reklamace.order.cisloObjednavky} – vyřízeno`,
          data: {
            cisloObjednavky: reklamace.order.cisloObjednavky,
            typ: reklamace.typ,
            stav: vstup.stav,
            poznamka: vstup.poznamkaAdmina,
            /* Klíč k `/reklamace/stav`. Bez něj vede odkaz v e-mailu jen na
               vyhledávací formulář a zákaznice musí znovu opisovat číslo
               objednávky s e-mailem. */
            token: reklamace.token,
          },
        });
      }
    }

    await zapsatDoAuditu(admin.email, 'reklamace.vyrizena', 'Reklamace', params.id, {
      nazev: reklamace.order.cisloObjednavky,
      stav: vstup.stav,
      vracenoNaSklad,
      celaObjednavka: vracenoNaSklad ? celaObjednavka : undefined,
    });

    return odpovedOk({ upraveno: true, vracenoNaSklad });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
