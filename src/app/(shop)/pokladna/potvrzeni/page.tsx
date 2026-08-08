import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { CheckCircle, FileText, Package, QrCode, Truck } from 'lucide-react';
import { db } from '@/lib/db';
import { nacistNastaveni } from '@/lib/nastaveni';
import { generateQrPaymentString, getQrPaymentImageUrl } from '@/lib/qr-code';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Objednávka přijata | LINDA FASHION',
  robots: { index: false, follow: false },
};

const NAZVY_DOPRAVY: Record<string, string> = {
  zasilkovna: 'Zásilkovna',
  ppl: 'PPL',
  ceska_posta: 'Česká pošta',
};

interface Props {
  searchParams: { t?: string };
}

/**
 * Poděkování a platební údaje.
 *
 * Data se čtou z databáze, ne z query parametrů – dřív se sem částka i číslo
 * objednávky předávaly v URL, takže si je šlo libovolně přepsat.
 *
 * Objednávka se hledá podle náhodného `verejnyToken`, ne podle čísla. Čísla
 * jdou po sobě (`2026-00001`, `-00002`, …), takže s nimi v adrese šlo procházet
 * cizí objednávky – včetně jména, adresy a nákupu. Token musí projít i bez
 * přihlášení, protože nakupovat lze bez registrace.
 */
