-- Zmrazený rozpis objednávky, odhlašovací token newsletteru a indexy reklamací.
--
-- Psáno ručně, ne vygenerováno: `NewsletterSubscriber.token` je NOT NULL UNIQUE
-- s výchozí hodnotou z aplikace (`cuid()`), takže by `ADD COLUMN ... NOT NULL`
-- na existujících řádcích selhal. Sloupec proto vzniká jako nullable, doplní se
-- a teprve pak se utáhne – stejný postup jako u `Order.verejnyToken`.

-- === Objednávka: rozpis jako součást účetního dokladu =======================
--
-- Do téhle chvíle si objednávka pamatovala jen `celkovaCena`. Sleva a doprava
-- se na faktuře dopočítávaly zpětně z aktuálního `procentoSlevy` slevového
-- kódu; změna procenta tak zpětně přepsala doklad pro dávno uzavřenou
-- objednávku a rozdíl spolkla doprava.
ALTER TABLE "Order" ADD COLUMN "mezisoucet"  DECIMAL(65,30) NOT NULL DEFAULT 0,
                    ADD COLUMN "slevaCastka" DECIMAL(65,30) NOT NULL DEFAULT 0,
                    ADD COLUMN "cenaDopravy" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- Dopočet pro objednávky založené dřív. Schválně **stejným** postupem, jaký
-- dosud používala faktura (`vygenerovat-fakturu.ts`) – aby se už vystavené
-- doklady po migraci nezměnily:
--   mezisoucet  = součet položek za ceny v době nákupu
--   sleva       = procento z mezisoučtu, zaokrouhlené na haléře dolů
--   doprava     = co zbývá do celkové ceny (nikdy záporné)
WITH soucty AS (
  SELECT oi."orderId" AS id,
         SUM(oi."mnozstvi" * oi."cenaVDobeNakupu") AS mezisoucet
    FROM "OrderItem" AS oi
   GROUP BY oi."orderId"
),
rozpis AS (
  SELECT o."id",
         COALESCE(s."mezisoucet", 0) AS mezisoucet,
         CASE
           WHEN dc."procentoSlevy" IS NULL THEN 0
           -- Peníze se v aplikaci počítají v celých haléřích a sleva se
           -- zaokrouhluje dolů, ať nikdy nepřesáhne to, co bylo slíbeno.
           ELSE FLOOR(ROUND(COALESCE(s."mezisoucet", 0) * 100) * dc."procentoSlevy" / 100) / 100
         END AS sleva
    FROM "Order" AS o
    LEFT JOIN soucty AS s ON s."id" = o."id"
    LEFT JOIN "DiscountCode" AS dc ON dc."id" = o."discountCodeId"
)
UPDATE "Order" AS o
   SET "mezisoucet"  = r."mezisoucet",
       "slevaCastka" = r."sleva",
       "cenaDopravy" = GREATEST(0, o."celkovaCena" - (r."mezisoucet" - r."sleva"))
  FROM rozpis AS r
 WHERE r."id" = o."id";

-- === Newsletter: odhlašovací token =========================================
--
-- Odhlašovací odkaz nesmí nést e-mail – kdokoliv by pak odhlásil kohokoliv,
-- komu uhodne adresu. Token je náhodný a patří k jedinému záznamu.
ALTER TABLE "NewsletterSubscriber" ADD COLUMN "token" TEXT;

-- `gen_random_uuid()` je v PostgreSQL 13+ součástí jádra. Tvar se od cuid liší,
-- ale token se nikde neparsuje – je to jen neuhodnutelný klíč.
UPDATE "NewsletterSubscriber" SET "token" = gen_random_uuid()::text WHERE "token" IS NULL;

ALTER TABLE "NewsletterSubscriber" ALTER COLUMN "token" SET NOT NULL;
CREATE UNIQUE INDEX "NewsletterSubscriber_token_key" ON "NewsletterSubscriber"("token");

-- === Reklamace: indexy =====================================================
-- Zákaznice si v účtu vypisuje reklamace ke svým objednávkám (`orderId`),
-- administrace je řadí podle stavu a data přijetí.
CREATE INDEX "Reklamace_orderId_idx" ON "Reklamace"("orderId");
CREATE INDEX "Reklamace_stav_datumPrijeti_idx" ON "Reklamace"("stav", "datumPrijeti");
