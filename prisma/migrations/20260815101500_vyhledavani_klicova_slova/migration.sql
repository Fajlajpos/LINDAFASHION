-- Vyhledávání podle klíčových slov: normalizovaný text k porovnávání.
--
-- Sloupce plní aplikace (`hledaciTextProduktu`, `hledaciNazevKategorie`
-- v src/lib/vyhledavani.ts) při každém zápisu. Tahle migrace je musí ještě
-- dopočítat pro řádky, které v databázi už jsou – bez toho by po nasazení
-- nešlo najít nic, dokud by majitelka každý produkt ručně neuložila znovu.

ALTER TABLE "Product" ADD COLUMN "hledaciText" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Category" ADD COLUMN "hledaciNazev" TEXT NOT NULL DEFAULT '';

-- Diakritiku odstraňuje `translate()`, ne `unaccent()`: `unaccent` je contrib
-- rozšíření, které musí být v databázi nejdřív povolené (`CREATE EXTENSION`),
-- a k tomu aplikační role na spravovaném Postgresu obvykle právo nemá.
-- `translate()` je vestavěné a pro češtinu stačí; jde o jednorázový dopočet,
-- ne o dotaz v horké cestě.
--
-- Mapování obsahuje velká i malá písmena, protože `lower()` běží až kolem –
-- sem přichází text tak, jak ho majitelka napsala. Pomocná funkce by byla
-- čitelnější, ale její tělo v dolarových uvozovkách obsahuje středník a ne
-- každý běhoun migrací posílá skript databázi vcelku; dvojí `translate()`
-- je za tuhle jistotu levná cena.
--
-- `regexp_replace(..., '[^a-z0-9]+', ' ', 'g')` sjednotí interpunkci
-- i vícenásobné mezery na jedinou mezeru, stejně jako `normalizovat()`
-- v TypeScriptu. Kdyby se ty dvě verze rozešly, hledání by po migraci
-- fungovalo jinak než po prvním uložení produktu v administraci.

UPDATE "Product" SET "hledaciText" = btrim(
  regexp_replace(
    lower(translate(
      concat_ws(' ', "nazev", "znacka", "popis", "sku", "material"),
      'áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽäöüÄÖÜàâêîôûçÀÂÊÎÔÛÇ',
      'acdeeinorstuuyzACDEEINORSTUUYZaouAOUaaeioucAAEIOUC'
    )),
    '[^a-z0-9]+', ' ', 'g'
  )
);

UPDATE "Category" SET "hledaciNazev" = btrim(
  regexp_replace(
    lower(translate(
      "nazev",
      'áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽäöüÄÖÜàâêîôûçÀÂÊÎÔÛÇ',
      'acdeeinorstuuyzACDEEINORSTUUYZaouAOUaaeioucAAEIOUC'
    )),
    '[^a-z0-9]+', ' ', 'g'
  )
);
