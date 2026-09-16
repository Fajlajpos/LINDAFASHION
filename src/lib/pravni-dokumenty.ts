/**
 * Znění právních dokumentů uchovávané v databázi.
 *
 * `Settings.verzePodminek` se snímkuje na každou objednávku
 * (`Order.verzePodminek`), jenže text podmínek byl natvrdo v JSX. Štítek tedy
 * ukazoval na znění, které nikdo neuchovával – doložit „souhlasila s verzí
 * 2026-01" nešlo, protože tu verzi si nebylo kde přečíst. To je přesně ta
 * situace, kterou § 1826 a čl. 7 GDPR chtějí vyloučit.
 *
 * ## Pravidla, která tenhle soubor drží
 *
 * 1. **Append-only.** Nové znění = nový řádek s novou verzí. Řádek se
 *    nikdy nepřepisuje – tím by se zpětně změnilo, s čím zákaznice
 *    souhlasila. Stejný důvod jako u `PriceHistory`.
 * 2. **Verze je klíč.** Dvojice (druh, verze) je v databázi unikátní, takže
 *    snímek u objednávky ukazuje právě na jeden text.
 * 3. **Prázdná tabulka nesmí shodit web.** Dokud majitelka podmínky
 *    nevloží, vykreslí se `VYCHOZI_ZNENI` z tohohle souboru. Je to záloha,
 *    ne pravda: co není v databázi, není u objednávky doložitelné, a stránka
 *    to říká nahlas.
 *
 * Company údaje (adresa, IČO) ve výchozím znění schválně **nejsou**.
 * Vymyšlený prodávající v obchodních podmínkách je horší vada než mezera –
 * stránka je bere z `Settings`, kde je majitelka vyplní jednou pro celý web.
 */
import { db } from './db';

export type DruhDokumentu = 'obchodni-podminky' | 'reklamacni-rad' | 'ochrana-osobnich-udaju';

export interface PravniZneni {
  druh: string;
  verze: string;
  nadpis: string;
  obsah: string;
  ucinnostOd: Date;
  /** `false` = vykresluje se záložní text z kódu, v databázi zatím nic není. */
  zDatabaze: boolean;
}

/**
 * Načte znění účinné k danému okamžiku.
 *
 * Řadí se podle `ucinnostOd` sestupně a bere se první řádek, jehož účinnost
 * už nastala. Dokument s budoucí účinností tak jde připravit dopředu a naskočí
 * sám – bez toho by se musel vkládat v den účinnosti, tedy ručně a včas.
 */
export async function nacistZneni(
  druh: DruhDokumentu,
  ted: Date = new Date()
): Promise<PravniZneni> {
  try {
    const zaznam = await db.pravniDokument.findFirst({
      where: { druh, ucinnostOd: { lte: ted } },
      orderBy: { ucinnostOd: 'desc' },
    });

    if (zaznam) {
      return {
        druh: zaznam.druh,
        verze: zaznam.verze,
        nadpis: zaznam.nadpis,
        obsah: zaznam.obsah,
        ucinnostOd: zaznam.ucinnostOd,
        zDatabaze: true,
      };
    }
  } catch (err) {
    // Nedostupná databáze nesmí sebrat zákaznici obchodní podmínky – to je
    // jediná stránka, kterou v takové chvíli potřebuje nejvíc.
    console.error('[právní dokumenty] Načtení selhalo, používám výchozí znění:', err);
  }

  const vychozi = VYCHOZI_ZNENI[druh];

  return {
    druh,
    verze: vychozi.verze,
    nadpis: vychozi.nadpis,
    obsah: vychozi.obsah,
    ucinnostOd: new Date(0),
    zDatabaze: false,
  };
}

/**
 * Načte konkrétní verzi – tohle je ta funkce, kvůli které celá tabulka
 * existuje. Odkaz „podmínky ve znění, se kterým jste souhlasila" u objednávky
 * vede sem a musí fungovat i deset znění poté.
 */
