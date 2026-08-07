-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('FAKTURACNI', 'DODACI');

-- CreateEnum
CREATE TYPE "ImageProcessingStatus" AS ENUM ('CEKA', 'ZPRACOVAVA_SE', 'HOTOVO', 'CHYBA');

-- CreateEnum
CREATE TYPE "ZrusilKdo" AS ENUM ('ZAKAZNICE', 'ADMIN');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('NOVA', 'ZPRACOVAVA_SE', 'EXPEDOVANA', 'DORUCENA', 'ZRUSENA', 'VRACENA');

-- CreateEnum
CREATE TYPE "ReklamaceTyp" AS ENUM ('REKLAMACE', 'VRACENI');

-- CreateEnum
CREATE TYPE "ReklamaceStav" AS ENUM ('PRIJATA', 'RESI_SE', 'VYRIZENA_UZNANA', 'VYRIZENA_ZAMITNUTA');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "jmeno" TEXT,
    "telefon" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "newsletterSouhlas" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jmenoPrijmeni" TEXT NOT NULL,
    "ulice" TEXT NOT NULL,
    "mesto" TEXT NOT NULL,
    "psc" TEXT NOT NULL,
    "zeme" TEXT NOT NULL DEFAULT 'CZ',
    "telefon" TEXT,
    "jeVychozi" BOOLEAN NOT NULL DEFAULT false,
    "typ" "AddressType" NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "nazev" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "popis" TEXT,
    "obrazek" TEXT,
    "poradi" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "nazev" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "popis" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "cena" DECIMAL(65,30) NOT NULL,
    "cenaPoSleve" DECIMAL(65,30),
    "znacka" TEXT,
    "material" TEXT,
    "udrzba" TEXT,
    "sku" TEXT,
    "aktivni" BOOLEAN NOT NULL DEFAULT true,
    "doporuceny" BOOLEAN NOT NULL DEFAULT false,
    "jeDarkovyPoukaz" BOOLEAN NOT NULL DEFAULT false,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "velikost" TEXT NOT NULL,
    "barva" TEXT,
    "skladem" INTEGER NOT NULL DEFAULT 0,
    "miry" JSONB,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pripomenutoAt" TIMESTAMP(3),

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "mnozstvi" INTEGER NOT NULL,
    "upozornenoNaSklad" BOOLEAN NOT NULL DEFAULT false,
    "pridanoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT,
    "urlMedium" TEXT,
    "urlThumb" TEXT,
    "sirka" INTEGER,
    "vyska" INTEGER,
    "altText" TEXT,
    "poradi" INTEGER NOT NULL DEFAULT 0,
    "jeHlavni" BOOLEAN NOT NULL DEFAULT false,
    "stavZpracovani" "ImageProcessingStatus" NOT NULL DEFAULT 'CEKA',
    "chybaDuvod" TEXT,
    "originalSoubor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "cisloObjednavky" TEXT NOT NULL,
    "stav" "OrderStatus" NOT NULL DEFAULT 'NOVA',
    "celkovaCena" DECIMAL(65,30) NOT NULL,
    "discountCodeId" TEXT,
    "giftCardId" TEXT,
    "castkaZGiftCard" DECIMAL(65,30),
    "zpusobDopravy" TEXT NOT NULL,
    "vydejniMistoId" TEXT,
    "vydejniMistoNazev" TEXT,
    "zpusobPlatby" TEXT NOT NULL,
    "stavPlatby" TEXT NOT NULL,
    "cisloZasilky" TEXT,
    "poznamka" TEXT,
    "zrusil" "ZrusilKdo",
    "dodaciJmenoPrijmeni" TEXT NOT NULL,
    "dodaciUlice" TEXT NOT NULL,
    "dodaciMesto" TEXT NOT NULL,
    "dodaciPsc" TEXT NOT NULL,
    "dodaciZeme" TEXT NOT NULL DEFAULT 'CZ',
    "dodaciTelefon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "mnozstvi" INTEGER NOT NULL,
    "cenaVDobeNakupu" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "upozornenoNaSklad" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountCode" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "procentoSlevy" INTEGER NOT NULL,
    "platnyOd" TIMESTAMP(3),
    "platnyDo" TIMESTAMP(3),
    "limitPouziti" INTEGER,
    "pocetPouziti" INTEGER NOT NULL DEFAULT 0,
    "aktivni" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCard" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "castka" DECIMAL(65,30) NOT NULL,
    "zustatek" DECIMAL(65,30) NOT NULL,
    "platnyDo" TIMESTAMP(3),
    "aktivni" BOOLEAN NOT NULL DEFAULT true,
    "vytvorenoZObjednavkyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "rezimDovolene" BOOLEAN NOT NULL DEFAULT false,
    "datumNavratu" TIMESTAMP(3),
    "zpravaProZakazniky" TEXT,
    "zablokovatObjednavky" BOOLEAN NOT NULL DEFAULT false,
    "nazevFirmy" TEXT,
    "icoFirmy" TEXT,
    "dicFirmy" TEXT,
    "adresaFirmy" TEXT,
    "telefonFirmy" TEXT,
    "emailFirmy" TEXT,
    "jePlatceDph" BOOLEAN NOT NULL DEFAULT false,
    "socialInstagram" TEXT,
    "socialFacebook" TEXT,
    "cenaDopravyZasilkovna" DECIMAL(65,30),
    "cenaDopravyPPL" DECIMAL(65,30),
    "cenaDopravyCeskaPosta" DECIMAL(65,30),
    "prahDopravaZdarma" DECIMAL(65,30),

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "potvrzeno" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockNotification" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "vyrizeno" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reklamace" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT,
    "typ" "ReklamaceTyp" NOT NULL,
    "stav" "ReklamaceStav" NOT NULL DEFAULT 'PRIJATA',
    "duvod" TEXT,
    "poznamkaAdmina" TEXT,
    "datumPrijeti" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "datumVyrizeni" TIMESTAMP(3),

    CONSTRAINT "Reklamace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "akce" TEXT NOT NULL,
    "entita" TEXT NOT NULL,
    "entitaId" TEXT,
    "podrobnosti" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_aktivni_createdAt_idx" ON "Product"("aktivni", "createdAt");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_userId_key" ON "Cart"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_variantId_key" ON "CartItem"("cartId", "variantId");

-- CreateIndex
CREATE INDEX "ProductImage_productId_poradi_idx" ON "ProductImage"("productId", "poradi");

-- CreateIndex
CREATE UNIQUE INDEX "Order_cisloObjednavky_key" ON "Order"("cisloObjednavky");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_stav_createdAt_idx" ON "Order"("stav", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_productId_key" ON "Favorite"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCode_kod_key" ON "DiscountCode"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCard_kod_key" ON "GiftCard"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "DiscountCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "GiftCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_vytvorenoZObjednavkyId_fkey" FOREIGN KEY ("vytvorenoZObjednavkyId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockNotification" ADD CONSTRAINT "StockNotification_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reklamace" ADD CONSTRAINT "Reklamace_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reklamace" ADD CONSTRAINT "Reklamace_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
