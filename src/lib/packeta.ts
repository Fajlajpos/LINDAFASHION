/**
 * Zásilkovna (Packeta) – serverová část.
 *
 * Zatím jen klíč pro widget výběru výdejního místa. Zakládání zásilek přes
 * API (`PACKETA_API_PASSWORD`) je samostatná věc a do prohlížeče nikdy nesmí.
 *
 * ## Proč se klíč posílá jako prop, a ne přes `NEXT_PUBLIC_`
 *
 * Widget běží v prohlížeči, takže klíč se do stránky dostat musí – je to
 * veřejný identifikátor obchodu, ne tajemství. `NEXT_PUBLIC_PACKETA_*` by ale
 * hodnotu **zapekl do buildu**: po vyplnění `.env` by se musel přestavět celý
 * image, a v Dockeru navíc protlačit jako build arg (stejná past jako
 * u `NEXT_PUBLIC_GA_ID`). Serverová komponenta pokladny si proto klíč přečte
 * za běhu a pošle ho dolů jako prop – přesně jako `platbaKartouDostupna`
 * u GoPay.
 *
 * Bez klíče se widget nenabídne a pokladna spadne zpátky na ruční zápis
 * pobočky. Stejný princip jako brána a captcha: funkce se zapíná klíčem.
 */

/**
 * Klíč pro widget, nebo `null`, když Zásilkovna ještě není zapojená.
 *
 * Je to tentýž `Klíč API` z klientské sekce, kterým se podepisují i volání
 * API – widget z něj ale nic neodemyká, slouží jen k identifikaci obchodu
 * při výběru pobočky. Tajné je `PACKETA_API_PASSWORD`, a to zůstává na serveru.
 */
export function klicWidgetu(): string | null {
  const klic = process.env.PACKETA_API_KEY?.trim();
  return klic ? klic : null;
}
