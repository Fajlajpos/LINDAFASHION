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
 * `emailFirmy` a `emailProGdpr` schválně **nenastavuje**. Adresa se teprve
 * zakládá a napsat sem zástupnou by bylo horší než prázdno: prázdné pole se
 * nikde nevykreslí, kdežto nefunkční e-mail v zásadách zpracování je kontakt,
 * na kterém se zákaznice nedovolá svých práv podle čl. 15 až 22 GDPR.
 * Až adresa vznikne, doplní se v administraci.
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
   * § 435 o. z. vyžaduje údaj o zápisu. Přesné znění (který úřad živnost
   * vydal) je potřeba ověřit na rzp.gov.cz – proto je tu jako konstanta
   * na jednom místě, ne rozepsané po šablonách.
   */
  zapisVRejstriku: 'Zapsána v živnostenském rejstříku vedeném Městským úřadem Sokolov',
} as const;

/**
 * E-maily zaseté `prisma/seed.ts`. Nejsou to adresy majitelky.
 *
 * Ponechat je je horší než mít pole prázdné: publikovaný kontakt se považuje
 * za doručovací adresu prodávajícího, takže odstoupení od smlouvy poslané na
 * tuhle adresu je účinné okamžikem odeslání (§ 1830a o. z.) – a majitelka by
 * se o něm nedozvěděla. Prázdné pole se aspoň nikde nevykreslí a zákaznice
 * dostane telefon a kontaktní formulář.
 */
const DEMO_EMAILY = ['info@lindafashion.cz', 'admin@lindafashion.cz'];

async function vyplnitUdajeFirmy() {
  console.log('📇 Zapisuji identifikaci prodávajícího do Settings…');

  /*
   * Upsert na pevné id: řádek `Settings` je vždy nejvýš jeden. `create`
   * dostane tytéž hodnoty, aby se skript dal spustit i na prázdné databázi.
   */
  const pred = await db.settings.findUnique({
    where: { id: ID_NASTAVENI },
    select: { emailFirmy: true, emailProGdpr: true },
  });

  /*
   * Skutečně vyplněný e-mail se nepřepíše – skript se pouští opakovaně a nesmí
   * majitelce smazat adresu, kterou si zadala v administraci. Vyčistí se jen
   * demo hodnota ze seedu.
   */
  const vymazat = (hodnota: string | null | undefined) =>
    hodnota && DEMO_EMAILY.includes(hodnota.toLowerCase().trim()) ? { hodnota: null } : null;

  const emailFirmyVymaz = vymazat(pred?.emailFirmy);
  const emailGdprVymaz = vymazat(pred?.emailProGdpr);

  const ulozeno = await db.settings.upsert({
    where: { id: ID_NASTAVENI },
    update: {
      ...UDAJE,
      ...(emailFirmyVymaz ? { emailFirmy: null } : {}),
      ...(emailGdprVymaz ? { emailProGdpr: null } : {}),
    },
    create: { id: ID_NASTAVENI, ...UDAJE },
  });

  if (emailFirmyVymaz || emailGdprVymaz) {
    console.log('   (vyčištěn demo e-mail ze seedu – není to adresa majitelky)');
  }

  for (const [klic, hodnota] of Object.entries(UDAJE)) {
    console.log(`   ${klic}: ${hodnota === null ? '—' : String(hodnota)}`);
  }

  const chybi = [
    ulozeno.emailFirmy ? null : 'emailFirmy',
    ulozeno.emailProGdpr ? null : 'emailProGdpr',
  ].filter(Boolean);

  if (chybi.length > 0) {
    console.warn(
      `\n⚠️  Nevyplněno: ${chybi.join(', ')}. Dokud tam e-mail není, zásady ` +
        'zpracování odkazují na kontaktní formulář a doklad neuvádí e-mail ' +
        'prodávajícího. Doplňte v /admin/nastaveni, až bude schránka hotová.',
    );
  }

  console.log('\n✅ Hotovo.');
  process.exit(0);
}

vyplnitUdajeFirmy().catch((err) => {
  console.error('❌ Zápis údajů firmy selhal:', err);
  process.exit(1);
});
