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

Tyto všeobecné obchodní podmínky (dále jen „VOP") upravují vzájemná práva a povinnosti prodávajícího a kupujícího při nákupu zboží v internetovém obchodě LINDA FASHION (dále jen „e-shop"). Identifikační a kontaktní údaje prodávajícího jsou uvedeny výše na této stránce.

Je-li kupujícím spotřebitel, řídí se vztahy neupravené těmito VOP občanským zákoníkem (zák. č. 89/2012 Sb.) a zákonem o ochraně spotřebitele (zák. č. 634/1992 Sb.). Je-li kupujícím podnikatel, který nakupuje v rámci své podnikatelské činnosti, ustanovení na ochranu spotřebitele se na něj nevztahují.

Smlouvu lze uzavřít v českém jazyce. Náklady na prostředky komunikace na dálku (připojení k internetu, telefon) si hradí kupující sám; neliší se od jeho běžné sazby a prodávající si za ně nic neúčtuje.

## 2. Uživatelský účet

Nakupovat lze i bez registrace. Kupující si může zřídit uživatelský účet, ve kterém vidí své objednávky a doklady, spravuje uložené adresy a může zrušit objednávku, kterou prodávající ještě nezačal zpracovávat.

Při registraci i při objednávce je kupující povinen uvádět správné a pravdivé údaje a své heslo uchovávat v tajnosti. Uživatelský účet může kupující kdykoli zrušit v jeho nastavení.

## 3. Objednávka a uzavření kupní smlouvy

Prezentace zboží v e-shopu má informativní charakter a není návrhem na uzavření smlouvy.

Objednávka se vytváří v těchto krocích:

- **1. Košík** – kupující vloží zboží do košíku, může měnit množství a uplatnit slevový kód nebo dárkový poukaz.
- **2. Údaje** – kupující vyplní kontaktní údaje a adresu.
- **3. Doprava a platba** – kupující zvolí způsob doručení (případně výdejní místo) a způsob platby; u každého je uvedena cena.
- **4. Shrnutí** – před odesláním se zobrazí přehled objednaného zboží, zadané údaje, doprava, platba a celková cena včetně všech poplatků. U každé části je odkaz zpět do příslušného kroku, kde lze chyby vzniklé při zadávání opravit.

Objednávku kupující odešle tlačítkem „Objednat a zaplatit" poté, co vyjádří souhlas s těmito VOP. Objednávka zavazuje kupujícího k zaplacení.

Přijetí objednávky prodávající neprodleně potvrdí e-mailem. **Doručením tohoto potvrzení vzniká kupní smlouva.** Potvrzení obsahuje obsah smlouvy, poučení o odstoupení od smlouvy a odkaz na znění těchto VOP, se kterým kupující souhlasil.

Uzavřenou smlouvu prodávající uchovává v elektronické podobě. Kupující se k ní dostane přes odkaz v potvrzení objednávky, a to i bez registrace. Součástí záznamu je označení verze těchto VOP účinné v okamžiku odeslání objednávky; toto znění zůstává dostupné i po pozdější změně podmínek.

Prodávající není ve vztahu ke kupujícímu vázán žádným kodexem chování.

## 4. Ceny a slevy

Ceny zboží jsou uvedeny v korunách českých a jsou konečné, včetně všech daní a poplatků. Cena dopravy je uvedena u každého způsobu doručení v pokladně, tedy před odesláním objednávky. Za zvolený způsob platby si prodávající nic neúčtuje.

Je-li u zboží uvedena sleva, uvádíme zároveň nejnižší cenu, za kterou jsme zboží nabízeli v posledních 30 dnech před poskytnutím slevy (§ 12a zák. č. 634/1992 Sb.).

Na jednu objednávku lze uplatnit jeden slevový kód. Sleva se počítá z ceny zboží, nikoli z ceny dopravy. Slevový kód nelze směnit za peníze; doba jeho platnosti a počet použití jsou uvedeny u jeho nabídky.

