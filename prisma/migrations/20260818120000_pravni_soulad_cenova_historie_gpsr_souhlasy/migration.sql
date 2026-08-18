-- Právní soulad e-shopu: cenová evidence, GPSR, doložitelné souhlasy.
--
-- Tři nezávislé povinnosti, které padly do jedné migrace, protože se všechny
-- týkají údajů, jež do téhle chvíle e-shop vůbec nesbíral:
--
--   1. § 12a zák. č. 634/1992 Sb. – u slevy se musí uvádět nejnižší cena za
--      30 dnů před jejím poskytnutím a prodávající ji musí umět doložit.
--      Bez tabulky `PriceHistory` neexistuje z čeho ji spočítat: přepsáním
--      `Product.cena` se předchozí hodnota nenávratně ztratí.
--   2. Nařízení (EU) 2023/988 (GPSR) – u výrobku musí být uveden výrobce
--      a kontakt, u výrobce mimo EU i odpovědná osoba v EU.
--   3. Čl. 7 odst. 1 GDPR – souhlas musí být doložitelný. Souhlas s cookies
--      žil jen v `localStorage` prohlížeče, takže e-shop v ruce neměl nic.

-- ---------------------------------------------------------------- souhlasy
CREATE TYPE "TypSouhlasu" AS ENUM ('COOKIES', 'NEWSLETTER', 'OBCHODNI_PODMINKY');

