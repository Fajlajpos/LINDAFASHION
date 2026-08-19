# Záznamy o činnostech zpracování

**Čl. 30 nařízení (EU) 2016/679 (GDPR)**

> Tenhle dokument je **papír, ne kód**. Aplikace ho nikde negeneruje ani nečte.
> Je to ale první věc, kterou ÚOOÚ při kontrole chce vidět — dřív než cokoliv na webu.
>
> **Než ho použijete, doplňte údaje v hranatých závorkách.** Vymyšlené údaje jsou
> horší než prázdné pole: dokument s nesprávným správcem nedokládá nic.
>
> Obsah odpovídá stavu kódu k **18. 8. 2026**. Když přibude nový účel zpracování
> (recenze, věrnostní program, chat), patří sem nový řádek — jinak záznamy
> přestanou být pravdivé, aniž by si toho kdokoliv všiml.

---

## 1. Správce

| Údaj | Hodnota |
|---|---|
| Název | [DOPLNIT — obchodní firma / jméno podnikatele] |
| Sídlo | [DOPLNIT] |
| IČO | [DOPLNIT] |
| Kontaktní e-mail | [DOPLNIT] |
| Kontakt pro subjekty údajů | [DOPLNIT — např. gdpr@…, zadává se i v administraci jako `emailProGdpr`] |
| Pověřenec (DPO) | **Nejmenován.** Nejde o orgán veřejné moci, hlavní činností není rozsáhlé pravidelné monitorování ani zpracování zvláštních kategorií údajů (čl. 37 odst. 1). |

**Zástupce podle čl. 27:** nerelevantní, správce je usazen v ČR.

---

## 2. Přehled činností zpracování

### 2.1 Vyřízení objednávky a doručení zboží

| | |
|---|---|
| **Účel** | Uzavření a plnění kupní smlouvy, dodání zboží, komunikace o objednávce |
| **Právní titul** | Čl. 6 odst. 1 písm. b) — plnění smlouvy |
| **Kategorie subjektů** | Zákaznice a zákazníci e-shopu (spotřebitelé), včetně nakupujících bez registrace |
| **Kategorie údajů** | Jméno a příjmení, dodací a fakturační adresa, e-mail, telefon, obsah objednávky, částka, způsob platby a dopravy |
| **Příjemci** | Dopravce (samostatný správce), poskytovatel platební brány, poskytovatel serveru a e-mailové služby (zpracovatelé) |
| **Předání mimo EU** | Ne |
| **Lhůta pro výmaz** | Po dobu trvání smlouvy a záruční doby; účetní část 10 let (viz 2.2) |
| **Technická opatření** | HTTPS, hesla hashovaná bcryptem, session v HttpOnly cookie, přístup do administrace jen pro roli ADMIN, audit log administrátorských zásahů |

### 2.2 Vedení účetnictví a daňová evidence

| | |
|---|---|
| **Účel** | Splnění povinností podle zákona o účetnictví a zákona o DPH |
| **Právní titul** | Čl. 6 odst. 1 písm. c) — právní povinnost |
| **Kategorie údajů** | Fakturační údaje, částky, datum uskutečnění plnění, sazba a výše DPH |
| **Příjemci** | Účetní/daňový poradce, na vyžádání finanční správa |
| **Lhůta pro výmaz** | 10 let od konce zdaňovacího období, ve kterém se plnění uskutečnilo |
| **Poznámka** | Objednávky se proto **nemažou** ani na žádost o výmaz. Účet se anonymizuje, doklad zůstává bez vazby na osobu. |

### 2.3 Doklad o uzavření smlouvy na dálku

| | |
|---|---|
| **Účel** | Doložit, kdy, odkud a s jakým zněním podmínek byla objednávka odeslána |
| **Právní titul** | Čl. 6 odst. 1 písm. f) — oprávněný zájem (obhajoba právních nároků) |
| **Kategorie údajů** | IP adresa objednávky, čas souhlasu, verze obchodních podmínek |
| **Lhůta pro výmaz** | IP adresa **12 měsíců** (maže ji automatická retenční úloha), zbytek s objednávkou |
| **Test proporcionality** | Zájem: unést důkazní břemeno u sporu o uzavření smlouvy. Zásah je minimální (jediný technický údaj), subjekt nákup sám inicioval, IP se maže dřív než zbytek dokladu. |

### 2.4 Zákaznický účet

| | |
|---|---|
| **Účel** | Správa objednávek, uložené adresy, oblíbené položky, obsah košíku |
| **Právní titul** | Čl. 6 odst. 1 písm. b) — plnění smlouvy (poskytnutí účtu) |
| **Kategorie údajů** | E-mail, jméno, telefon, hash hesla, adresy, historie objednávek |
| **Lhůta pro výmaz** | Po dobu existence účtu; po žádosti o výmaz anonymizace. Nepoužitý košík se maže po 12 měsících. |

### 2.5 Reklamace, vrácení a odstoupení od smlouvy

