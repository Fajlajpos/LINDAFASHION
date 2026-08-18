-- Cenová evidence musí přežít smazání produktu + čl. 12 nařízení (EU) 1007/2011.
--
-- Dvě opravy předchozí migrace:
--
-- 1. `PriceHistory` visela na produktu přes ON DELETE CASCADE. Smazání produktu
--    v administraci tím tiše zahodilo i jeho cenovou evidenci – tedy přesně to,
--    co má doložit, za kolik se zboží nabízelo. Kaskáda je pohodlná u fotek
--    a variant, ale u důkazního záznamu je to způsob, jak o něj přijít
--    nedopatřením. RESTRICT nutí endpoint rozhodnout vědomě.
--
-- 2. Chyběl údaj o netextilních částech živočišného původu. Nařízení o textilu
--    ho žádá samostatnou větou; složením vláken se nesplní, protože to popisuje
--    jen textilní část výrobku (kožený pásek u vlněného kabátu v něm není).

ALTER TABLE "PriceHistory" DROP CONSTRAINT "PriceHistory_productId_fkey";

ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Product" ADD COLUMN "obsahujeZivocisneCasti" BOOLEAN NOT NULL DEFAULT false;

-- Výchozí `false` je vědomá volba, ne domněnka: uvést větu o živočišných
-- částech u výrobku, který je nemá, je stejná vada jako ji zamlčet u toho,
-- který je má. Vyplňuje se u konkrétního kusu ručně.