## 5. Platební podmínky

Kupující může zaplatit:

- **bankovním převodem** – platební údaje včetně QR kódu obdrží ihned po odeslání objednávky na potvrzovací stránce, v potvrzovacím e-mailu i na dokladu. Kupní cena je splatná **do 3 pracovních dnů od odeslání objednávky**. Pro správné přiřazení platby je třeba uvést variabilní symbol.
- **platební kartou** prostřednictvím platební brány, je-li tento způsob v pokladně nabízen; kupní cena se hradí ihned při objednávce.
- **dárkovým poukazem**, a to zcela nebo zčásti; zbytek kupující doplatí některým z výše uvedených způsobů.

Platba na dobírku není podporována.

Nezaplacení kupní ceny převodem do dne splatnosti se považuje za podstatné porušení smlouvy. Prodávající v takovém případě může od smlouvy odstoupit a objednávku zrušit; kupujícího o tom informuje e-mailem.

K objednávce prodávající vystaví doklad v elektronické podobě, dostupný z potvrzení objednávky a v uživatelském účtu. Po přijetí platby je na dokladu vyznačeno datum úhrady.

Vlastnické právo ke zboží přechází na kupujícího zaplacením kupní ceny a převzetím zboží.

## 6. Doprava a dodání

Doručujeme pouze na území České republiky. Nabízené způsoby dopravy a jejich ceny jsou uvedeny v pokladně a na stránce „Doprava a platba".

Zboží skladem odesíláme ve lhůtě uvedené u produktu a v pokladně, a to od přijetí platby; u objednávky zaplacené kartou nebo celé dárkovým poukazem od jejího odeslání. K této době je třeba připočíst dobu přepravy podle zvoleného dopravce. O odeslání zásilky informujeme e-mailem.

Při doručení na výdejní místo nebo do výdejního boxu je kupující povinen zásilku vyzvednout v úložní době, kterou mu oznámí dopravce.

Doporučujeme při převzetí zkontrolovat neporušenost obalu zásilky a případné poškození ihned oznámit dopravci a prodávajícímu. Pozdější uplatnění práv z vadného plnění tím není dotčeno.

Nepřevezme-li kupující zásilku, aniž by od smlouvy odstoupil, může prodávající od smlouvy odstoupit a požadovat náhradu skutečně vynaložených nákladů na odeslání a vrácení zásilky.

Nebezpečí škody na zboží přechází na kupujícího převzetím zásilky.

## 7. Dárkové poukazy

- Dárkový poukaz zakoupený v e-shopu vydáme po přijetí platby; jeho kód zašleme e-mailem na adresu uvedenou v objednávce.
- Poukaz platí bez časového omezení, není-li u něj uvedena doba platnosti.
- Poukazem lze zaplatit celou objednávku nebo její část. Nevyčerpaný zůstatek zůstává na poukazu a lze jej použít při dalším nákupu. Na jednu objednávku lze uplatnit jeden poukaz.
- Poukaz nelze směnit za hotovost a jeho zůstatek se nevyplácí.
- Poukaz může uplatnit kdokoli, kdo zná jeho kód. Kód proto chraňte; za uplatnění poukazu osobou, které kupující kód sdělil nebo zpřístupnil, prodávající neodpovídá.
- Od koupě poukazu může spotřebitel odstoupit do 14 dnů od jeho obdržení, pokud poukaz dosud nebyl ani zčásti uplatněn.

## 8. Zrušení objednávky a odstoupení od smlouvy do 14 dnů

Kupující spotřebitel má právo odstoupit od smlouvy bez udání důvodu ve lhůtě 14 dnů ode dne převzetí zboží; je-li objednávka dodána po částech, ode dne převzetí poslední části. Odstoupit lze i před převzetím zboží. Lhůta je zachována, je-li odstoupení odesláno poslední den lhůty.

Objednávku, kterou prodávající ještě nezačal zpracovávat, může kupující s uživatelským účtem zrušit sám tlačítkem „Zrušit objednávku" v účtu.

