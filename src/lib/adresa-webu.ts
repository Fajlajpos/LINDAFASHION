/**
 * Adresa webu z `APP_URL`, srovnaná do tvaru `https://host` bez koncového lomítka.
 *
 * Hodnotu se píše ručně do Coolify a `APP_URL` jde do Docker buildu: root
 * layout z ní dělá `new URL()` pro `metadataBase`. Adresa bez `https://`
 * (tak, jak ji Coolify ukazuje v seznamu domén) tam vyhodila
 * `TypeError: Invalid URL` a shodila celé `next build` – nasazení padalo
 * na `RUN npm run build` bez jediného slova o tom, že jde o proměnnou.
 * Stejná hodnota by za běhu rozbila odkazy v e-mailech i kontrolu původu.
 *
 * Bez importů a bez `next/*` – čte ji i worker (šablony e-mailů, faktura).
 */
export function adresaWebu(vychozi = 'http://localhost:3000'): string {
  let adresa = (process.env.APP_URL ?? '').trim().replace(/^["']+|["']+$/g, '').trim();
  if (!adresa) return vychozi;

  if (!/^https?:\/\//i.test(adresa)) adresa = `https://${adresa}`;
  adresa = adresa.replace(/\/+$/, '');

  try {
    return new URL(adresa).origin;
  } catch {
    // Pořád nečitelné (mezera uprostřed apod.) – raději výchozí adresa než
    // spadlý build nebo odkaz, který nikam nevede.
    return vychozi;
  }
}