CREATE TABLE "SouhlasZaznam" (
    "id" TEXT NOT NULL,
    "typ" "TypSouhlasu" NOT NULL,
    "subjekt" TEXT NOT NULL,
    "udeleno" BOOLEAN NOT NULL,
    "podrobnosti" JSONB,
    "verze" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SouhlasZaznam_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SouhlasZaznam_subjekt_typ_createdAt_idx" ON "SouhlasZaznam"("subjekt", "typ", "createdAt");
CREATE INDEX "SouhlasZaznam_typ_createdAt_idx" ON "SouhlasZaznam"("typ", "createdAt");

-- Doložení double opt-inu u newsletteru. `potvrzeno = true` samo o sobě
-- u kontroly neobstojí – doložit je potřeba kdy a odkud souhlas přišel.
ALTER TABLE "NewsletterSubscriber" ADD COLUMN     "ipPotvrzeni" TEXT,
ADD COLUMN     "ipPrihlaseni" TEXT,
ADD COLUMN     "potvrzenoAt" TIMESTAMP(3);

-- Stávající potvrzení se **nebackfillují**. Vymyslet k nim čas a IP by
-- znamenalo vyrobit důkaz, který neexistuje – a evidence souhlasů, které si
-- správce dopsal sám, je horší než přiznaná mezera. Prázdné `potvrzenoAt`
-- u starých řádků je tedy záměr, ne opomenutí.

-- ------------------------------------------------------------ cenová evidence
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "cenaHaleru" INTEGER NOT NULL,
    "zakladniCenaHaleru" INTEGER NOT NULL,
    "jeSleva" BOOLEAN NOT NULL DEFAULT false,
    "platnaOd" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "zdroj" TEXT NOT NULL,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PriceHistory_productId_platnaOd_idx" ON "PriceHistory"("productId", "platnaOd");

ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Product" ADD COLUMN     "nejnizsiCena30DniHaleru" INTEGER,
ADD COLUMN     "slevaOd" TIMESTAMP(3);

-- Výchozí bod evidence pro produkty, které v katalogu už jsou.
--
-- Bez tohohle řádku by měl každý stávající produkt prázdnou historii a první
-- zlevnění by nemělo z čeho počítat referenční cenu. `platnaOd` schválně není
-- `now()`, ale `createdAt` produktu: to je nejbližší pravdě, kterou o jeho
-- ceně zpětně víme, a nepředstírá, že evidence začala až dnes.
INSERT INTO "PriceHistory" ("id", "productId", "cenaHaleru", "zakladniCenaHaleru", "jeSleva", "platnaOd", "zdroj")
SELECT
    gen_random_uuid()::text,
    "id",
    ROUND(COALESCE("cenaPoSleve", "cena") * 100)::int,
    ROUND("cena" * 100)::int,
    "cenaPoSleve" IS NOT NULL,
    "createdAt",
    'migrace:pocatecni-stav'
FROM "Product";

-- Produkty, které mají slevu už teď, potřebují referenční cenu hned – jinak by
-- do doby první změny ceny zobrazovaly přeškrtnutou cenu bez zákonného údaje.
--
-- Použije se základní cena `cena`. Je to nejlepší doložitelný odhad: skutečnou
-- historii za posledních 30 dnů e-shop nesbíral, a `cena` je poslední známá
-- cena bez slevy. Rozhodně se nesmí použít `cenaPoSleve` – tím by referenční
-- cena spadla na akční a sleva by se vykazovala sama ze sebe.
UPDATE "Product"
SET "nejnizsiCena30DniHaleru" = ROUND("cena" * 100)::int,
    "slevaOd" = COALESCE("updatedAt", "createdAt")
WHERE "cenaPoSleve" IS NOT NULL;

-- ------------------------------------------------------------------- GPSR
ALTER TABLE "Product" ADD COLUMN     "bezpecnostniUpozorneni" TEXT,
ADD COLUMN     "cisloSarze" TEXT,
ADD COLUMN     "ean" TEXT,
ADD COLUMN     "odpovednaOsobaAdresa" TEXT,
ADD COLUMN     "odpovednaOsobaEmail" TEXT,
ADD COLUMN     "odpovednaOsobaNazev" TEXT,
ADD COLUMN     "slozeniMaterialu" TEXT,
ADD COLUMN     "vyrobceAdresa" TEXT,
ADD COLUMN     "vyrobceEmail" TEXT,
ADD COLUMN     "vyrobceNazev" TEXT,
ADD COLUMN     "zemePuvodu" TEXT;

-- Sloupce zůstávají nullable schválně. Údaje o výrobci nelze vymyslet a
-- povinné `NOT NULL` by migraci na produkci shodilo na stávajících řádcích.
-- Vynucuje je proto validace při ukládání produktu (`produktSchema`) plus
-- kontrolní výpis v administraci, který nevyplněné produkty vypíše.

-- --------------------------------------------------- objednávka jako doklad
ALTER TABLE "Order" ADD COLUMN     "datumDoruceni" TIMESTAMP(3),
ADD COLUMN     "datumExpedice" TIMESTAMP(3),
ADD COLUMN     "dphHaleru" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ipObjednavky" TEXT,
ADD COLUMN     "jePlatceDph" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sazbaDph" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "souhlasPodminkyAt" TIMESTAMP(3),
ADD COLUMN     "verzePodminek" TEXT;

-- `souhlasPodminkyAt` u starých objednávek zůstává prázdné ze stejného důvodu
-- jako u newsletteru: zpětně doplněný souhlas není souhlas.

-- --------------------------------------------- reklamace a odstoupení
ALTER TABLE "Reklamace" ADD COLUMN     "email" TEXT,
ADD COLUMN     "lhutaDo" TIMESTAMP(3),
ADD COLUMN     "potvrzeniOdeslanoAt" TIMESTAMP(3);

-- `token` se přidává ve třech krocích, ne jedním `ADD COLUMN ... NOT NULL`.
--
-- Prisma vygeneruje právě ten jednokrokový příkaz, protože `@default(cuid())`
-- se plní v klientovi a v databázi žádný default nevznikne. Na prázdné tabulce
-- projde, na produkci s jedinou reklamací spadne na „column contains null
-- values" – a to je přesně ten druh migrace, který se objeví až při nasazení.
ALTER TABLE "Reklamace" ADD COLUMN "token" TEXT;

UPDATE "Reklamace" SET "token" = gen_random_uuid()::text WHERE "token" IS NULL;

ALTER TABLE "Reklamace" ALTER COLUMN "token" SET NOT NULL;

CREATE UNIQUE INDEX "Reklamace_token_key" ON "Reklamace"("token");
CREATE INDEX "Reklamace_lhutaDo_idx" ON "Reklamace"("lhutaDo");

-- Lhůta u běžících reklamací. Třicet dnů běží od uplatnění, tedy od
-- `datumPrijeti` – u už vyřízených se dopočítávat nemusí, ale je to levnější
-- než rozlišovat, a u sporu se hodí i zpětně.
UPDATE "Reklamace" SET "lhutaDo" = "datumPrijeti" + INTERVAL '30 days' WHERE "lhutaDo" IS NULL;

-- --------------------------------------------------------------- nastavení
ALTER TABLE "Settings" ADD COLUMN     "adresaProVraceni" TEXT,
ADD COLUMN     "emailProGdpr" TEXT,
ADD COLUMN     "sazbaDph" INTEGER NOT NULL DEFAULT 21,
ADD COLUMN     "verzePodminek" TEXT NOT NULL DEFAULT '1',
ADD COLUMN     "zapisVRejstriku" TEXT;
