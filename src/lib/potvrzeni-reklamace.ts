/**
 * Potvrzení o uplatnění reklamace pro zákaznici.
 *
 * § 19 odst. 1 zák. č. 634/1992 Sb. ukládá vydat spotřebitelce písemné
 * potvrzení: kdy reklamaci uplatnila, co reklamuje a jak se vyřídí. Do téhle
 * chvíle se reklamace jen zapsala a upozornila se majitelka – zákaznice
 * odcházela s poděkováním na obrazovce, které za měsíc nic nedokazuje.
 *
 * Volají ho **obě** cesty, kudy reklamace vzniká: zákaznický formulář
 * i administrace. Ta druhá je podle všeho častější – reklamace chodí
 * telefonem a na prodejnu a majitelka je zapisuje sama – a povinnost vydat
 * potvrzení platí stejně. Jedna funkce místo dvou kopií, protože dvě kopie
 * se rozejdou a jedna z cest pak potvrzení tiše přestane posílat.
 */
import { db } from './db';
import { FRONTY, publishJob } from './queue';

export interface PodkladPotvrzeni {
  reklamaceId: string;
  /** Klíč k veřejné stránce stavu reklamace. */
  token: string;
  email: string | null;
  cisloObjednavky: string;
  /** Popis reklamovaného kusu, nebo `null` u celé objednávky. */
  polozka: string | null;
  duvod: string | null;
  /** Způsob vyřízení, který zákaznice požaduje – součást potvrzení podle § 19. */
  pozadovanyZpusob: string | null;
  prijato: Date;
  lhutaDo: Date | null;
  adresaProVraceni: string | null;
}

/**
 * Zařadí potvrzení do fronty a poznamená si to u reklamace.
 *
 * `potvrzeniOdeslanoAt` se zapisuje **až po** úspěšném zařazení, stejně jako
 * u odstoupení od smlouvy: zapsat ho předem by označilo za potvrzené něco,
 * co zákaznice nikdy nedostala, a nikdo by nepoznal, že je potřeba to dohnat.
 *
 * Bez e-mailu se nic neposílá – odpovídá se pak telefonem – ale reklamace
 * se kvůli tomu odmítnout nesmí.
 */
export async function poslatPotvrzeniReklamace(podklad: PodkladPotvrzeni): Promise<boolean> {
  if (!podklad.email) return false;

  const idUlohy = await publishJob(FRONTY.ODESLAT_EMAIL, {
    typ: 'reklamace-prijata',
    to: podklad.email,
    subject: `Potvrzení reklamace – objednávka ${podklad.cisloObjednavky}`,
    data: {
      cisloObjednavky: podklad.cisloObjednavky,
      token: podklad.token,
      polozka: podklad.polozka,
      duvod: podklad.duvod,
      pozadovanyZpusob: podklad.pozadovanyZpusob,
      prijatoAt: podklad.prijato.toISOString(),
      lhutaDo: podklad.lhutaDo ? podklad.lhutaDo.toISOString() : null,
      adresaProVraceni: podklad.adresaProVraceni,
    },
  });

  if (!idUlohy) return false;

  await db.reklamace.update({
    where: { id: podklad.reklamaceId },
    data: { potvrzeniOdeslanoAt: new Date() },
  });

  return true;
}

/** „Hedvábné šaty Bellissima (L)" pro řádek v potvrzení. */
export async function popisPolozky(orderItemId: string | null): Promise<string | null> {
  if (!orderItemId) return null;

  const polozka = await db.orderItem.findUnique({
    where: { id: orderItemId },
    select: { variant: { select: { velikost: true, product: { select: { nazev: true } } } } },
  });

  if (!polozka) return null;

  return `${polozka.variant.product.nazev} (${polozka.variant.velikost})`;
}
