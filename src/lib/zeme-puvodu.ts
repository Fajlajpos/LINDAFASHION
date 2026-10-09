/**
 * Štítek se zemí původu na kartě produktu.
 *
 * Nahradil „100% Italský materiál", který visel na každé kartě bez ohledu na
 * to, z čeho a kde byl kus ušitý. Tvrzení o původu a složení, které u části
 * zboží neplatí, je klamavá obchodní praktika (§ 5 zák. č. 634/1992 Sb.).
 * Tenhle text se proto skládá z `Product.zemePuvodu`, kterou vyplňuje
 * majitelka u každého kusu, a bez ní se štítek nezobrazí vůbec.
 *
 * Čistá funkce bez Prismy – volá ji klientská `ProductCard`.
 */

/**
 * Země, u kterých víme, jak se skloňují. Klíč je bez diakritiky a malými
 * písmeny, protože pole je volný text a majitelka napíše „Italie" stejně
 * dobře jako „Itálie".
 *
 * Seznam není úplný schválně: odhadnout šestý pád cizí země nejde, a špatně
 * vyskloňovaný štítek na každé kartě vypadá hůř než neutrální „Původ: …".
 */
const VYROBENO_V: Record<string, string> = {
  italie: 'v Itálii',
  italy: 'v Itálii',
  cesko: 'v Česku',
  'ceska republika': 'v Česku',
  slovensko: 'na Slovensku',
  polsko: 'v Polsku',
  nemecko: 'v Německu',
  francie: 've Francii',
  spanelsko: 've Španělsku',
  portugalsko: 'v Portugalsku',
  recko: 'v Řecku',
  rumunsko: 'v Rumunsku',
  bulharsko: 'v Bulharsku',
  turecko: 'v Turecku',
  maroko: 'v Maroku',
  tunisko: 'v Tunisku',
  cina: 'v Číně',
  indie: 'v Indii',
  banglades: 'v Bangladéši',
  vietnam: 've Vietnamu',
};

function klic(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Text štítku, nebo `null`, když země původu není vyplněná. */
export function stitekZemePuvodu(zeme: string | null | undefined): string | null {
  const text = zeme?.trim();
  if (!text) return null;

  const tvar = VYROBENO_V[klic(text)];
  return tvar ? `Vyrobeno ${tvar}` : `Původ: ${text}`;
}
