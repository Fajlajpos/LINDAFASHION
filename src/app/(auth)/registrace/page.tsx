import React from 'react';
import { siteKey } from '@/lib/captcha';
import { RegistraceFormular } from './RegistraceFormular';

/**
 * Stránka je serverová jen kvůli jedné věci: `siteKey()` čte `process.env`,
 * a to z klientské komponenty nejde. Formulář samotný zůstal beze změny
 * v `RegistraceFormular` – stejné rozdělení jako u kontaktního formuláře.
 *
 * `force-dynamic` je tu **nutnost, ne opatrnost**. Bez něj Next stránku
 * předgeneruje při buildu, kdy `TURNSTILE_SITE_KEY` ještě neexistuje – klíč
 * by se zamrazil jako `null` a captcha by se na registraci nevykreslila
 * nikdy, ani po vyplnění `.env`. Serverové ověření by přitom po doplnění
 * klíčů začalo tokeny vyžadovat, takže by registrace přestala jít dokončit.
 * Ověřeno: bez tohohle řádku měla `/registrace` nula výskytů widgetu,
 * zatímco `/kontakt` (který `force-dynamic` má) je měl.
 */
export const dynamic = 'force-dynamic';

export default function RegistracePage() {
  return <RegistraceFormular captchaSiteKey={siteKey()} />;
}