export async function nacistVerzi(druh: DruhDokumentu, verze: string): Promise<PravniZneni | null> {
  const zaznam = await db.pravniDokument.findUnique({
    where: { druh_verze: { druh, verze } },
  });

  if (!zaznam) return null;

  return {
    druh: zaznam.druh,
    verze: zaznam.verze,
    nadpis: zaznam.nadpis,
    obsah: zaznam.obsah,
    ucinnostOd: zaznam.ucinnostOd,
    zDatabaze: true,
  };
}

/** Všechna znění daného druhu, nejnovější první – pro administraci. */
export async function nacistVsechnaZneni(druh?: DruhDokumentu) {
  return db.pravniDokument.findMany({
    where: druh ? { druh } : undefined,
    orderBy: [{ druh: 'asc' }, { ucinnostOd: 'desc' }],
    select: {
      id: true,
      druh: true,
      verze: true,
      nadpis: true,
      ucinnostOd: true,
      createdAt: true,
    },
  });
}

export const NAZVY_DRUHU: Record<DruhDokumentu, string> = {
  'obchodni-podminky': 'Obchodní podmínky',
  'reklamacni-rad': 'Reklamační řád',
  'ochrana-osobnich-udaju': 'Ochrana osobních údajů',
};

/**
 * Záložní znění pro prázdnou databázi.
 *
 * Vychází z textu, který do teď žil v JSX, ale je doplněné o to, co v něm
 * chybělo a co zákon vyžaduje: doba dodání, poučení o odstoupení s odkazem na
 * vzorový formulář, náklady na vrácení, mimosoudní řešení sporů a odpovědnost
 * z vadného plnění.
 *
 * Údaje o prodávajícím tu schválně nejsou – doplňuje je stránka z `Settings`,
 * protože adresa se stěhuje častěji než pravidla a nová verze celého dokumentu
 * kvůli změně telefonu by z verzování udělala šum.
 *
 * **Evropská platforma ODR se tu neuvádí a nesmí vrátit.** Nařízení (EU)
 * 524/2013 bylo zrušeno a platforma 20. 7. 2025 skončila; odkaz na ni by dnes
 * posílal zákaznici na neexistující službu. Mimosoudní řešení sporů obstarává
 * ČOI, ta funguje dál.
 */
