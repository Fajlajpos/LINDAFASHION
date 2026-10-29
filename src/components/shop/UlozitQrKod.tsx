'use client';

import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

/**
 * Uložení QR kódu platby do telefonu.
 *
 * Obyčejný odkaz s `download` na iPhonu obrázek stáhl do Souborů, odkud ho
 * bankovní aplikace nenačte – chtěla ho z Fotek. Systémové menu sdílení
 * (`navigator.share` se souborem) nabídne „Uložit obrázek" i rovnou poslání
 * dál. Kde ho prohlížeč neumí (počítač), zůstane odkaz ke stažení.
 *
 * Soubor se připraví už po načtení, ne až po kliknutí: Safari pustí sdílení
 * jen přímo z kliknutí, a čekání na převod `data:` adresy by ho o to připravilo.
 */
export function UlozitQrKod({ png, nazevSouboru }: { png: string; nazevSouboru: string }) {
  const [soubor, setSoubor] = useState<File | null>(null);

  useEffect(() => {
    let zruseno = false;

    fetch(png)
      .then((odpoved) => odpoved.blob())
      .then((blob) => {
        const f = new File([blob], nazevSouboru, { type: 'image/png' });
        if (!zruseno && navigator.canShare?.({ files: [f] })) setSoubor(f);
      })
      .catch(() => {
        // Bez sdílení zůstane odkaz ke stažení – nic víc není potřeba.
      });

    return () => {
      zruseno = true;
    };
  }, [png, nazevSouboru]);

  const sdilet = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!soubor) return; // výchozí chování odkazu = stažení
    e.preventDefault();
    navigator.share({ files: [soubor], title: 'QR kód k platbě' }).catch(() => {
      // Zavřené menu (AbortError) není chyba.
    });
  };

  return (
    <a
      href={png}
      download={nazevSouboru}
      onClick={sdilet}
      className="flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-linda-cream px-5 text-xs font-semibold text-linda-espresso shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
    >
      <Download className="h-4 w-4 text-linda-cognac" aria-hidden="true" />
      Uložit QR kód
    </a>
  );
}
