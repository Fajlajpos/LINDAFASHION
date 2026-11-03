/**
 * Kam přesměrovat po přihlášení (`?dalsi=`), aniž by z toho bylo otevřené
 * přesměrování na cizí web.
 *
 * Dřív stačilo `startsWith('/') && !startsWith('//')`. Jenže prohlížeč čte
 * zpětné lomítko jako obyčejné: `/\evil.com` tou kontrolou prošlo a
 * `new URL('/\\evil.com', origin)` vede na `https://evil.com/`. Odkaz na
 * pravý přihlašovací formulář tak po přihlášení poslal zákaznici na
 * podvodnou stránku „relace vypršela, zadejte heslo znovu“.
 *
 * Proto se cíl nehodnotí řetězcově, ale tak, jak ho vyhodnotí prohlížeč:
 * rozparsuje se proti fiktivnímu originu a musí na něm zůstat.
 */
const FIKTIVNI_ORIGIN = 'https://cil.invalid';

export function bezpecnyCil(dalsi: string | null | undefined, zaloha: string): string {
  if (!dalsi) return zaloha;

  // Jen cesta v rámci webu, žádné zpětné lomítko ani řídicí znaky
  // (tabulátor a nový řádek prohlížeč z URL tiše vypouští).
  // eslint-disable-next-line no-control-regex
  if (!dalsi.startsWith('/') || dalsi.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(dalsi)) {
    return zaloha;
  }

  try {
    const url = new URL(dalsi, FIKTIVNI_ORIGIN);
    if (url.origin !== FIKTIVNI_ORIGIN) return zaloha;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return zaloha;
  }
}