export const VYCHOZI_ZNENI: Record<DruhDokumentu, { verze: string; nadpis: string; obsah: string }> =
  {
    'obchodni-podminky': {
      verze: 'vychozi',
      nadpis: 'Všeobecné obchodní podmínky',
      obsah: `## 1. Základní ustanovení

Tyto všeobecné obchodní podmínky (dále jen „VOP") upravují práva a povinnosti mezi prodávajícím a kupujícím při nákupu v internetovém obchodě LINDA FASHION. Identifikační údaje prodávajícího jsou uvedeny výše na této stránce.

Je-li kupujícím spotřebitel, řídí se vztahy neupravené těmito VOP občanským zákoníkem (zák. č. 89/2012 Sb.) a zákonem o ochraně spotřebitele (zák. č. 634/1992 Sb.).

Smlouva se uzavírá v českém jazyce. Náklady na použití prostředků komunikace na dálku (připojení k internetu, telefon) si hradí kupující sám; neliší se od jeho běžné sazby a prodávající si za ně nic neúčtuje.

## 2. Objednávka a uzavření kupní smlouvy

Prezentace zboží v e-shopu je informativního charakteru a nejde o návrh na uzavření smlouvy. Kupní smlouva vzniká doručením potvrzení objednávky na e-mail kupujícího.

Před odesláním objednávky má kupující možnost zkontrolovat a měnit údaje, které do objednávky vložil. Odesláním objednávky kupující potvrzuje, že se s těmito VOP seznámil a souhlasí s nimi.

Objednávka zavazuje kupujícího k zaplacení; tlačítko, kterým se objednávka odesílá, je proto označeno „Objednat a zaplatit".

Uzavřenou smlouvu prodávající uchovává v elektronické podobě. Kupující se k ní dostane přes odkaz v potvrzení objednávky, a to i bez registrace. Součástí záznamu je i označení verze těchto VOP účinné v okamžiku odeslání objednávky; toto znění zůstává dostupné i po pozdější změně podmínek.

## 3. Ceny a platební podmínky

Ceny jsou uvedeny v korunách českých a jsou konečné. Platit lze bankovním převodem na účet; platební údaje včetně QR kódu obdrží kupující ihned po odeslání objednávky. Je-li v pokladně nabídnuta platba kartou přes platební bránu, lze zaplatit i tímto způsobem. Dobírka není podporována.

Je-li u zboží uvedena sleva, uvádíme zároveň nejnižší cenu, za kterou jsme zboží nabízeli v posledních 30 dnech před poskytnutím slevy (§ 12a zák. č. 634/1992 Sb.).

## 4. Dodací lhůta a doprava

Zboží skladem expedujeme ve lhůtě uvedené u produktu a v pokladně. K této době je třeba připočíst dobu přepravy podle zvoleného dopravce. O odeslání zásilky informujeme e-mailem.

Doručujeme na území České republiky. Cena dopravy je u každého způsobu doručení uvedena v pokladně, tedy před odesláním objednávky.

Nebezpečí škody na zboží přechází na kupujícího převzetím zásilky.

## 5. Odstoupení od smlouvy do 14 dnů

Kupující spotřebitel má právo odstoupit od smlouvy bez udání důvodu ve lhůtě 14 dnů ode dne převzetí zboží. Lhůta je zachována, je-li odstoupení odesláno poslední den lhůty.

Odstoupit lze jednoznačným prohlášením – nejrychleji formulářem na stránce „Odstoupení od smlouvy", který je dostupný bez přihlášení, dále e-mailem, dopisem nebo vyplněným vzorovým formulářem. Přijetí odstoupení potvrdíme s uvedením data a času.

Odstoupit lze i od části objednávky. Kupující tedy může vrátit jen některé kusy a ostatní si ponechat.

Zboží kupující odešle zpět nejpozději do 14 dnů od odstoupení. Přímé náklady na vrácení zboží nese kupující. Kupující odpovídá za snížení hodnoty zboží, které vzniklo nakládáním s ním jinak, než je nutné k obeznámení se s jeho povahou a vlastnostmi.

Peníze vrátíme nejpozději do 14 dnů od doručení odstoupení, a to stejným způsobem, jakým jsme je přijali. Vracíme kupní cenu **včetně nákladů na dodání zboží**, které kupující zaplatil. Zvolil-li kupující jiný než nejlevnější nabízený způsob dodání, vrátíme náklady na dodání ve výši odpovídající nejlevnějšímu nabízenému způsobu (§ 1832 odst. 1 občanského zákoníku). S vrácením peněz můžeme počkat, dokud zboží neobdržíme zpět nebo dokud kupující neprokáže, že je odeslal.

## 6. Kdy od smlouvy odstoupit nelze

Zákon vylučuje odstoupení u některých druhů zboží (§ 1837 občanského zákoníku). Z naší nabídky se to může týkat zboží upraveného na přání kupujícího a zboží v uzavřeném obalu, které kupující z obalu vyňal a které z hygienických důvodů není možné vrátit.

U ostatního zboží se právo na odstoupení do 14 dnů uplatní bez omezení.

## 7. Práva z vadného plnění

Práva z vadného plnění a postup při reklamaci upravuje reklamační řád, který je nedílnou součástí těchto VOP. Reklamaci vyřídíme nejpozději do 30 dnů od uplatnění.

## 8. Mimosoudní řešení sporů a dozor

K mimosoudnímu řešení spotřebitelských sporů z kupní smlouvy je příslušná Česká obchodní inspekce, se sídlem Štěpánská 567/15, 120 00 Praha 2, internetová adresa www.coi.cz. Návrh na zahájení mimosoudního řešení sporu podává spotřebitel; řízení je pro něj bezplatné.

Dozor nad dodržováním povinností podle zákona o ochraně spotřebitele vykonává Česká obchodní inspekce. Dozor nad zpracováním osobních údajů vykonává Úřad pro ochranu osobních údajů.

## 9. Ochrana osobních údajů

Zpracování osobních údajů je popsáno v samostatném dokumentu „Ochrana osobních údajů", dostupném v patičce webu.

## 10. Závěrečná ustanovení

Znění VOP může prodávající měnit či doplňovat. Pro objednávku platí vždy to znění, které bylo účinné v okamžiku jejího odeslání; jeho verze je u objednávky zaznamenána.`,
    },

    'reklamacni-rad': {
      verze: 'vychozi',
      nadpis: 'Reklamační řád',
      obsah: `## 1. Rozsah a lhůty

Prodávající odpovídá kupujícímu, že zboží při převzetí nemá vady. Projeví-li se vada v průběhu jednoho roku od převzetí, má se za to, že zboží bylo vadné již při převzetí.

Kupující spotřebitel může vadu vytknout ve lhůtě dvou let od převzetí zboží.

## 2. Uplatnění reklamace

Reklamaci lze uplatnit formulářem na stránce „Reklamace", e-mailem nebo dopisem. Formulář je dostupný **i bez přihlášení**: práva z vadného plnění nezávisí na tom, zda má kupující u prodávajícího účet. Popište prosím vadu a uveďte číslo objednávky spolu s e-mailem, se kterým byla objednávka pořízena.

O uplatnění reklamace vydáme potvrzení s uvedením data, obsahu reklamace a požadovaného způsobu vyřízení. Stav reklamace může kupující kdykoli sledovat na stránce „Stav reklamace", a to rovněž bez přihlášení.

Kam reklamované zboží zaslat, sdělíme v potvrzení reklamace; jde o tutéž adresu, která je uvedena v poučení o odstoupení od smlouvy.

## 3. Vyřízení reklamace

Reklamaci vyřídíme, včetně odstranění vady, nejpozději do 30 dnů od jejího uplatnění. Marné uplynutí této lhůty zakládá kupujícímu právo odstoupit od smlouvy nebo požadovat přiměřenou slevu.

## 4. Práva z vadného plnění

Kupující může požadovat odstranění vady dodáním nového zboží bez vady nebo opravou. Není-li to možné nebo přiměřené, může požadovat přiměřenou slevu, případně od smlouvy odstoupit.

## 5. Co reklamace nekryje

Reklamovat nelze opotřebení způsobené obvyklým užíváním, vadu vzniklou nesprávnou údržbou v rozporu s pokyny na visačce, ani poškození způsobené kupujícím.

## 6. Vrácení bez udání důvodu

Vrácení zboží do 14 dnů bez udání důvodu není reklamace – řídí se odstoupením od smlouvy podle obchodních podmínek a lze ho uplatnit i bez přihlášení.`,
    },

    'ochrana-osobnich-udaju': {
      verze: 'vychozi',
      nadpis: 'Ochrana osobních údajů',
      obsah: `Zásady zpracování osobních údajů jsou vykresleny přímo na stránce „Ochrana osobních údajů". Doby uchování se v nich generují z retenčních pravidel v kódu, aby text a skutečné mazání nemohly tvrdit každý něco jiného.`,
    },
  };