Odstoupit lze jednoznačným prohlášením – nejrychleji formulářem na stránce „Odstoupení od smlouvy", který je dostupný bez přihlášení, dále e-mailem, dopisem nebo vyplněným vzorovým formulářem. Přijetí odstoupení potvrdíme e-mailem s uvedením data a času.

Odstoupit lze i od části objednávky. Kupující tedy může vrátit jen některé kusy a ostatní si ponechat.

Zboží kupující odešle zpět nejpozději do 14 dnů od odstoupení na adresu uvedenou v potvrzení odstoupení. **Přímé náklady na vrácení zboží nese kupující.** Kupující odpovídá za snížení hodnoty zboží, které vzniklo nakládáním s ním jinak, než je nutné k obeznámení se s jeho povahou a vlastnostmi.

Peníze vrátíme nejpozději do 14 dnů od doručení odstoupení, a to stejným způsobem, jakým jsme je přijali, nedohodneme-li se s kupujícím výslovně jinak. Část kupní ceny uhrazenou dárkovým poukazem vrátíme zpět na poukaz. Vracíme kupní cenu **včetně nákladů na dodání zboží**, které kupující zaplatil. Zvolil-li kupující jiný než nejlevnější nabízený způsob dodání, vrátíme náklady na dodání ve výši odpovídající nejlevnějšímu nabízenému způsobu (§ 1832 odst. 1 občanského zákoníku). S vrácením peněz můžeme počkat, dokud zboží neobdržíme zpět nebo dokud kupující neprokáže, že je odeslal.

## 9. Kdy od smlouvy odstoupit nelze

Zákon vylučuje odstoupení u některých druhů zboží (§ 1837 občanského zákoníku). Z naší nabídky se to může týkat zboží upraveného na přání kupujícího a zboží v uzavřeném obalu, které kupující z obalu vyňal a které z hygienických důvodů není možné vrátit.

U ostatního zboží se právo na odstoupení do 14 dnů uplatní bez omezení.

## 10. Odstoupení od smlouvy ze strany prodávajícího

Prodávající může od smlouvy odstoupit, jestliže:

- kupující nezaplatí kupní cenu převodem do dne splatnosti (čl. 5),
- kupující nepřevezme zásilku (čl. 6),
- zboží nelze z objektivních důvodů dodat, zejména proto, že bylo vyprodáno.

O odstoupení prodávající kupujícího bez zbytečného odkladu informuje e-mailem. Přijaté peníze vrátí bez zbytečného odkladu, nejpozději do 14 dnů, stejným způsobem, jakým je přijal; část uhrazenou dárkovým poukazem vrátí zpět na poukaz.

## 11. Práva z vadného plnění

Práva z vadného plnění a postup při reklamaci upravuje reklamační řád, který je nedílnou součástí těchto VOP. Reklamaci vyřídíme nejpozději do 30 dnů od jejího uplatnění.

## 12. Mimosoudní řešení sporů a dozor

K mimosoudnímu řešení spotřebitelských sporů z kupní smlouvy je příslušná Česká obchodní inspekce, se sídlem Štěpánská 567/15, 120 00 Praha 2, internetová adresa www.coi.cz. Návrh na zahájení mimosoudního řešení sporu podává spotřebitel; řízení je pro něj bezplatné.

Dozor nad dodržováním povinností podle zákona o ochraně spotřebitele vykonává Česká obchodní inspekce. Dozor nad zpracováním osobních údajů vykonává Úřad pro ochranu osobních údajů. Dozor nad dodržováním živnostenského zákona vykonává příslušný živnostenský úřad.

## 13. Ochrana osobních údajů

Zpracování osobních údajů je popsáno v samostatném dokumentu „Ochrana osobních údajů", dostupném v patičce webu.

## 14. Závěrečná ustanovení

