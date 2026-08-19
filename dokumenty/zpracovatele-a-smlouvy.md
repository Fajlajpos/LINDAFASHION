# Zpracovatelé osobních údajů a smlouvy podle čl. 28 GDPR

> Každý, kdo pro e-shop zpracovává osobní údaje **podle jeho pokynů**, je zpracovatel
> a musí mít uzavřenou smlouvu o zpracování osobních údajů (DPA). Bez ní je předání
> údajů porušením čl. 28 odst. 3 — a to i tehdy, když je služba jinak v pořádku.
>
> Dobrá zpráva: u naprosté většiny služeb **není potřeba nic vyjednávat**. DPA bývá
> součástí obchodních podmínek nebo se odklikne v administraci účtu. Špatná zpráva:
> nikdo to za vás neudělá a při kontrole se dokládá kopie.
>
> **Tenhle seznam je připravený dopředu.** Služby se doplní, až budou skutečně
> nasazené — s API klíči a hostingem. Do té doby se z e-shopu žádné údaje nikam
> nepředávají, protože se z něj nic neodesílá.

---

## Kdo je zpracovatel a kdo ne

| Role | Co znamená | Potřebuje DPA? |
|---|---|---|
| **Zpracovatel** | Zpracovává údaje podle našich pokynů (hosting, e-mail, analytika) | **Ano** |
| **Samostatný správce** | Určuje si účel sám (dopravce, platební brána) | Ne, ale patří do informací o příjemcích |
| **Společní správci** | Určují účel společně (některé marketingové nástroje) | Dohoda podle čl. 26 |

Dopravce a platební brána jsou obvykle **samostatní správci** — údaje jim předáváme
kvůli plnění smlouvy, ale s naším zbožím pak nakládají podle svých pravidel.
Zákaznici se o nich musí říct v zásadách ochrany údajů, DPA se s nimi ale neuzavírá.

---

## Kontrolní seznam

Vyplňte, až služba poběží. Sloupec „doklad" = kde leží podepsaná smlouva
nebo potvrzení o akceptaci podmínek.

| # | Služba | Role | Co zpracovává | Stav | Doklad |
|---|---|---|---|---|---|
| 1 | Poskytovatel serveru / VPS | zpracovatel | Vše, co je v databázi a v logu | ☐ nevyřešeno | |
| 2 | Poskytovatel SMTP (odesílání e-mailů) | zpracovatel | E-mail, jméno, obsah transakčních zpráv | ☐ nevyřešeno | |
| 3 | GoPay (platební brána) | samostatný správce | Platební údaje, částka, identifikátor objednávky | ☐ nevyřešeno | |
| 4 | Zásilkovna / PPL / Česká pošta | samostatný správce | Jméno, adresa, telefon, e-mail | ☐ nevyřešeno | |
| 5 | Google (GA4) | zpracovatel / společný správce | Identifikátory a chování na webu | ☐ nevyřešeno | |
| 6 | Meta (Pixel) | společní správci (čl. 26) | Identifikátory a chování na webu | ☐ nevyřešeno | |
| 7 | Cloudflare (Turnstile, případně CDN) | zpracovatel | IP adresa, technické údaje o požadavku | ☐ nevyřešeno | |
| 8 | Účetní / daňový poradce | zpracovatel (nebo samostatný správce) | Fakturační údaje | ☐ nevyřešeno | |
| 9 | Zálohovací služba, pokud je jiná než hosting | zpracovatel | Kopie celé databáze | ☐ nevyřešeno | |

**Google a Meta se spouštějí až po souhlasu s cookies** — do té doby se z webu
neodesílá nic (viz `src/lib/souhlas-cookies.ts`). Smlouva je ale potřeba **dřív**,
než se klíče vloží do `.env`, ne až po první návštěvě.

---

## Co musí smlouva podle čl. 28 odst. 3 obsahovat

Kontrolní body pro případ, že vám dodavatel pošle vlastní text:

- [ ] Předmět, doba trvání, povaha a účel zpracování
- [ ] Kategorie subjektů údajů a druhy osobních údajů
- [ ] Zpracovatel jedná **jen podle doložených pokynů** správce
- [ ] Mlčenlivost osob, které mají k údajům přístup
- [ ] Technická a organizační opatření podle čl. 32
- [ ] Podmínky zapojení dalšího zpracovatele (subdodavatele) a informování o změnách
- [ ] Součinnost při vyřizování žádostí subjektů údajů (přístup, výmaz, přenositelnost)
- [ ] Součinnost při ohlašování porušení zabezpečení
- [ ] Po skončení služby: **výmaz nebo vrácení** všech údajů
- [ ] Umožnění auditu a poskytnutí podkladů k prokázání souladu
- [ ] Je-li server mimo EU: standardní smluvní doložky podle čl. 46

---

## Postup pro každou položku

1. Najít v dokumentaci služby „Data Processing Agreement" / „Zpracování osobních údajů".
2. Ověřit, kde služba **fyzicky ukládá data** (EU vs. mimo EU).
3. Přijmout DPA (obvykle jedno tlačítko v administraci účtu) a **uložit kopii nebo
   snímek obrazovky s datem**.
4. Doplnit řádek v tabulce výše a v `dokumenty/zaznamy-o-cinnostech-zpracovani.md`
   (kategorie příjemců).
5. Je-li služba nová a nestandardní, zmínit ji na stránce Ochrana osobních údajů.

---

*Poslední revize: 18. 8. 2026. Reviduje se při každém nasazení nové služby.*