/**
 * Verze obchodních podmínek pro snímek u objednávky.
 *
 * Bere se z **účinného znění v databázi**, ne z ručně přepisovaného štítku
 * v nastavení. Ten štítek byl slabé místo celého důkazu: majitelka změnila
 * text a zvednout verzi zapomněla, takže objednávka odkazovala na znění,
 * které zákaznice nikdy neviděla – a nikde nic neselhalo, aby si toho někdo
 * všiml.
 *
 * `Settings.verzePodminek` zůstává jako záloha pro případ, že v tabulce ještě
 * žádné znění není: objednávka musí jít dokončit i tehdy a se snímkem, který
 * aspoň něco říká.
 */
export async function verzeProObjednavku(zaloha: string): Promise<string> {
  try {
    const zneni = await db.pravniDokument.findFirst({
      where: { druh: 'obchodni-podminky', ucinnostOd: { lte: new Date() } },
      orderBy: { ucinnostOd: 'desc' },
      select: { verze: true },
    });

    return zneni?.verze ?? zaloha;
  } catch (err) {
    // Objednávka nesmí spadnout kvůli dohledávání verze. Záloha z nastavení
    // je horší doklad než přesná verze, ale pořád lepší než prázdno.
    console.error('[právní dokumenty] Verzi podmínek se nepodařilo zjistit:', err);
    return zaloha;
  }
}