Znění VOP může prodávající měnit či doplňovat. Pro objednávku platí vždy to znění, které bylo účinné v okamžiku jejího odeslání; jeho verze je u objednávky zaznamenána.

Vztahy mezi prodávajícím a kupujícím se řídí právem České republiky. Je-li kupujícím spotřebitel, nejsou tím dotčena práva, která mu přiznávají kogentní ustanovení právního řádu státu jeho obvyklého bydliště.`,
    },

    'reklamacni-rad': {
      verze: 'vychozi',
      nadpis: 'Reklamační řád',
      obsah: `## 1. Odpovědnost prodávajícího

Prodávající odpovídá kupujícímu, že zboží při převzetí nemá vady – zejména že odpovídá popisu u nabídky v e-shopu, má vlastnosti, které strany ujednaly nebo které prodávající popsal, a je dodáno v ujednaném množství.

Kupující spotřebitel může vadu vytknout ve lhůtě **24 měsíců od převzetí zboží**. Projeví-li se vada v průběhu jednoho roku od převzetí, má se za to, že zboží bylo vadné již při převzetí, ledaže to povaha zboží nebo vady vylučuje.

## 2. Co se za vadu nepovažuje

- opotřebení způsobené obvyklým užíváním,
- vada vzniklá nesprávnou údržbou v rozporu s pokyny na visačce nebo nesprávným používáním,
- poškození způsobené kupujícím,
- vada, pro kterou byla s kupujícím ujednána nižší cena.

## 3. Uplatnění reklamace

Reklamaci lze uplatnit formulářem na stránce „Reklamace", e-mailem nebo dopisem. Formulář je dostupný **i bez přihlášení**: práva z vadného plnění nezávisí na tom, zda má kupující u prodávajícího účet. Popište prosím vadu a uveďte číslo objednávky spolu s e-mailem, se kterým byla objednávka pořízena.

O uplatnění reklamace vydáme potvrzení s uvedením data, obsahu reklamace a požadovaného způsobu vyřízení. Stav reklamace může kupující kdykoli sledovat na stránce „Stav reklamace", a to rovněž bez přihlášení.

Kam reklamované zboží zaslat, sdělíme v potvrzení reklamace; jde o tutéž adresu, která je uvedena v poučení o odstoupení od smlouvy. **Účelně vynaložené náklady spojené s oprávněnou reklamací, zejména poštovné za zaslání zboží, kupujícímu nahradíme.**

## 4. Práva kupujícího

Kupující může požadovat odstranění vady dodáním nového zboží bez vady, nebo opravou – podle své volby. Zvolený způsob lze odmítnout, je-li nemožný nebo ve srovnání s druhým nepřiměřeně nákladný. Prodávající může odmítnout vadu odstranit, je-li to nemožné nebo nepřiměřeně nákladné.

Přiměřenou slevu nebo odstoupení od smlouvy může kupující požadovat, jestliže:

- prodávající vadu odmítl odstranit nebo ji neodstranil v souladu se zákonem,
- se vada projeví opakovaně,
- je vada podstatným porušením smlouvy, nebo
- je z prohlášení prodávajícího nebo z okolností zřejmé, že vada nebude odstraněna v přiměřené době nebo bez značných obtíží pro kupujícího.

Je-li vada nevýznamná, nemůže kupující od smlouvy odstoupit; má však právo na přiměřenou slevu.

## 5. Vyřízení reklamace

Reklamaci vyřídíme, včetně odstranění vady, nejpozději do 30 dnů od jejího uplatnění, nedohodneme-li se s kupujícím na delší lhůtě. Marné uplynutí této lhůty zakládá kupujícímu stejná práva, jako by šlo o podstatné porušení smlouvy – může od smlouvy odstoupit nebo požadovat přiměřenou slevu.

O vyřízení reklamace kupujícího informujeme e-mailem. Vydáme mu potvrzení o datu a způsobu vyřízení, případně o provedení opravy a době jejího trvání. Zamítnutou reklamaci písemně odůvodníme.

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
