/**
 * Úprava fotky v prohlížeči ještě před nahráním – jen pro administraci.
 *
 * Fotka z iPhonu neprošla dvěma způsoby a screenshot ani jedním:
 *   • HEIC (výběr přes Soubory, sdílení z Fotek) – server ho odmítne, Sharp
 *     bez libheif ho neotevře. Safari ho ale dekódovat umí, takže ho tady
 *     převedeme na JPEG a server dostane formát, který zná.
 *   • velikost – 48Mpx fotka převedená na JPEG má klidně 15–25 MB, tedy přes
 *     strop jednoho souboru (`MAX_VSTUP_MB`), a pár takových přes strop dávky.
 *     Po mobilních datech se navíc posílá celou věčnost.
 *
 * Největší varianta, kterou worker vyrábí, má 1600 px, takže zmenšení na
 * 2400 px nic neubere a z 20 MB zbude kolem 1 MB. Vedlejší výhoda: plátno
 * zahodí EXIF včetně GPS polohy, kde fotka vznikla.
 *
 * Když prohlížeč fotku dekódovat neumí (HEIC v Chromu na počítači), pošle se
 * originál a server vrátí srozumitelnou hlášku – nic se tiše neztratí.
 */

const PODPOROVANE_TYPY = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

/** Delší strana po zmenšení – 1,5× největší varianty ve workeru. */
const MAX_PX = 2400;

/** Menší soubory v podporovaném formátu (screenshoty) se posílají beze změny. */
const PRAH_BAJTU = 3 * 1024 * 1024;

const KVALITA_JPEG = 0.88;

async function nacistObrazek(soubor: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(soubor);
  try {
    const obrazek = new Image();
    obrazek.src = url;
    // `decode()` respektuje EXIF orientaci stejně jako vykreslení, takže
    // fotka na výšku zůstane na výšku i po překreslení do plátna.
    await obrazek.decode();
    return obrazek;
  } finally {
    // Dekódovaný obrázek už URL nepotřebuje.
    URL.revokeObjectURL(url);
  }
}

export async function pripravitFotku(soubor: File): Promise<File> {
  const podporovany = PODPOROVANE_TYPY.includes(soubor.type);
  if (podporovany && soubor.size <= PRAH_BAJTU) return soubor;

  try {
    const obrazek = await nacistObrazek(soubor);
    const sirka = obrazek.naturalWidth;
    const vyska = obrazek.naturalHeight;
    if (!sirka || !vyska) return soubor;

    const pomer = Math.min(1, MAX_PX / Math.max(sirka, vyska));
    const platno = document.createElement('canvas');
    platno.width = Math.round(sirka * pomer);
    platno.height = Math.round(vyska * pomer);

    const kontext = platno.getContext('2d');
    if (!kontext) return soubor;

    // JPEG nemá průhlednost – bez podkladu by průhledné PNG zčernalo.
    kontext.fillStyle = 'white';
    kontext.fillRect(0, 0, platno.width, platno.height);
    kontext.imageSmoothingQuality = 'high';
    kontext.drawImage(obrazek, 0, 0, platno.width, platno.height);

    const blob = await new Promise<Blob | null>((hotovo) =>
      platno.toBlob(hotovo, 'image/jpeg', KVALITA_JPEG)
    );
    if (!blob) return soubor;

    // Podporovaný soubor, který se převodem nezmenšil, necháme v originále.
    if (podporovany && blob.size >= soubor.size) return soubor;

    const nazev = soubor.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], nazev, { type: 'image/jpeg', lastModified: soubor.lastModified });
  } catch {
    return soubor;
  }
}

export function pripravitFotky(soubory: File[]): Promise<File[]> {
  // Postupně, ne `Promise.all`: dekódovaná 48Mpx fotka zabere ~200 MB paměti
  // a Safari na iPhonu při několika naráz shodí celou záložku.
  return soubory.reduce<Promise<File[]>>(
    async (predchozi, soubor) => [...(await predchozi), await pripravitFotku(soubor)],
    Promise.resolve([])
  );
}