| | |
|---|---|
| **Účel** | Vyřízení reklamace a odstoupení od smlouvy včetně zákonného potvrzení |
| **Právní titul** | Čl. 6 odst. 1 písm. c) — právní povinnost (§ 19 zák. 634/1992 Sb., § 1829 a § 1830a o. z.) |
| **Kategorie údajů** | E-mail, číslo objednávky, popis vady, datum a čas přijetí, průběh vyřízení |
| **Lhůta pro výmaz** | 4 roky od vyřízení (promlčecí lhůta) |

### 2.6 Zasílání obchodních sdělení (newsletter)

| | |
|---|---|
| **Účel** | Zasílání novinek a nabídek |
| **Právní titul** | Čl. 6 odst. 1 písm. a) — souhlas, potvrzený double opt-inem |
| **Kategorie údajů** | E-mail, datum a IP přihlášení, datum a IP potvrzení, datum odhlášení |
| **Lhůta pro výmaz** | Do odvolání souhlasu; doklad o odhlášení 36 měsíců, nepotvrzená přihláška se maže po 30 dnech |
| **Poznámka** | Potvrzení i odhlášení jsou POST, ne GET — náhled v poštovním klientovi by jinak souhlas vyrobil sám. |

### 2.7 Dotazy z kontaktního formuláře

| | |
|---|---|
| **Účel** | Odpovědět na dotaz |
| **Právní titul** | Čl. 6 odst. 1 písm. f) — oprávněný zájem |
| **Kategorie údajů** | Jméno, e-mail, text zprávy |
| **Lhůta pro výmaz** | 12 měsíců (automatická retenční úloha) |

### 2.8 Hlídání dostupnosti velikosti

| | |
|---|---|
| **Účel** | Poslat zprávu, až bude zboží zase skladem |
| **Právní titul** | Čl. 6 odst. 1 písm. a) — souhlas |
| **Kategorie údajů** | E-mail, hlídaná varianta |
| **Lhůta pro výmaz** | 90 dnů po odeslání upozornění, nejdéle 12 měsíců |

### 2.9 Cookies, měření návštěvnosti a marketing

| | |
|---|---|
| **Účel** | Provoz webu (nezbytné), měření návštěvnosti a marketing (volitelné) |
| **Právní titul** | Nezbytné cookies čl. 6 odst. 1 písm. f); analytické a marketingové **výhradně souhlas** čl. 6 odst. 1 písm. a) |
| **Kategorie údajů** | Náhodný identifikátor souhlasu, rozsah souhlasu, IP a user agent u záznamu souhlasu |
| **Příjemci** | Google (GA4), Meta (Pixel) — **jen po udělení souhlasu** |
| **Předání mimo EU** | Možné u analytických nástrojů; na základě standardních smluvních doložek podle čl. 46 |
| **Lhůta pro výmaz** | Záznam o souhlasu 36 měsíců |
| **Poznámka** | Identifikátor návštěvnice je `crypto.randomUUID()`, **není** odvozen z IP ani z otisku prohlížeče. Odvozený klíč by sám byl tím sledováním, které má souhlas teprve povolit. |

### 2.10 Audit administrátorských zásahů

| | |
|---|---|
| **Účel** | Dohledat, kdo a kdy v e-shopu co změnil |
| **Právní titul** | Čl. 6 odst. 1 písm. f) — oprávněný zájem (bezpečnost zpracování, čl. 32) |
| **Kategorie subjektů** | Administrátoři (majitelka, případně zaměstnankyně) |
| **Kategorie údajů** | E-mail administrátora, akce, dotčený záznam, čas |
| **Lhůta pro výmaz** | 24 měsíců (automatická retenční úloha) |

---

## 3. Obecná technická a organizační opatření (čl. 32)

- Komunikace šifrovaná (HTTPS), hesla ukládaná jako bcrypt hash, nikdy v čitelné podobě.
- Relace v HttpOnly cookie s podpisem; při změně hesla se všechny dosud vydané relace ruší.
- Administrace je chráněna dvakrát: middleware a kontrola role v databázi u každého endpointu.
- Omezení počtu pokusů (rate limiting) u přihlášení, kontaktního formuláře a veřejných formulářů.
- Přístup k databázi jen z aplikačního serveru, databáze není vystavena do internetu.
- Automatická retenční úloha maže osobní údaje po uplynutí lhůt (viz `src/lib/retence.ts`).
- Zálohy: **[DOPLNIT — kdo je dělá, jak často, kde leží a jak dlouho se drží]**.

---

## 4. Postup při porušení zabezpečení (čl. 33 a 34)

1. Zaznamenat, co se stalo, kdy, kolika osob se to týká a jaké údaje jsou dotčené.
2. Zastavit únik (změnit hesla, odebrat přístup, nasadit opravu).
3. **Do 72 hodin** od zjištění ohlásit ÚOOÚ, pokud je pravděpodobné riziko pro práva a svobody
   subjektů údajů.
4. Je-li riziko vysoké, informovat i dotčené osoby, bez zbytečného odkladu a srozumitelně.
5. Zapsat případ do interní evidence porušení — vede se **vždy**, i když se neohlašuje.

---

*Poslední revize: 18. 8. 2026. Dokument revidujte při každé změně účelů zpracování,
příjemců nebo retenčních lhůt.*
