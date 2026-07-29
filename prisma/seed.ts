import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Spouštím seodvání databáze LINDA FASHION...');

  // 1. Vyčištění stávajících dat
  await prisma.reklamace.deleteMany();
  await prisma.stockNotification.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.giftCard.deleteMany();
  await prisma.discountCode.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();
  await prisma.settings.deleteMany();
  await prisma.newsletterSubscriber.deleteMany();

  // 2. Vytvoření Nastavení (Settings)
  await prisma.settings.create({
    data: {
      id: 1,
      rezimDovolene: false,
      datumNavratu: null,
      zpravaProZakazniky: 'Momentálně čerpáme dovolenou. Všechny objednávky odešleme ihned po návratu.',
      zablokovatObjednavky: false,
      nazevFirmy: 'LINDA FASHION s.r.o.',
      icoFirmy: '12345678',
      dicFirmy: 'CZ12345678',
      adresaFirmy: 'Pařížská 12, 110 00 Praha 1',
      telefonFirmy: '+420 777 888 999',
      emailFirmy: 'info@lindafashion.cz',
      jePlatceDph: true,
      socialInstagram: 'https://instagram.com/lindafashion_cz',
      socialFacebook: 'https://facebook.com/lindafashion.cz',
      cenaDopravyZasilkovna: 79,
      cenaDopravyPPL: 109,
      cenaDopravyCeskaPosta: 99,
      prahDopravaZdarma: 2500,
    },
  });

  // 3. Vytvoření Uživatelů
  const adminPasswordHash = await bcrypt.hash('adminpassword123', 12);
  const customerPasswordHash = await bcrypt.hash('heslo123', 12);

  await prisma.user.create({
    data: {
      email: 'admin@lindafashion.cz',
      passwordHash: adminPasswordHash,
      jmeno: 'Linda Administrátorka',
      telefon: '+420 777 888 999',
      role: Role.ADMIN,
      newsletterSouhlas: true,
    },
  });

  const testCustomer = await prisma.user.create({
    data: {
      email: 'zakaznice@example.cz',
      passwordHash: customerPasswordHash,
      jmeno: 'Marie Nováková',
      telefon: '+420 608 112 233',
      role: Role.CUSTOMER,
      newsletterSouhlas: true,
      addresses: {
        create: [
          {
            jmenoPrijmeni: 'Marie Nováková',
            ulice: 'Vodičkova 45',
            mesto: 'Praha 1',
            psc: '11000',
            zeme: 'CZ',
            telefon: '+420 608 112 233',
            jeVychozi: true,
            typ: 'FAKTURACNI',
          },
          {
            jmenoPrijmeni: 'Marie Nováková',
            ulice: 'Vodičkova 45',
            mesto: 'Praha 1',
            psc: '11000',
            zeme: 'CZ',
            telefon: '+420 608 112 233',
            jeVychozi: true,
            typ: 'DODACI',
          },
        ],
      },
    },
  });

  // 4. Vytvoření Kategorií
  const catSaty = await prisma.category.create({
    data: {
      nazev: 'Šaty',
      slug: 'saty',
      popis: 'Elegantní a nadčasové italské šaty pro každou příležitost.',
      poradi: 1,
    },
  });

  await prisma.category.create({
    data: {
      nazev: 'Letní šaty',
      slug: 'letni-saty',
      parentId: catSaty.id,
      popis: 'Vzdušné šaty z přírodních materiálů.',
      poradi: 1,
    },
  });

  await prisma.category.create({
    data: {
      nazev: 'Společenské šaty',
      slug: 'spolecenske-saty',
      parentId: catSaty.id,
      popis: 'Luxusní společenské šaty z Itálie.',
      poradi: 2,
    },
  });

  const catHalenky = await prisma.category.create({
    data: {
      nazev: 'Halenky & Košile',
      slug: 'halenky-a-kosile',
      popis: 'Jemné hedvábné a lněné halenky s dokonalým střihem.',
      poradi: 2,
    },
  });

  const catSvetry = await prisma.category.create({
    data: {
      nazev: 'Svetry & Kardigany',
      slug: 'svetry-a-kardigany',
      popis: 'Hřejivý kašmír a jemná vlna přímo z italských dílen.',
      poradi: 3,
    },
  });

  const catKabaty = await prisma.category.create({
    data: {
      nazev: 'Saka & Kabáty',
      slug: 'saka-a-kabaty',
      popis: 'Nadčasová saka a flaušové kabáty.',
      poradi: 4,
    },
  });

  const catPoukazy = await prisma.category.create({
    data: {
      nazev: 'Dárkové poukazy',
      slug: 'darkove-poukazy',
      popis: 'Fyzický dárkový poukaz v luxusním obálkovém balení.',
      poradi: 5,
    },
  });

  // 5. Vytvoření Produktů
  // Produkt 1: Hedvábné šaty Bellissima
  const p1 = await prisma.product.create({
    data: {
      nazev: 'Hedvábné šaty Bellissima',
      slug: 'hedvabne-saty-bellissima',
      popis: 'Nádherné zavinovací šaty z čistého italského hedvábí. Splývavý střih s jemným pasovým páskem zdůrazní siluetu a dodá pocit naprosté lehkosti a exkluzivity.',
      categoryId: catSaty.id,
      cena: 3490,
      znacka: 'Milano Elegance',
      material: '100% Přírodní italské hedvábí',
      udrzba: 'Šetrné ruční praní na 30°C nebo chemické čištění. Žehlit na nízkou teplotu z rubu.',
      sku: 'LF-SAT-001',
      aktivni: true,
      doporuceny: true,
      metaTitle: 'Hedvábné šaty Bellissima | LINDA FASHION',
      metaDescription: 'Luxusní zavinovací šaty z 100% italského hedvábí. Nadčasová elegance pro náročné ženy.',
      variants: {
        create: [
          {
            velikost: 'S (36)',
            barva: 'Smetanová',
            skladem: 3,
            miry: { obvodHrudniku: '88–92 cm', obvodPasu: '68–72 cm', obvodBoku: '94–98 cm', delka: '115 cm' },
          },
          {
            velikost: 'M (38)',
            barva: 'Smetanová',
            skladem: 5,
            miry: { obvodHrudniku: '92–96 cm', obvodPasu: '72–76 cm', obvodBoku: '98–102 cm', delka: '116 cm' },
          },
          {
            velikost: 'L (40)',
            barva: 'Smetanová',
            skladem: 2,
            miry: { obvodHrudniku: '96–100 cm', obvodPasu: '76–80 cm', obvodBoku: '102–106 cm', delka: '117 cm' },
          },
        ],
      },
      images: {
        create: [
          {
            url: null,
            altText: 'Hedvábné šaty Bellissima - přední pohled',
            poradi: 1,
            jeHlavni: true,
            stavZpracovani: 'HOTOVO',
          },
        ],
      },
    },
  });

  // Produkt 2: Lněná halenka Firenze
  await prisma.product.create({
    data: {
      nazev: 'Lněná halenka Firenze',
      slug: 'lnena-halenka-firenze',
      popis: 'Vzdušná halenka z prvotřídního toskánského lnu s jemným stojáčkem a matnými perleťovými knoflíčky.',
      categoryId: catHalenky.id,
      cena: 1890,
      znacka: 'Toscana Style',
      material: '100% Premium toskánský len',
      udrzba: 'Praní v pračce na 30°C. Sušit volně vyvěšené.',
      sku: 'LF-HAL-002',
      aktivni: true,
      doporuceny: false,
      variants: {
        create: [
          {
            velikost: 'S/M',
            barva: 'Pískově hnědá',
            skladem: 4,
            miry: { obvodHrudniku: '94 cm', delka: '65 cm', rukav: '60 cm' },
          },
          {
            velikost: 'M/L',
            barva: 'Pískově hnědá',
            skladem: 6,
            miry: { obvodHrudniku: '100 cm', delka: '67 cm', rukav: '61 cm' },
          },
        ],
      },
    },
  });

  // Produkt 3: Kašmírový svetr Roma (Zlevněný)
  await prisma.product.create({
    data: {
      nazev: 'Kašmírový svetr Roma',
      slug: 'kasmirovy-svetr-roma',
      popis: 'Mimořádně hebký svetr pletený z prémiové směsi kašmíru a merina. Klasický kulatý výstřih a žebrované lemy.',
      categoryId: catSvetry.id,
      cena: 2990,
      cenaPoSleve: 2390,
      znacka: 'Roma Knitwear',
      material: '70% Kašmír, 30% Merino vlna',
      udrzba: 'Ruční praní ve studené vodě s přípravkem na kašmír.',
      sku: 'LF-SVE-003',
      aktivni: true,
      doporuceny: true,
      variants: {
        create: [
          {
            velikost: 'Univerzální (S–L)',
            barva: 'Espresso',
            skladem: 2,
            miry: { obvodHrudniku: '102 cm', delka: '62 cm' },
          },
        ],
      },
    },
  });

  // Produkt 4: Vlněný kabát Venezia
  await prisma.product.create({
    data: {
      nazev: 'Vlněný kabát Venezia',
      slug: 'vlneny-kabat-venezia',
      popis: 'Luxusní dvouřadý kabát s příměsí kašmíru v hlubokém koňakovém odstínu. Široké klopy a vázačka v pase.',
      categoryId: catKabaty.id,
      cena: 5490,
      znacka: 'Venezia Tailoring',
      material: '80% Vlna, 20% Kašmír',
      udrzba: 'Pouze chemické čištění.',
      sku: 'LF-KAB-004',
      aktivni: true,
      doporuceny: true,
      variants: {
        create: [
          {
            velikost: '38',
            barva: 'Koňaková',
            skladem: 1,
            miry: { obvodHrudniku: '96 cm', pas: '88 cm', delka: '110 cm' },
          },
          {
            velikost: '40',
            barva: 'Koňaková',
            skladem: 3,
            miry: { obvodHrudniku: '100 cm', pas: '92 cm', delka: '112 cm' },
          },
        ],
      },
    },
  });

  // Produkt 5: Dárkový poukaz LINDA FASHION (jeDarkovyPoukaz = true)
  await prisma.product.create({
    data: {
      nazev: 'Dárkový poukaz LINDA FASHION',
      slug: 'darkovy-poukaz-linda-fashion',
      popis: 'Předat radost z italské módy nebylo nikdy jednodušší. Luxusní fyzická dárková karta tištěná na tvrdém papíru v dárkové obálce se zapečetěným věnováním.',
      categoryId: catPoukazy.id,
      cena: 1000,
      sku: 'LF-GIFT-CARD',
      aktivni: true,
      doporuceny: false,
      jeDarkovyPoukaz: true,
      variants: {
        create: [
          { velikost: '500 Kč', skladem: 100 },
          { velikost: '1000 Kč', skladem: 100 },
          { velikost: '2000 Kč', skladem: 100 },
          { velikost: '5000 Kč', skladem: 100 },
        ],
      },
    },
  });

  // 6. Slevové Kódy
  await prisma.discountCode.create({
    data: {
      kod: 'VITAJTE10',
      procentoSlevy: 10,
      aktivni: true,
      limitPouziti: 100,
      pocetPouziti: 5,
    },
  });

  await prisma.discountCode.create({
    data: {
      kod: 'LINDA15',
      procentoSlevy: 15,
      aktivni: true,
      limitPouziti: 50,
      pocetPouziti: 12,
    },
  });

  // 7. Dárkové Poukazy
  await prisma.giftCard.create({
    data: {
      kod: 'GIFT-LINDA-1000-XYZ',
      castka: 1000,
      zustatek: 1000,
      aktivni: true,
    },
  });

  console.log('✅ Seedování databáze LINDA FASHION bylo úspěšně dokončeno!');
}

main()
  .catch((e) => {
    console.error('❌ Chyba při seedování:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
