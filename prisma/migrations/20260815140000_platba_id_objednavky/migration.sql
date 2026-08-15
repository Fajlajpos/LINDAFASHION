-- Vazba objednávky na platbu u brány (GoPay).
--
-- Notifikace od brány i návratová adresa nesou pouze `id` platby – bez tohohle
-- sloupce nebylo podle čeho dohledat, které objednávky se platba týká.
--
-- Unikátní index je věcná podmínka, ne optimalizace: jedna platba smí označit
-- za zaplacenou nejvýš jednu objednávku. Bez něj by chyba v přiřazení (nebo
-- zopakovaná notifikace zapsaná k jinému řádku) uhradila dvě objednávky jednou
-- platbou a rozdíl by se ukázal až při párování s výpisem.
--
-- NULL se do unikátního indexu v Postgresu nepočítá, takže všechny objednávky
-- placené převodem mohou zůstat bez id vedle sebe.

ALTER TABLE "Order" ADD COLUMN "platbaId" TEXT;

CREATE UNIQUE INDEX "Order_platbaId_key" ON "Order"("platbaId");
