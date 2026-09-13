/**
 * Zapíše identifikaci prodávajícího do `Settings`.
 *
 * Tytéž hodnoty jde vyplnit v `/admin/nastaveni`; skript existuje proto, že
 * jde o údaje, které musí sedět **přesně** – IČO na dokladu a v živnostenském
 * rejstříku se nesmí rozejít o číslici – a přepisování šesti polí rukou na
 * dvou prostředích (vývoj, produkce) je přesně ta situace, kde vznikne překlep.
 *
 * Je **idempotentní**: pouští se opakovaně a zapisuje jen to, co je vypsané
 * níž. Nedotýká se cen dopravy, režimu dovolené ani `verzePodminek`.
 *
 * `emailFirmy` a `emailProGdpr` zapisuje od chvíle, kdy schránka doopravdy
 * existuje. Do té doby zůstávaly schválně prázdné a bylo to správně: prázdné
 * pole se nikde nevykreslí, kdežto nefunkční e-mail v zásadách zpracování je
 * kontakt, na kterém se zákaznice nedovolá svých práv podle čl. 15 až 22 GDPR.
 *
 * Spuštění:  npm run nastaveni:firma
 */
import { db } from '../lib/db';

/**
 * Id jediného řádku `Settings`. Schválně tu, ne importované z `lib/nastaveni.ts`:
 * ten modul táhne `cache()` z Reactu, který existuje jen v serverovém buildu
 * Nextu – pod ts-node se celý skript rozbije už při kompilaci. Stejná hranice
 * runtimů jako u `dodavatel.ts` vůči workeru.
 *
 * Hodnota nemůže driftovat: v `schema.prisma` je `id Int @id @default(1)`
 * a řádek je vždy nejvýš jeden.
 */
const ID_NASTAVENI = 1;

/**
 * Martina Ludvíková, podnikající fyzická osoba, neplátce DPH.
 *
 * Sídlo a provozovna jsou dvě různé adresy a drží se odděleně: sídlo je
 * právní adresa podnikatele (faktura, patička, § 435 o. z.), provozovna je
 * místo, kam zákaznice přijde. Adresa pro vrácení zboží míří na provozovnu –
 * do bytu se vracené zásilky posílat nemají.
 */
const UDAJE = {
  nazevFirmy: 'Martina Ludvíková',
  icoFirmy: '02688468',
  // Neplátce DPH nesmí DIČ ani daň na dokladu uvádět.
  dicFirmy: null,
  jePlatceDph: false,

  adresaFirmy: 'Jednoty 1441, 356 01 Sokolov',
  adresaProvozovny: 'Linda Fashion, Rokycanova 1929, 356 01 Sokolov',
  adresaProVraceni: 'Linda Fashion, Rokycanova 1929, 356 01 Sokolov',

  telefonFirmy: '+420 607 030 764',

  /*
   * Kontakt obchodu a zároveň kontakt pro žádosti podle GDPR.
   *
   * Jedna adresa pro obojí je u jednoosobového obchodu záměr, ne zjednodušení:
   * druhá schránka by byla místo, kam se nikdo nedívá, a žádost o výmaz, která
   * zapadne, je horší než chybějící pole. Až bude schránek víc, odděluje se
   * `emailProGdpr` jako první.
   *
   * Publikovaný kontakt je doručovací adresa prodávajícího – odstoupení od
   * smlouvy poslané sem je účinné už okamžikem odeslání (§ 1830a o. z.).
   * Tuhle schránku tedy musí někdo skutečně číst; není to jen údaj na web.
   */
  emailFirmy: 'lindafashioneshop@gmail.com',
  emailProGdpr: 'lindafashioneshop@gmail.com',

  /*
   * § 435 o. z. vyžaduje údaj o zápisu. Přesné znění (který úřad živnost
   * vydal) je potřeba ověřit na rzp.gov.cz – proto je tu jako konstanta
   * na jednom místě, ne rozepsané po šablonách.
   */
  zapisVRejstriku: 'Zapsána v živnostenském rejstříku vedeném Městským úřadem Sokolov',
} as const;

async function vyplnitUdajeFirmy() {
  console.log('📇 Zapisuji identifikaci prodávajícího do Settings…');

  /*
   * Upsert na pevné id: řádek `Settings` je vždy nejvýš jeden. `create`
   * dostane tytéž hodnoty, aby se skript dal spustit i na prázdné databázi.
   */
  await db.settings.upsert({
    where: { id: ID_NASTAVENI },
    update: UDAJE,
    create: { id: ID_NASTAVENI, ...UDAJE },
  });

  for (const [klic, hodnota] of Object.entries(UDAJE)) {
    console.log(`   ${klic}: ${hodnota === null ? '—' : String(hodnota)}`);
  }

  /*
   * Zápis je bezpodmínečný, stejně jako u IČO a sídla: skript je zdroj pravdy
   * pro identifikaci prodávajícího. Kdyby si majitelka změnila e-mail
   * v administraci, další spuštění ho vrátí zpátky – proto změna patří sem
   * do `UDAJE`, ne jen do formuláře.
   */
  console.log('\n✅ Hotovo.');
  process.exit(0);
}

vyplnitUdajeFirmy().catch((err) => {
  console.error('❌ Zápis údajů firmy selhal:', err);
  process.exit(1);
});
