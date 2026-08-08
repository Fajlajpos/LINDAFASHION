-- Zprávy z webu, hlídání dostupnosti a veřejný token objednávky.
--
-- Psáno ručně, ne vygenerováno: `verejnyToken` je NOT NULL UNIQUE, ale jeho
-- výchozí hodnotu (`cuid()`) tvoří aplikace, ne databáze. Automaticky
-- vygenerovaný `ADD COLUMN ... NOT NULL` by tedy na jakékoliv už existující
-- objednávce selhal. Sloupec proto vzniká jako nullable, doplní se a teprve
-- pak se utáhne.

-- === Newsletter: odkud přihláška přišla a případné odhlášení ===============
ALTER TABLE "NewsletterSubscriber" ADD COLUMN "odhlasenAt" TIMESTAMP(3),
                                   ADD COLUMN "zdroj" TEXT;

-- === Objednávka: kontaktní e-mail a veřejný token ==========================
ALTER TABLE "Order" ADD COLUMN "email" TEXT,
                    ADD COLUMN "verejnyToken" TEXT;

-- Objednávky založené dřív e-mail nemají – u přihlášených zákaznic ho
-- doplníme z účtu, u objednávek bez registrace zůstane prázdný.
UPDATE "Order" AS o
   SET "email" = u."email"
  FROM "User" AS u
 WHERE o."userId" = u."id"
   AND o."email" IS NULL;

-- `gen_random_uuid()` je v PostgreSQL 13+ součástí jádra. Tvar se od cuid
-- liší, ale token se nikde neparsuje – je to jen náhodný neuhodnutelný klíč.
UPDATE "Order" SET "verejnyToken" = gen_random_uuid()::text WHERE "verejnyToken" IS NULL;

ALTER TABLE "Order" ALTER COLUMN "verejnyToken" SET NOT NULL;
CREATE UNIQUE INDEX "Order_verejnyToken_key" ON "Order"("verejnyToken");

-- === Hlídání dostupnosti: jeden e-mail hlídá jednu velikost jednou =========
-- Případné duplicity z doby bez unikátního indexu smažeme, ať index projde.
DELETE FROM "StockNotification" AS s
 USING "StockNotification" AS starsi
 WHERE s."variantId" = starsi."variantId"
   AND s."email" = starsi."email"
   AND s."id" <> starsi."id"
   AND (s."createdAt" > starsi."createdAt"
        OR (s."createdAt" = starsi."createdAt" AND s."id" > starsi."id"));

CREATE INDEX "StockNotification_vyrizeno_idx" ON "StockNotification"("vyrizeno");
CREATE UNIQUE INDEX "StockNotification_variantId_email_key" ON "StockNotification"("variantId", "email");

-- === Zprávy z kontaktního formuláře ========================================
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "jmeno" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "predmet" TEXT,
    "zprava" TEXT NOT NULL,
    "vyrizeno" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContactMessage_vyrizeno_createdAt_idx" ON "ContactMessage"("vyrizeno", "createdAt");