export default async function PotvrzeniPage({ searchParams }: Props) {
  const token = searchParams.t?.trim();
  if (!token) notFound();

  const objednavka = await db.order.findUnique({
    where: { verejnyToken: token },
    include: {
      items: { include: { variant: { include: { product: { select: { nazev: true } } } } } },
    },
  });

  if (!objednavka) notFound();

  const nastaveni = await nacistNastaveni();

  const celkem = Number(objednavka.celkovaCena);
  const zPoukazu = objednavka.castkaZGiftCard === null ? 0 : Number(objednavka.castkaZGiftCard);
  const kUhrade = celkem - zPoukazu;

  const iban = process.env.BANK_IBAN ?? '';
  const cisloUctu = process.env.BANK_ACCOUNT_NUMBER ?? '';
  const variabilniSymbol = objednavka.cisloObjednavky.replace(/\D/g, '');

  // QR platba dává smysl jen u převodu, který ještě není uhrazený.
  const zobrazitQr =
    objednavka.zpusobPlatby === 'bankovni_prevod' && kUhrade > 0 && Boolean(iban);

  const qrUrl = zobrazitQr
    ? getQrPaymentImageUrl(
        generateQrPaymentString({
          iban,
          amount: kUhrade,
          variableSymbol: variabilniSymbol,
          message: `Objednavka ${objednavka.cisloObjednavky}`,
        })
      )
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-16 sm:px-6">
      <div className="space-y-3 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-linda-sageLight">
          <CheckCircle className="h-8 w-8 text-linda-sage" aria-hidden="true" />
        </span>
        <h1 className="font-serif text-4xl text-linda-espresso">Děkujeme za objednávku</h1>
        <p className="text-sm text-linda-espresso/85">
          Potvrzení jsme vám poslali e-mailem. Objednávka má číslo{' '}
          <strong className="text-linda-cognac">{objednavka.cisloObjednavky}</strong>.
        </p>
      </div>

      {/* Platební údaje */}
      {kUhrade > 0 && objednavka.zpusobPlatby === 'bankovni_prevod' && (
        <section className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu sm:p-8">
          <h2 className="flex items-center gap-2 font-serif text-2xl text-linda-espresso">
            <QrCode className="h-5 w-5 text-linda-cognac" aria-hidden="true" />
            Zaplaťte převodem
          </h2>

          <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-2">
            <dl className="space-y-2 rounded-xl bg-linda-sandLight p-4 text-xs shadow-neuInsetSm">
              <div className="flex justify-between gap-3">
                <dt className="text-linda-espresso/75">Číslo účtu</dt>
                <dd className="font-semibold text-linda-espresso">{cisloUctu || '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-linda-espresso/75">Variabilní symbol</dt>
                <dd className="font-semibold text-linda-espresso">{variabilniSymbol}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-linda-sand/60 pt-2">
                <dt className="text-linda-espresso/75">Částka</dt>
                <dd className="text-base font-semibold text-linda-cognac">
                  {kUhrade.toLocaleString('cs-CZ')} Kč
                </dd>
              </div>
            </dl>

            {qrUrl ? (
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-xl bg-white p-3 shadow-neuSm">
                  <Image
                    src={qrUrl}
                    alt={`QR kód pro platbu ${kUhrade} Kč, variabilní symbol ${variabilniSymbol}`}
                    width={200}
                    height={200}
                    unoptimized
                  />
                </div>
                <p className="text-center text-[11px] text-linda-espresso/70">
                  Naskenujte v bankovní aplikaci
                </p>
              </div>
            ) : (
              <p className="rounded-xl bg-linda-sandLight p-4 text-[11px] text-linda-espresso/75 shadow-neuInsetSm">
                QR platbu zobrazíme, jakmile budou doplněné bankovní údaje.
              </p>
            )}
          </div>

          <p className="text-[11px] text-linda-espresso/70">
            Zásilku odešleme, jakmile platba dorazí na účet. Obvykle do jednoho pracovního dne.
          </p>
        </section>
      )}

      {zPoukazu > 0 && (
        <p className="rounded-xl bg-linda-sageLight p-4 text-xs font-medium text-linda-sage">
          Z objednávky bylo {zPoukazu.toLocaleString('cs-CZ')} Kč uhrazeno dárkovým poukazem.
          {kUhrade === 0 && ' Objednávka je tím plně zaplacená.'}
        </p>
      )}

      {/* Shrnutí */}
      <section className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu sm:p-8">
        <h2 className="flex items-center gap-2 font-serif text-2xl text-linda-espresso">
          <Package className="h-5 w-5 text-linda-cognac" aria-hidden="true" />
          Co jste si objednali
        </h2>

        <ul className="space-y-2 text-xs">
          {objednavka.items.map((polozka) => (
            <li key={polozka.id} className="flex justify-between gap-3 border-b border-linda-sand/40 py-2">
              <span className="text-linda-espresso">
                {polozka.variant.product.nazev}
                <span className="text-linda-espresso/70">
                  {' '}
                  · {polozka.variant.velikost} · {polozka.mnozstvi} ks
                </span>
              </span>
              <span className="shrink-0 font-semibold text-linda-espresso">
                {(Number(polozka.cenaVDobeNakupu) * polozka.mnozstvi).toLocaleString('cs-CZ')} Kč
              </span>
            </li>
          ))}
        </ul>

        <div className="flex justify-between text-sm font-semibold text-linda-espresso">
          <span>Celkem</span>
          <span>{celkem.toLocaleString('cs-CZ')} Kč</span>
        </div>

        <p className="flex items-start gap-2 rounded-xl bg-linda-sandLight p-4 text-xs text-linda-espresso/85 shadow-neuInsetSm">
          <Truck className="mt-px h-4 w-4 shrink-0 text-linda-cognac" aria-hidden="true" />
          <span>
            {NAZVY_DOPRAVY[objednavka.zpusobDopravy] ?? objednavka.zpusobDopravy}
            {objednavka.vydejniMistoNazev && ` · ${objednavka.vydejniMistoNazev}`}
            <br />
            {objednavka.dodaciJmenoPrijmeni}, {objednavka.dodaciUlice}, {objednavka.dodaciPsc}{' '}
            {objednavka.dodaciMesto}
          </span>
        </p>
      </section>

      {/* Zákonné poučení – u zásilkového prodeje povinné (sekce 11) */}
      <p className="rounded-xl bg-linda-sandLight p-4 text-[11px] leading-relaxed text-linda-espresso/75 shadow-neuInsetSm">
        Od smlouvy můžete odstoupit do 14 dnů od převzetí zboží bez udání důvodu. Postup i vzorový
        formulář najdete v{' '}
        <Link href="/obchodni-podminky" className="font-semibold text-linda-cognac underline">
          obchodních podmínkách
        </Link>
        . Reklamace řeší{' '}
        <Link href="/reklamacni-rad" className="font-semibold text-linda-cognac underline">
          reklamační řád
        </Link>
        .
        {nastaveni.emailFirmy && (
          <>
            {' '}
            S čímkoliv se ozvěte na{' '}
            <a href={`mailto:${nastaveni.emailFirmy}`} className="font-semibold text-linda-cognac underline">
              {nastaveni.emailFirmy}
            </a>
            .
          </>
        )}
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        {/* Doklad vzniká ve workeru na pozadí – odkaz vrátí 404 jen v těch
            pár vteřinách, než se PDF stihne vygenerovat. */}
        <a
          href={`/api/faktura/${objednavka.verejnyToken}`}
          className="flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-linda-cream px-6 text-xs font-semibold text-linda-espresso shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
        >
          <FileText className="h-4 w-4 text-linda-cognac" aria-hidden="true" />
          Stáhnout doklad (PDF)
        </a>
        <Link
          href="/produkty"
          className="flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
        >
          Pokračovat v nákupu
        </Link>
        <Link
          href="/muj-ucet"
          className="flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cream px-6 text-xs font-semibold text-linda-espresso shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
        >
          Moje objednávky
        </Link>
      </div>
    </div>
  );
}
