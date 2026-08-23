-- Odpovědná osoba v EU byla vyžadovaná jen „všechna tři pole, nebo žádné“.
--
-- Čl. 19 písm. b) GPSR ji ale u výrobce mimo Unii žádá vždy, a to je stav,
-- který schéma neumělo ani vyjádřit: prázdná odpovědná osoba byla vždycky
-- platná odpověď. Zboží od mimoevropského dodavatele tak šlo zveřejnit bez
-- kontaktu, na který se má spotřebitel i dozor obracet.
--
-- Odvodit to ze `zemePuvodu` nejde – ta popisuje, kde se výrobek vyrobil,
-- ne kde sídlí odpovědný subjekt. Proto vlastní příznak.

ALTER TABLE "Product" ADD COLUMN "vyrobceMimoEu" BOOLEAN NOT NULL DEFAULT false;

-- Kdo už odpovědnou osobu vyplněnou má, má ji právě proto, že výrobce sídlí
-- mimo EU. Bez tohohle doplnění by se příznak rozešel s údaji zapsanými
-- v témže řádku a validace by při první úpravě produktu nabídla ta pole
-- vymazat.
UPDATE "Product"
   SET "vyrobceMimoEu" = true
 WHERE "odpovednaOsobaNazev" IS NOT NULL
   AND btrim("odpovednaOsobaNazev") <> '';
