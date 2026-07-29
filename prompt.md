# ZADÁNÍ: Kompletní e-shop LINDA FASHION (italská dámská móda)
 
> **Jak s tímhle souborem naložit:** Zkopíruj celý text níže a vlož ho jako zadání do AI nástroje, který bude e-shop reálně programovat (např. Claude Code, Cursor a podobně). Cílem je **funkční, kompletní a nasaditelný e-shop – ne vizuální maketa nebo prototyp na pár obrazovek.**
 
---
 
## Než začneš pracovat (přečti si jako první)
 
**Rozděl si práci mezi smyšlený tým specialistů** a v roli každého z nich systematicky pracuj na jeho části. Role mezi sebou průběžně "konzultuj", ať vše na sebe navazuje a nic si neodporuje:
 
- **Architekt řešení** – navrhne technickou architekturu, strukturu projektu a databázový model, koordinuje ostatní role.
- **Databázový vývojář** – navrhne a implementuje PostgreSQL schéma, migrace, napojení přes ORM.
- **Backend vývojář** – autentizace, API, logika objednávek, slevových kódů, režimu dovolené, příprava integrací plateb/dopravy.
- **Frontend/UI designér** – originální vizuální identita (sekce 2) a implementace veřejné části webu.
- **Vývojář administrace** – admin panel podle sekce 6, s důrazem na jednoduchost ovládání.
- **Specialista na SEO, GEO a legislativu** – technické SEO, strukturovaná data, právní náležitosti.
- **QA/tester** – po každé fázi ověří funkčnost, responzivitu a bezpečnost, než se pokračuje dál.
Dále:
- **Postupuj po fázích** podle sekce 17. Po každé fázi krátce shrň, co je hotové, než budeš pokračovat.
- Pokud na něco narazíš a nepůjde to udělat přesně dle zadání, zvol nejbližší rozumnou alternativu, okomentuj ji a pokračuj – neptej se zbytečně na drobnosti.
- Tento dokument obsahuje i věci, které nebyly výslovně požadované, ale dávají smysl pro reálně fungující e-shop (označené jako "doporučeno navíc"). Ber je jako součást zadání, ne jako volitelnou třešničku.
---
 
## 1. O projektu a značce
 
LINDA FASHION je butik prodávající italskou dámskou módu – kvalitní, elegantní a nadčasové oblečení dovážené z Itálie, ne rychlá móda.
 
> **Poznámka k výzkumu:** Zkoušel jsem dohledat konkrétní obchod přes odkaz, který mi zadavatel poslal, ale Google tyto sdílené odkazy technicky chrání proti automatickému stažení (robots.txt), a obchod se mi nepodařilo najít ani přes běžné vyhledávání – jde zjevně o menší/lokální podnik, který zatím nemá silnou přítomnost na webu. Vše níže proto vychází z toho, co bylo výslovně zadáno. Konkrétní fakta o obchodu (skutečné jméno majitelky, její příběh, adresa, IČO) doplní zadavatel/majitelka přímo – v textech níže na to počítej s placeholdery.
 
> **Co se doplní až časem (systém na to musí být připravený, ale bez toho musí normálně fungovat):** reálné fotografie produktů a sekce O mně dodá zadavatel/majitelka postupně (sekce 2, 6.2, 9) – **nikde na webu se nesmí použít AI-generované obrázky**, ani jako "dočasný" obsah, jen čisté grafické placeholdery (barva/vzor/ikona) do doby, než dorazí skutečné fotky. Stejně tak API klíče pro GoPay, Zásilkovnu, PPL, Českou poštu a e-mail (sekce 8, 16) zatím nejsou k dispozici – e-shop musí fungovat i bez nich (dočasně přes bankovní převod, žádná dobírka – sekce 8), klíče se doplní později jen do `.env`, bez zásahu do kódu.
 
Charakter značky:
- **Prémiová, ale rodinná/blízká** – zákazník má cítit kvalitu a exkluzivitu, zároveň vřelost a osobní přístup, ne chladnou velkou korporaci.
- Majitelka (v textu pracovně "Linda", dle názvu obchodu) bude mít vlastní sekci **O mně** se svým příběhem a fotografiemi – fotky zatím nejsou, doplní se později.
- **Žádné italské vlajky ani klišé** (pizza, gondoly, Koloseum apod.) – italský nádech má být cítit z kvality designu, typografie a materiálů, ne z doslovných symbolů.
---
 
## 2. Vizuální identita a design (klíčová sekce – bez šablon)
 
Tohle je jedna z nejdůležitějších částí zadání.
 
### Zadání designu
- **Žádné šablony, žádný "hotový e-shop vzhled".** Design šitý na míru téhle značce – ne generický Shopify/WooCommerce vzhled a ne generický "AI vygenerovaný" vzhled.
- Hlavní barva: **bílá / velmi světlá**, vzdušný podklad.
- Doplňkové barvy: **odstíny hnědé** (teplá kůže/koňak, případně tmavší espresso/čokoládová místo čistě černé na text) + **tlumená olivová/šalvějová zelená** jako druhý doplněk (přání zadavatele) – použij ji úsporně, jen na drobné akcenty (tlačítka, oddělovače, drobné štítky typu "Nová kolekce"), ne jako velkou plochu, ať zůstanou hlavní bílá a hnědá a paleta zůstane klidná.
- **Vyhni se otřepaným "AI defaultům":** krémové pozadí + oranžovo-hnědá terakota (clay) je momentálně nejrozpoznatelnější kombinace, kterou AI nástroje generují automaticky – pokud saháš po hnědé, ať je hlubší a sofistikovanější (espresso, koňak, tmavý ořech), ne jasná terakota. Podobně se vyhni: černé pozadí s jedním neonovým akcentem, nebo "novinový" layout s tenkými linkami a ostrými rohy všude.
- Elegantní, jednodušší, ale zajímavé – hodně vzduchu (whitespace), kvalitní typografie, důraz na fotografie produktů.
- Přehledné, ale ne nudné – najdi jedno výrazné, zapamatovatelné designové gesto (neotřelé zobrazení měr/velikostí, nezvyklá ale funkční galerie produktu, osobní "vzkaz od Lindy" v nezvyklé typografii...) a kolem něj drž zbytek střídmý a disciplinovaný.
### Doporučený postup práce (dělej to i jako "frontend/UI designér")
1. Nejdřív navrhni ucelenou paletu: 4–6 konkrétních barev s hex kódy, 2–3 řezy písma, koncept rozvržení stránek.
2. Zkontroluj návrh vůči zadání – nepůsobí obecně/šablonovitě? Pokud ano, uprav ho.
3. Teprve pak stavěj kód podle schváleného návrhu.
**Inspirace na začátek (klidně uprav):**
- Typografie: výrazný serifový nadpisový font s módním/editorialním nádechem (např. ve stylu Italiana, Fraunces nebo Cormorant Garamond) + čistý grotesque font pro běžný text (zkus něco méně otřepaného než samotné Inter).
- Paleta: bílá/smetanová (`#FFFFFF`, `#FAF8F4`) jako základ, hluboká espresso hnědá (`#2B2019`) místo černé na text a nadpisy, teplá koňaková hnědá (`#7A4B32`) jako akcent na tlačítka a detaily, jemný pískový tón (`#E4D9C8`) na pozadí sekcí/karet, tlumená olivová (`#6B7255`) jen na drobné akcenty (ikonky, štítky, tenké linky).
- Layout: fotografie produktů jsou hlavní hvězda – minimum "chromu" okolo nich, hodně bílého prostoru, jemné (ne přehnané) animace při najetí myší.
### Tón textů na webu
Cíl je, aby se zákaznice na webu cítila **jako doma** – ne jako v anonymním velkoobchodě. Promítni to do drobností: osobní přivítání na homepage, vřelý (ne uhlazeně korporátní) tón v transakčních e-mailech (potvrzení objednávky, poděkování za nákup), případně drobné osobní doteky (dárkové balení/přání k objednávce, sekce 14).
- Aktivní rod, konkrétní popisky ("Přidat do košíku", "Uložit mezi oblíbené" – ne "Odeslat"/"Submit").
- "O mně" sekce klidně v 1. osobě za Lindu (obsah dodá zadavatel, napiš strukturu a placeholder text).
- Žádné otřepané e-shopové fráze typu "Nejlepší ceny zaručeny!" – tón spíš jako od zkušené kamarádky, co se vyzná v módě, než jako reklama.
### Prázdné stavy (zatím bez fotek)
Reálné fotky produktů i majitelky dorazí později, proto:
- Placeholder obrázky ať vypadají záměrně a elegantně (jemný vzor/barevná plocha s ikonou), ne jako rozbitý obrázek.
- Zajisti snadnou výměnu za reálné fotky později (jednotné pojmenování, jasně označená místa v kódu/administraci).
- **Nikde nepoužívej AI-generované obrázky** – ani jako placeholder, ani jako "dočasný" obsah někde jinde na webu. Placeholdery ať jsou čistě grafické (barva/vzor/ikona, viz výše), skutečné fotky budou vždy reálné fotografie od zadavatele.
### Ikonky sociálních sítí
V patičce webu (sekce 4) budou ikonky na Instagram/Facebook (odkazy editovatelné adminem, sekce 6.8, 7). Ať jsou stylizované do jednoduchých monochromatických/obrysových ikon v barvách palety z tohohle zadání (espresso/koňaková hnědá), ne výchozí barevné ikonky platforem – ať to nevytrhne z celkového vzhledu.
 
---
 
## 3. Technologické řešení
 
Doporučený stack (uprav, pokud máš dobrý důvod, ale toto je solidní a moderní volba, která zvládne SEO i výkon):
 
- **Next.js (App Router) + TypeScript** – SSR/SSG kvůli SEO a rychlosti, frontend i backend (API routes/server actions) v jednom projektu.
- **PostgreSQL** jako databáze (dle zadání).
- **Prisma ORM** – typově bezpečná práce s databází a migrace.
- **Auth.js (NextAuth)** nebo vlastní JWT řešení – autentizace zákazníků i administrátora, s rolemi (customer/admin).
- **Tailwind CSS** – nakonfigurovaný na míru vlastními design tokeny z bodu 2, ne výchozí vzhled.
- **Sharp** – zpracování obrázků na serveru (sekce 9).
- **Zod** – validace vstupů (formuláře, API).
- **react-hook-form** – formuláře v administraci.
- Transakční e-maily: připrav napojení (SMTP/Resend/obdobná služba) stejným způsobem jako platby a dopravu – klíče doplní se později.
- **Docker** – aplikace neběží jako jeden všeobjímající kontejner, ale jako sada spolupracujících služeb (viz "Architektura kontejnerů" hned níže). Tohle je důležité kvůli zpracování obrázků a dalším úlohám na pozadí, ne jen kvůli pohodlnému spouštění.
### Architektura kontejnerů (a proč zpracování obrázků nepatří přímo do webového kontejneru)
 
Kdyby zpracování obrázků (Sharp – zmenšení, komprese, generování náhledů) běželo přímo uvnitř stejného kontejneru, který obsluhuje web pro zákazníky, hromadné nahrání např. 20 fotek k novému produktu by mohlo dočasně zpomalit i běžné nakupující – soutěžilo by to o stejný výkon. Stejný problém by dřív nebo později nastal i u generování PDF faktur, odesílání e-mailů nebo pravidelné aktualizace feedu pro Facebook/Google (sekce 18). Řešení: rozděl to na samostatné služby, které spolu komunikují přes frontu úloh, ne napřímo:
 
- **`web`** – Next.js aplikace (storefront + administrace + API), obsluhuje běžné požadavky. Při nahrání fotky jen uloží originál a založí "úlohu ke zpracování" ve frontě – nečeká, až bude hotovo, rovnou odpoví adminovi ("nahráno, zpracovává se na pozadí").
- **`worker`** – samostatný kontejner se **stejným kódem/image jako `web`**, jen se spuštěným jiným vstupním bodem (`src/worker/index.ts`), takže žádná duplicita kódu. Na pozadí postupně zpracovává frontu úloh: zmenšení a komprese fotek přes Sharp (sekce 9), generování PDF faktur, odesílání transakčních e-mailů, "upozornit až bude skladem" notifikace, pravidelné přegenerování feedu pro Facebook/Google (sekce 18), případně i noční záloha databáze.
- **`postgres`** – databáze.
- Frontu úloh mezi `web` a `worker` doporučuji řešit přes **pg-boss** (fronta postavená přímo nad PostgreSQL) – nepotřebuješ tak přidávat další technologii (Redis) navíc jen kvůli frontě, projekt v tomhle rozsahu si vystačí s tím, co už stejně běží. Pokud by e-shop časem hodně vyrostl a fronta se stala úzkým hrdlem, dá se snadno přejít na Redis + BullMQ – pro start to ale není potřeba.
- Pro produkční nasazení na VPS přidej ještě reverzní proxy – **Caddy** je nejjednodušší volba (automatické HTTPS, minimální konfigurace) před `web` kontejnerem.
`web` i `worker` tak sdílí stejnou kódovou základnu a databázi, ale běží odděleně – nahrávání fotek (nebo cokoliv jiného na pozadí) díky tomu nikdy nezpomalí zákaznice, kteří si zrovna prohlížejí web.
 
Pro ukládání obrázků zatím stačí lokální disková složka sdílená mezi `web` a `worker` (po zpracování Sharpem budou malé), s tím, že do budoucna půjde snadno přepnout na cloudové úložiště (S3/R2 kompatibilní), pokud e-shop poroste.
 
**Nasazení/hosting:** vzhledem k tomu, že projekt má kromě webu i trvale běžící `worker`, je nejpřímočařejší volbou **VPS s Dockerem** – celý docker-compose stack (`web` + `worker` + `postgres` + `caddy`) běží pohromadě. Pokud dáváš přednost Vercelu pro `web` část (kvůli pohodlnému nasazování), pak `worker` a databázi musíš hostovat zvlášť na něčem, co podporuje dlouhoběžící procesy (Railway, Fly.io, Render, nebo malý VPS) – na Vercelu samotném (serverless funkce) trvalý `worker` neběží. Kvůli GDPR a ochraně dat zákazníků zvol pokud možno hosting/databázi v EU. Dále je potřeba doména a SSL certifikát (HTTPS je povinné) – s Caddym automaticky, jinak přes Let's Encrypt.
 
---
 
## 4. Mapa webu – veřejná část
 
- `/` – Homepage: hero sekce, výběr produktů/kategorií, teaser příběhu značky, případně novinky.
- `/produkty` – katalog s filtrováním (kategorie, velikost, cena) a řazením (cena, novinky).
- `/produkty/[kategorie]` – výpis produktů v kategorii.
- `/produkt/[slug]` – detail produktu: galerie fotek, výběr velikosti se skladovou dostupností, tabulka měr, popis materiálu a péče, přidat do košíku, přidat do oblíbených, podobné produkty.
- `/o-mne` – příběh majitelky, fotografie (zatím placeholder).
- `/kosik` – košík.
- `/pokladna` – adresa, doprava, platba, shrnutí, slevový kód.
- `/muj-ucet` – přehled objednávek, uložené adresy, oblíbené položky, editace údajů.
- `/oblibene` – seznam oblíbených produktů (pro přihlášené).
- `/registrace`, `/prihlaseni`, `/zapomenute-heslo` – autentizace.
- `/obchodni-podminky`, `/ochrana-osobnich-udaju`, `/cookies`, `/reklamacni-rad` – právní stránky (sekce 11).
- `/doprava-a-platba` – přehled možností dopravy a platby.
- `/produkty/darkove-poukazy` – dárkové poukazy jako běžná kategorie produktu (fyzická karta, varianty = částky), objednávají se stejně jako cokoliv jiné (sekce 6.11).
- `/kontakt` – kontaktní formulář a údaje.
- Vlastní 404 stránka v jednotném designu.
- Patička: kontaktní údaje, odkazy na sociální sítě s ikonkami (sekce 2), odkazy na právní stránky.
---
 
## 5. Registrace, přihlášení, zákaznický účet, oblíbené
 
- Standardní registrace e-mailem a heslem (heslo hashované – bcrypt/argon2), s ověřením e-mailu nebo alespoň připraveno pro pozdější zapnutí.
- **Povinný souhlas s obchodními podmínkami** (checkbox) při registraci i při objednávce bez registrace – bez zaškrtnutí nejde dokončit.
- **Samostatný, oddělený souhlas s newsletterem/marketingem** – nesmí být schovaný v souhlasu s obchodními podmínkami, GDPR vyžaduje, aby byl zvlášť a dobrovolný. U registrovaného zákazníka se ukládá přímo k účtu (`User.newsletterSouhlas`); tabulka `NewsletterSubscriber` slouží jen pro přihlášení k newsletteru bez založení účtu (nepřihlášený návštěvník) – ať se souhlas nezdvojuje na dvou místech.
- **Ochrana proti spamu** (captcha, např. Cloudflare Turnstile) na registraci, přihlášení a kontaktním formuláři.
- Přihlášení, odhlášení, reset zapomenutého hesla.
- Profil zákazníka: historie objednávek se stavem, uložené adresy, oblíbené produkty, možnost smazat účet/data (GDPR). **Smazání účtu ale musí respektovat zákonnou povinnost uchovávat účetní doklady několik let** – reálně tedy nejde smazat objednávky úplně, jen anonymizovat osobní údaje (e-mail, jméno, telefon, adresy) a objednávky/faktury ponechat bez vazby na konkrétní osobu. Košík a oblíbené položky u toho naopak žádný zákonný důvod k uchování nemají – ty se při smazání účtu rovnou smažou úplně.
- **Stornování objednávky zákaznicí** – dokud je objednávka ve stavu "Nová" (ještě se nezpracovává), zákaznice ji může sama zrušit ve svém účtu jedním tlačítkem. Jakmile admin začne objednávku zpracovávat, tlačítko zmizí a zrušení už jde jen přes admina (sekce 6.4).
- **Oblíbené položky:** po přihlášení lze označit produkt jako oblíbený (ikonka srdíčka), uloží se u účtu do databáze, zůstane i po odhlášení a návratu později. Bez přihlášení nabídni jemnou výzvu k registraci/přihlášení.
- **Košík u přihlášených zákazníků:** nepřihlášeně se košík drží jen v prohlížeči (local storage), jak je běžné. Jakmile je zákazník přihlášený, obsah košíku se navíc ukládá u jeho účtu v databázi – takže když se odhlásí, zavře prohlížeč nebo se přihlásí z jiného zařízení, věci v košíku zůstanou. Když se zákazník s nepřihlášeným košíkem (z prohlížeče) přihlásí nebo zaregistruje, oba košíky se sloučí (ne že by jeden ten druhý přepsal). Při každém zobrazení košíku ověř, že produkty/varianty v něm ještě existují a jsou aktivní – pokud mezitím admin produkt smazal nebo skryl, položku z košíku odeber a zákaznici na to upozorni ("tento produkt už není dostupný"), místo aby s ní mohla dojít až k pokladně.
---
 
## 6. Administrace (admin panel)
 
Přihlašovací údaje administrátora budou v `.env` (sekce 16) – bez veřejného formuláře na "vytvořit dalšího admina".
 
### 6.1 Dashboard
Přehled: nové objednávky, tržby za období, produkty s docházející skladovou zásobou, počet čekajících reklamací/vrácení (sekce 6.10), nově registrovaní zákazníci, rychlé odkazy na časté akce ("Přidat produkt", "Zobrazit objednávky").
 
### 6.2 Správa produktů
Tlačítko "Přidat nový produkt" otevře formulář:
- Základní údaje: název, popis, kategorie, značka/designér (u italské módy dává smysl evidovat, od jaké značky/dovozce kus je), materiál, pokyny pro péči, cena, případně zlevněná cena, SKU.
- **Fotografie:** nahrání více fotek najednou, přetažením lze měnit pořadí, možnost označit hlavní fotku. Zpracování (zmenšení, komprese) běží na pozadí přes `worker` kontejner (sekce 3, 9) – u každé fotky admin vidí stav "zpracovává se" → "hotovo", neřeší velikost souboru sám a upload mu nezpomalí zbytek administrace.
- **Varianty/velikosti:** pro každou velikost admin zadá počet kusů skladem a **konkrétní míry** (obvod hrudníku/prsou, pas, boky, délka, rukáv – pole uprav dle typu oděvu, šaty/kalhoty/kabáty mají jiné míry). Tohle je pro rozhodování zákaznic u italské módy klíčové. Výjimka: u produktu s příznakem `jeDarkovyPoukaz` (sekce 6.11, 7) pole na míry, materiál ani péči vůbec nezobrazuj – "velikost" varianty se tam použije jako částka poukazu (např. "1000 Kč"), ne jako oděvní velikost.
- SEO pole: meta titulek a popis (volitelné, ale ať jde vyplnit).
- Stav: aktivní/skryté, "doporučený produkt" (zvýrazní na homepage). Produkt/variantu, která se objevuje v alespoň jedné objednávce, nikdy fyzicky nemaž (rozbilo by to historii objednávek) – nabídni admovi jen možnost deaktivovat/skrýt, tlačítko "Smazat" u takového produktu radši úplně schovej.
- Uložit jako koncept / publikovat.
### 6.3 Kategorie
CRUD kategorií, možnost vnořených kategorií (např. Šaty → Letní šaty), pořadí zobrazení, obrázek/banner kategorie.
 
### 6.4 Objednávky
Seznam s filtrem podle stavu, detail objednávky (zákazník, položky, doručovací adresa, doprava/platba), změna stavu (Nová → Zpracovává se → Expedována → Doručena, případně Zrušena/Vrácena). Doporučeno: při změně stavu automaticky poslat zákazníkovi e-mail (jakmile bude e-mailové API zapojené). Při expedici admin zadá sledovací číslo zásilky, ať ho zákaznice vidí u sebe v účtu. U zrušených objednávek je z pole `zrusil` vidět, jestli je zrušila sama zákaznice (sekce 5), nebo admin.
 
### 6.5 Zákaznická databáze
Přehled registrovaných zákazníků: kontaktní údaje, počet a historie objednávek, celková útrata, datum poslední objednávky. Klik na zákazníka = detail se vším na jednom místě – přesně jak bylo požadováno, ať to má majitelka přehledné.
 
### 6.6 Slevové kódy
Admin vytvoří kód (zadá nebo nechá vygenerovat), nastaví % slevy, volitelně platnost od–do, limit počtu použití, minimální hodnotu objednávky, přepínač aktivní/neaktivní. Seznam kódů s počtem použití u každého. Pravidlo: % sleva se vždy počítá z aktuální prodejní ceny (tedy ze zlevněné ceny, pokud ji produkt už má, jinak z běžné ceny) – slevy se nesčítají dvojitě.
 
### 6.7 Režim dovolené ("jsem pryč")
V nastavení jednoduchý přepínač "Aktivovat režim nepřítomnosti" → krátký formulář: datum návratu + volitelně vlastní text zprávy (s proměnnou pro datum, např. "Momentálně čerpáme dovolenou, objednávky budeme opět expedovat od {datum}."). Zapnutý režim zobrazí banner zákazníkům (homepage, produkt, pokladna). Přidej i volbu, jestli má být objednávání během té doby úplně zablokované, nebo zákazník jen uvidí upozornění a objednat může dál – ať si majitelka zvolí, co jí vyhovuje.
 
### 6.8 Nastavení
Firemní údaje (název, IČO, DIČ, adresa – zatím prázdná pole), kontaktní údaje na webu, odkazy na sociální sítě, ceny dopravy pro jednotlivé přepravce, práh pro dopravu zdarma.
 
### 6.9 Celkové požadavky na administraci
- Jednoduché a přehledné ovládání – logická navigace v bočním panelu, potvrzovací dialogy u mazání, jasná zpětná vazba (úspěch/chyba) po každé akci.
- Použitelné i na tabletu/mobilu (majitelka bude občas kontrolovat objednávky z telefonu).
### 6.10 Reklamace a vrácení zboží
Admin potřebuje vidět a spravovat, když zákaznice něco vrací nebo reklamuje – jednoduchý záznam napojený na objednávku, volitelně i na konkrétní položku (model `Reklamace`, sekce 7): typ (reklamace/vrácení), stav (přijata → řeší se → vyřízena – uznána/zamítnuta), poznámka, kdy přijato a kdy vyřízeno. Zobrazí se přímo u dané objednávky v 6.4. Když admin označí **vrácení** jako "vyřízeno – uznáno", systém automaticky vrátí příslušný počet kusů zpátky do skladu (`ProductVariant.skladem`) a u vrácení celé objednávky přepne `Order.stav` na `VRACENA` – ať se to nemusí dopočítávat ručně.
 
### 6.11 Dárkové poukazy
Podobně jako slevové kódy, ale fungují jako platidlo (model `GiftCard`, sekce 7): admin vygeneruje poukaz na pevnou částku (ne %) s volitelnou platností do data, zákaznice ho v pokladně uplatní jako plnou nebo částečnou platbu – zbývající zůstatek se odečte od `zustatek` a jde použít i příště. Slevový kód a dárkový poukaz lze na jedné objednávce kombinovat: nejdřív se z ceny odečte % sleva z kódu, a teprve zbylá částka se uhradí poukazem (případně doplatí jinou platební metodou). Kromě ručního vytvoření adminem si poukaz může **objednat i zákaznice sama** – poukazy jsou **fyzické karty**, takže se prodávají jako běžný produkt (vlastní kategorie "Dárkové poukazy", varianty = pevné částky, např. 500/1000/2000 Kč), objedná se přes normální košík/pokladnu se skutečnou doručovací adresou stejně jako cokoliv jiné (sekce 4, 7, 8). Po zaplacení objednávky systém automaticky vygeneruje odpovídající `GiftCard` záznam(y) (kód, zůstatek podle zvolené varianty) a propojí je s danou položkou objednávky – pokud si zákaznice objedná víc kusů stejné varianty najednou (`mnozstvi` > 1), worker vygeneruje tolik samostatných `GiftCard` záznamů s vlastními unikátními kódy, kolik kusů objednala (ne jeden kód pro všechny) – kartu pak admin vytiskne/přiloží a odešle spolu se zásilkou. Osobní přání k dárku řeší už existující funkce "dárkové balení/vzkaz k objednávce" (sekce 14), zvlášť se pro poukaz nic navíc řešit nemusí.
 
### Poznámka: platby jen kartou
Jediná platební metoda, kterou má e-shop dlouhodobě nabízet, je **platba kartou přes GoPay** (sekce 8) – bez dobírky. Než bude GoPay aktivní, funguje jako dočasný můstek bankovní převod (taky sekce 8).
 
### 6.12 Více administrátorských účtů
Zatím jeden účet v `.env` stačí, ale připrav strukturu tak, aby šlo v budoucnu přidat dalšího administrátora (např. pomocnici) s omezenými právy – např. jen správa produktů a objednávek, bez přístupu k nastavení a financím.
 
### 6.13 Obnovení zapomenutého admin hesla
Protože admin přihlašovací údaje jsou v `.env`, běžný "zapomenuté heslo" e-mailový postup nefunguje. Připrav alespoň jednoduchý bezpečný způsob (např. změna proměnné prostředí a restart, nebo zabezpečený reset přes CLI příkaz), ať majitelka není v případě zapomenutí hesla mimo provoz.
 
---
 
## 7. Datový model (návrh databáze)
 
Orientační návrh – uprav/doplň dle potřeby při implementaci, není to finální DDL:
 
```prisma
model User {
  id                String     @id @default(cuid())
  email             String     @unique
  passwordHash      String
  jmeno             String?
  telefon           String?
  role              Role       @default(CUSTOMER)
  newsletterSouhlas Boolean    @default(false)
  createdAt         DateTime   @default(now())
  addresses         Address[]
  orders            Order[]
  favorites         Favorite[]
  cart              Cart?
}
 
enum Role {
  CUSTOMER
  ADMIN
}
 
model Address {
  id            String      @id @default(cuid())
  userId        String
  user          User        @relation(fields: [userId], references: [id])
  jmenoPrijmeni String
  ulice         String
  mesto         String
  psc           String
  zeme          String      @default("CZ")
  telefon       String?
  jeVychozi     Boolean     @default(false)
  typ           AddressType
}
 
enum AddressType {
  FAKTURACNI
  DODACI
}
 
model Category {
  id       String     @id @default(cuid())
  nazev    String
  slug     String     @unique
  parentId String?
  parent   Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children Category[] @relation("CategoryTree")
  popis    String?
  obrazek  String?
  poradi   Int        @default(0)
  products Product[]
}
 
model Product {
  id              String           @id @default(cuid())
  nazev           String
  slug            String           @unique
  popis           String
  categoryId      String
  category        Category         @relation(fields: [categoryId], references: [id])
  cena            Decimal
  cenaPoSleve     Decimal?
  znacka          String?
  material        String?
  udrzba          String?
  sku             String?          @unique
  aktivni         Boolean          @default(true)
  doporuceny      Boolean          @default(false)
  jeDarkovyPoukaz Boolean          @default(false) // true = varianty tohoto produktu představují částky poukazu (sekce 6.11), ne velikosti oblečení
  metaTitle       String?
  metaDescription String?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  variants        ProductVariant[]
  images          ProductImage[]
  favorites       Favorite[]
}
 
model ProductVariant {
  id                 String              @id @default(cuid())
  productId          String
  product            Product             @relation(fields: [productId], references: [id])
  velikost           String
  barva              String?
  skladem            Int                 @default(0)
  miry               Json?               // { obvodHrudniku, obvodPasu, obvodBoku, delka, rukav, ... }
  orderItems         OrderItem[]
  cartItems          CartItem[]
  stockNotifications StockNotification[]
}
 
model Cart {
  id            String     @id @default(cuid())
  userId        String     @unique
  user          User       @relation(fields: [userId], references: [id])
  updatedAt     DateTime   @updatedAt
  pripomenutoAt DateTime?  // kdy naposledy odešel e-mail na opuštěný košík, ať se neposílá opakovaně
  items         CartItem[]
}
 
model CartItem {
  id                String         @id @default(cuid())
  cartId            String
  cart              Cart           @relation(fields: [cartId], references: [id])
  variantId         String
  variant           ProductVariant @relation(fields: [variantId], references: [id])
  mnozstvi          Int
  upozornenoNaSklad Boolean        @default(false) // ať se e-mail o docházejícím skladu nepošle vícekrát za sebou
  pridanoAt         DateTime       @default(now())
 
  @@unique([cartId, variantId])
}
 
model ProductImage {
  id             String                 @id @default(cuid())
  productId      String
  product        Product                @relation(fields: [productId], references: [id])
  url            String?                // vyplní se, až worker dokončí zpracování
  altText        String?
  poradi         Int                    @default(0)
  jeHlavni       Boolean                @default(false)
  stavZpracovani ImageProcessingStatus  @default(CEKA)
}
 
enum ImageProcessingStatus {
  CEKA
  ZPRACOVAVA_SE
  HOTOVO
  CHYBA
}
 
model Order {
  id                  String        @id @default(cuid())
  userId              String?
  user                User?         @relation(fields: [userId], references: [id])
  cisloObjednavky     String        @unique
  stav                OrderStatus   @default(NOVA)
  celkovaCena         Decimal       // vždy v CZK
  discountCodeId      String?
  discountCode        DiscountCode? @relation(fields: [discountCodeId], references: [id])
  // % sleva z kódu se počítá vždy z aktuální prodejní ceny (tedy z cenaPoSleve, pokud ji produkt má, jinak z cena) – ne dvojitě z původní ceny
  giftCardId          String?
  giftCard            GiftCard?     @relation(fields: [giftCardId], references: [id])
  castkaZGiftCard     Decimal?      // kolik z ceny bylo uhrazeno poukazem (může být jen část, zbytek jinou platbou)
  // záměrně jen jeden poukaz na objednávku (ne pole/relace 1:N) – jednodušší checkout; kombinace víc poukazů najednou není podporovaná
  zpusobDopravy       String
  vydejniMistoId      String?       // ID konkrétní pobočky/boxu (Zásilkovna apod.), pokud daný způsob dopravy vyžaduje výběr místa
  vydejniMistoNazev   String?       // název/adresa místa pro zobrazení zákaznici i v adminu
  zpusobPlatby        String
  stavPlatby          String
  cisloZasilky        String?       // sledovací číslo od dopravce (Zásilkovna/PPL/Česká pošta)
  poznamka            String?
  zrusil              ZrusilKdo?    // kdo objednávku zrušil, jen pokud stav = ZRUSENA
  // snímek doručovací adresy v době objednání – ne odkaz na Address, ať se objednávka
  // nezmění zpětně, když si zákaznice adresu v účtu později upraví/smaže; funguje i pro guest checkout bez User
  dodaciJmenoPrijmeni String
  dodaciUlice         String
  dodaciMesto         String
  dodaciPsc           String
  dodaciZeme          String        @default("CZ")
  dodaciTelefon       String?
  createdAt           DateTime      @default(now())
  items               OrderItem[]
  reklamace           Reklamace[]
}
 
enum ZrusilKdo {
  ZAKAZNICE
  ADMIN
}
 
enum OrderStatus {
  NOVA
  ZPRACOVAVA_SE
  EXPEDOVANA
  DORUCENA
  ZRUSENA
  VRACENA
}
 
model OrderItem {
  id                 String         @id @default(cuid())
  orderId            String
  order              Order          @relation(fields: [orderId], references: [id])
  variantId          String
  variant            ProductVariant @relation(fields: [variantId], references: [id])
  mnozstvi           Int
  cenaVDobeNakupu    Decimal
  reklamace          Reklamace[]
  vygenerovanePoukazy GiftCard[]    // worker vygeneruje přesně `mnozstvi` záznamů, pokud tahle položka je nákup dárkového poukazu (sekce 6.11) – 1 kus = 1 unikátní kód
}
 
model Favorite {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])
  productId         String
  product           Product  @relation(fields: [productId], references: [id])
  upozornenoNaSklad Boolean  @default(false) // ať se e-mail o docházejícím skladu nepošle vícekrát za sebou
  createdAt         DateTime @default(now())
 
  @@unique([userId, productId])
}
 
model DiscountCode {
  id            String    @id @default(cuid())
  kod           String    @unique
  procentoSlevy Int
  platnyOd      DateTime?
  platnyDo      DateTime?
  limitPouziti  Int?
  pocetPouziti  Int       @default(0)
  aktivni       Boolean   @default(true)
  orders        Order[]
}
 
model GiftCard {
  id                     String    @id @default(cuid())
  kod                    String    @unique
  castka                 Decimal   // původní hodnota poukazu (v CZK)
  zustatek               Decimal   // co ještě zbývá vyčerpat
  platnyDo               DateTime?
  aktivni                Boolean   @default(true)
  vytvorenoZObjednavkyId String?   // OrderItem, který tenhle poukaz "koupil" jako fyzický produkt; null = vytvořil ho ručně admin (6.11)
  vytvorenoZObjednavky   OrderItem? @relation(fields: [vytvorenoZObjednavkyId], references: [id])
  createdAt              DateTime  @default(now())
  orders                 Order[]   // objednávky, kde byl tento poukaz použit jako platidlo (jiná vazba než vytvorenoZObjednavky)
}
 
model Settings {
  id                    Int       @id @default(1)
  rezimDovolene         Boolean   @default(false)
  datumNavratu          DateTime?
  zpravaProZakazniky    String?
  zablokovatObjednavky  Boolean   @default(false)
  nazevFirmy            String?
  icoFirmy              String?
  dicFirmy              String?
  adresaFirmy           String?
  telefonFirmy          String?
  emailFirmy            String?
  jePlatceDph           Boolean   @default(false)
  socialInstagram       String?
  socialFacebook        String?
  cenaDopravyZasilkovna Decimal?
  cenaDopravyPPL        Decimal?
  cenaDopravyCeskaPosta Decimal?
  prahDopravaZdarma     Decimal?  // objednávky nad tuto částku mají dopravu zdarma; null = vypnuto
}
 
model NewsletterSubscriber {
  id        String   @id @default(cuid())
  email     String   @unique
  potvrzeno Boolean  @default(false)
  createdAt DateTime @default(now())
}
 
model StockNotification {
  id        String         @id @default(cuid())
  email     String
  variantId String
  variant   ProductVariant @relation(fields: [variantId], references: [id])
  vyrizeno  Boolean        @default(false)
  createdAt DateTime       @default(now())
}
 
model Reklamace {
  id             String          @id @default(cuid())
  orderId        String
  order          Order           @relation(fields: [orderId], references: [id])
  orderItemId    String?         // null = týká se celé objednávky, jinak konkrétní položky
  orderItem      OrderItem?      @relation(fields: [orderItemId], references: [id])
  typ            ReklamaceTyp
  stav           ReklamaceStav   @default(PRIJATA)
  duvod          String?
  poznamkaAdmina String?
  datumPrijeti   DateTime        @default(now())
  datumVyrizeni  DateTime?
}
 
enum ReklamaceTyp {
  REKLAMACE
  VRACENI
}
 
enum ReklamaceStav {
  PRIJATA
  RESI_SE
  VYRIZENA_UZNANA
  VYRIZENA_ZAMITNUTA
}
```
 
---
 
## 8. Platby a doprava – připravit, ne aktivovat
 
Zatím nejsou k dispozici žádné API klíče – vše připrav tak, aby stačilo později doplnit klíče do `.env` a bylo to funkční, bez zásahu do kódu. Veškeré ceny v systému jsou v **CZK (Kč)** – bez podpory více měn; pokud by to bylo do budoucna potřeba (např. prodej na Slovensko), jde doplnit později.
 
### Platby
- **Platba kartou přes GoPay** – jediná trvalá platební metoda, kterou zákaznice chce (žádná dobírka). Připrav abstraktní vrstvu (rozhraní `PaymentProvider`), aby šlo GoPay zapojit, až budou k dispozici přístupy (GoID, Client ID, Client Secret, sandbox/produkční režim).
- Než budou klíče k GoPay k dispozici, e-shop musí umět přijímat objednávky i bez něj – přidej **bankovní převod** jako dočasný můstek (zobrazení platebních údajů: číslo účtu, variabilní symbol = číslo objednávky, + vygenerování QR platby podle českého standardu QR Platba pro snadné naskenování v bankovní aplikaci). Jakmile je GoPay aktivní, bankovní převod jde klidně skrýt/vypnout – **dobírku nepřidávej vůbec**, zákaznice, pro kterou e-shop děláš, ji nechce.
### Doprava
Připrav napojení (opět jako abstraktní rozhraní, ať se dopravci dají snadno přidávat/měnit) na:
- **Zásilkovnu/Packetu** (výběr výdejního místa – vybrané místo ulož k objednávce do `vydejniMistoId`/`vydejniMistoNazev`, sekce 7)
- **PPL**
- **Českou poštu**
U každého zatím jen struktura (proměnné prostředí, rozhraní pro vytvoření zásilky/výpočet ceny), bez ostrého napojení, dokud nebudou klíče k dispozici. V adminu ale připrav možnost nastavit cenu dopravy pro každou metodu ručně, ať e-shop může fungovat i s manuálně zadanou cenou, než se ostré API napojí.
 
---
 
## 9. Zpracování a optimalizace obrázků (Sharp)
 
Cíl: aby se na server nikdy nenahrály zbytečně velké soubory a nezaplnily úložiště – a aby zpracování fotek nezatěžovalo kontejner, který zrovna obsluhuje nakupující (viz "Architektura kontejnerů" v sekci 3).
 
Průběh nahrání (produkty, kategorie i budoucí fotky "O mně" – jakýkoliv upload v administraci), zpracovaný asynchronně přes `worker`:
1. Admin nahraje fotku → `web` ověří typ souboru a maximální vstupní velikost, uloží originál do dočasného úložiště a založí úlohu ve frontě (stav `CEKA`). Adminovi hned odpoví, fotka se v adminu zobrazí jako "zpracovává se".
2. `worker` úlohu vyzvedne a pomocí Sharp: zmenší na rozumné maximum (např. 2000 px na delší straně pro detail), vygeneruje i menší varianty (náhled/thumbnail, střední velikost pro výpisy, velká pro detail produktu).
3. Převede do úspornějšího formátu (WebP, případně AVIF), odstraní EXIF metadata.
4. Uloží zkomprimované verze (ne originál v plné velikosti), smaže dočasný originál, nastaví stav na `HOTOVO` (nebo `CHYBA` s důvodem, pokud něco selže – ať admin ví, že má fotku nahrát znovu).
5. Administrace stav úlohy průběžně kontroluje (stačí jednoduchý polling po pár sekundách, websocket není nutný).
6. Zobrazuj přes Next.js `<Image>` komponentu (lazy loading, responzivní `srcset` automaticky).
---
 
## 10. Bezpečnost
 
- Hesla vždy hashovaná (bcrypt/argon2), nikdy v čitelné podobě.
- Ochrana admin sekce middlewarem kontrolujícím roli, ne jen skrytým odkazem.
- Rate limiting na přihlašování (ochrana proti brute-force) a na veřejné API.
- CSRF ochrana u formulářů, validace všech vstupů na serveru (nespoléhat na front-end validaci).
- Ochrana veřejných formulářů (registrace, přihlášení, kontakt) proti spamu a botům – captcha, viz sekce 5.
- HTTPS všude, bezpečné/HttpOnly cookies pro session.
- `.env` nikdy nesmí být součástí gitu (`.gitignore`), commituj jen `.env.example` s prázdnými hodnotami. Stejně tak `node_modules` (generovaná složka závislostí) patří do `.gitignore` a nikdy se necommituje – po stažení projektu se založí sama příkazem `npm install`.
- Doporučeno navíc: 2FA nebo alespoň silná politika hesla pro jediný admin účet, protože má přístup ke všem datům zákazníků.
---
 
## 11. Právní náležitosti a GDPR
 
IČO, DIČ a další firemní údaje se doplní později – teď připrav strukturu a texty s placeholdery, které půjde snadno doplnit.
 
- **Obchodní podmínky** – identifikace prodávajícího (placeholder IČO/DIČ), objednávkový proces, ceny a platba, dodací podmínky, práva z vadného plnění, právo na odstoupení od smlouvy do 14 dnů bez udání důvodu, mimosoudní řešení sporů (odkaz na Českou obchodní inspekci).
- **Ochrana osobních údajů (GDPR)** – jaké údaje se sbírají a proč, doba uchovávání, práva subjektu údajů (přístup, oprava, výmaz, přenositelnost, námitka), zpracovatelé (platební brána, dopravci, hosting).
- **Cookies** – lišta s možností přijmout/odmítnout/nastavit kategorie (nezbytné / analytické / marketingové), nic navíc předem nezaškrtnuté, samostatná stránka s vysvětlením jednotlivých cookies. Kromě banneru při první návštěvě přidej i **trvale dostupné tlačítko/odkaz "Nastavení cookies"** (typicky v patičce), přes které zákazník souhlas kdykoliv později změní – nejen při prvním příchodu na web, to GDPR/cookies zákon vyžaduje.
- **Reklamační řád** – záruční doba, postup reklamace, lhůty na vyřízení.
- **Vzorový formulář pro odstoupení od smlouvy** ke stažení/vyplnění.
- **E-mail s potvrzením objednávky** musí obsahovat/odkazovat na obchodní podmínky a poučení o právu na odstoupení od smlouvy – u zásilkového prodeje je to zákonná povinnost, ne jen hezký doplněk.
- Ceny zobrazovat jako konečné pro zákazníka; připrav přepínač "prodejce je/není plátce DPH" (u začínajících OSVČ běžné, že zatím neplátce) – ovlivní, jak se ceny popisují.
---
 
## 12. SEO a GEO
 
### SEO
- Sémantické HTML5, správná hierarchie nadpisů.
- Editovatelné meta title/description (globálně i per produkt/kategorie z administrace).
- Open Graph a Twitter Card tagy.
- Automaticky generovaná sitemap.xml a robots.txt.
- Strukturovaná data (schema.org): Product, Offer, BreadcrumbList, Organization, případně FAQPage.
- Čitelné URL bez diakritiky (např. `damske-saty-italie`).
- Popisné alt texty u všech obrázků.
- Důraz na rychlost načítání (Core Web Vitals) – k tomu pomáhá SSR a optimalizace obrázků z bodu 9.
### GEO
Pod "GEO" počítej s oběma významy a připrav oba:
- **Lokální SEO** (pokud má/bude mít Linda Fashion i kamennou prodejnu/showroom): strukturovaná data LocalBusiness s placeholder adresou/telefonem/otevírací dobou, místo pro odkaz na Google Business Profile, sekce "Kde nás najdete" s prostorem pro mapu.
- **Generative Engine Optimization** (optimalizace pro AI vyhledávače/asistenty typu ChatGPT, Perplexity, Google AI Overviews): jasně strukturovaný faktický obsah (materiály, míry, péče o oděv), FAQ sekce ve formátu otázka–odpověď, do budoucna zvaž i `llms.txt` v kořeni webu.
---
 
## 13. Responzivita a přístupnost
 
- Mobile-first přístup, otestováno na běžných šířkách (mobil ~360–430 px, tablet ~768 px, desktop 1024 px+).
- Administrace použitelná i na tabletu/mobilu.
- Dostatečný kontrast barev (i s bílo-hnědou paletou), viditelný focus stav pro klávesnici, alt/aria-label u interaktivních prvků, respektování `prefers-reduced-motion`.
---
 
## 14. Doporučeno navíc (nad rámec zadání, ale dává smysl)
 
### Zahrnout hned (nízká náročnost, vysoká hodnota)
- Automatické generování jednoduché faktury/dokladu k objednávce (PDF, generuje worker – sekce 3) – IČO/DIČ zatím placeholder.
- Objednání i bez registrace (guest checkout), s nabídkou založit si účet až po objednávce.
- Newsletter přihlášení (zatím jen ukládání e-mailů do databáze, napojení na e-mailový nástroj později stejně jako platby/doprava).
- "Upozornit, až bude skladem" u vyprodaných velikostí (e-mail odešle worker).
- Tabulka/průvodce velikostmi (jak se měřit, jak číst míry u produktu) – sníží počet vrácených objednávek.
- Vyhledávání a řazení v katalogu (cena, novinky).
- "Naposledy zobrazené" a "podobné produkty" u detailu produktu.
- **E-mail na opuštěný košík** – funguje jen pro přihlášené zákaznice, protože jen jejich košík se ukládá na server (sekce 5); košík hosta žije jen v jeho prohlížeči, takže tam server nemá co hlídat ani kam poslat e-mail. Pokud si přihlášená zákaznice naplní košík a objednávku nedokončí, po čase jí `worker` (sekce 3) pošle připomínkový e-mail. Pošle se ale jen jednou (`Cart.pripomenutoAt`, sekce 7) – ne opakovaně každý den, dokud si to nekoupí.
- **Automatické upozornění na docházející sklad** – místo rezervace kusů v košíku (to raději neřešit, zbytečně by to komplikovalo checkout) stačí jednodušší přístup: `worker` pravidelně kontroluje sklad u variant, které má někdo v košíku nebo v oblíbených (tedy taky jen u přihlášených, sekce 5), a pokud zbývá málo kusů, automaticky pošle e-mail ("zbývá poslední kus, nezapomeňte"). Pošle se jen jednou na pokles (`upozornenoNaSklad` na `CartItem`/`Favorite`, sekce 7) – jakmile se sklad doplní zpátky nad práh, `worker` příznak vrátí na `false`, ať při dalším poklesu přijde upozornění znovu. Tohle je jiná věc než `StockNotification` níže – ten je pro úplně vyprodané kusy a přihlásit se k němu může kdokoliv (i bez účtu), tenhle je automatický jen pro to, co už zákaznice má v košíku/oblíbených.
- Značce odpovídající 404 stránka.
- Jednoduchý audit log akcí administrátora (kdo/kdy smazal produkt apod.).
- Zálohování databáze (alespoň denní automatický backup).
- Dárkové poukazy jako platidlo (sekce 6.11).
- "Poslední kusy skladem" upozornění u produktu (marketingově funguje dobře).
- Dárkové balení / přiložené přání k objednávce – ladí s "prémiovým, ale rodinným" pocitem značky.
- WhatsApp/Messenger kontaktní bublina – osobní dotek pro rychlý dotaz.
- Štítkování kolekcí ("Nová kolekce", "Jaro/Léto 2026") nezávisle na kategoriích.
### Lze nechat na později / rozšíření do budoucna
- Recenze a hodnocení produktů.
- Redakční sekce / "deník stylu" (blog) – posiluje osobní/rodinný nádech i SEO.
- Věrnostní program / opakované slevy pro stálé zákaznice.
- Vícejazyčná verze webu (např. angličtina).
- Propojení s Instagramem (feed na homepage).
- Google Analytics 4 / Meta Pixel – zatím jen připravené místo v `.env`.
---
 
## 15. Struktura projektu a kvalita kódu
 
Jasné oddělení podle typu/odpovědnosti souboru – žádné obří soubory s pomíchanou logikou. Orientační struktura:
 
```
linda-fashion/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── (shop)/
│   │   │   ├── page.tsx
│   │   │   ├── produkty/
│   │   │   ├── produkt/[slug]/
│   │   │   ├── o-mne/
│   │   │   ├── kosik/
│   │   │   ├── pokladna/
│   │   │   ├── muj-ucet/
│   │   │   ├── oblibene/
│   │   │   ├── obchodni-podminky/
│   │   │   ├── ochrana-osobnich-udaju/
│   │   │   ├── cookies/
│   │   │   ├── reklamacni-rad/
│   │   │   └── kontakt/
│   │   ├── (auth)/
│   │   │   ├── prihlaseni/
│   │   │   └── registrace/
│   │   ├── admin/
│   │   │   ├── page.tsx
│   │   │   ├── produkty/
│   │   │   ├── kategorie/
│   │   │   ├── objednavky/
│   │   │   ├── zakaznici/
│   │   │   ├── slevove-kody/
│   │   │   └── nastaveni/
│   │   └── api/
│   │       ├── auth/
│   │       ├── produkty/
│   │       ├── objednavky/
│   │       ├── platby/gopay/
│   │       ├── doprava/
│   │       └── upload/
│   ├── components/
│   │   ├── ui/
│   │   ├── shop/
│   │   └── admin/
│   ├── lib/
│   │   ├── db.ts
│   │   ├── auth.ts
│   │   ├── queue.ts               # nastavení pg-boss fronty, sdílené mezi web a worker
│   │   ├── sharp-image.ts
│   │   ├── payments/gopay.ts
│   │   ├── shipping/{zasilkovna,ppl,ceska-posta}.ts
│   │   └── validations/
│   ├── worker/
│   │   ├── index.ts               # vstupní bod worker kontejneru
│   │   └── jobs/
│   │       ├── zpracovat-obrazek.ts
│   │       ├── odeslat-email.ts
│   │       ├── vygenerovat-fakturu.ts
│   │       ├── opustene-kosiky.ts
│   │       ├── nizky-sklad-upozorneni.ts
│   │       └── aktualizovat-feed.ts
│   ├── styles/
│   └── types/
├── public/uploads/
├── .env.example
├── docker-compose.yml
├── Dockerfile
└── README.md
```
 
**Docker:** `web` i `worker` používají stejný `Dockerfile` (multi-stage build), jen s jiným spouštěcím příkazem – žádná duplicita kódu. `docker-compose.yml` lokálně spustí `web` + `worker` + `postgres` jedním příkazem (`docker compose up`); zdůvodnění a detaily viz sekce 3, "Architektura kontejnerů".
 
- TypeScript v celém projektu, čitelné názvy, komentáře u složitější logiky (platby, výpočet slevy, generování QR platby).
- ESLint + Prettier nastavené a dodržované.
- `README.md` s konkrétním postupem lokálního spuštění – dvě možnosti:
  1. **Přes npm přímo:** `npm install` (vytvoří složku `node_modules` – ta se negeneruje ručně, nikdy nepatří do gitu, viz `.gitignore` níže), zkopírovat `.env.example` do `.env` a vyplnit, `npx prisma migrate dev` pro založení databáze, `npm run dev` pro spuštění na `localhost:3000`.
  2. **Přes Docker (sekce 3):** `docker compose up` spustí `web` + `worker` + `postgres` najednou, bez nutnosti mít Node.js nainstalovaný přímo na počítači – `node_modules` se v tomto případě řeší uvnitř kontejneru.
- Seed skript s pár ukázkovými produkty (placeholder texty a obrázky), ať jde web zkontrolovat i před dodáním reálných fotek.
---
 
## 16. Proměnné prostředí (`.env.example`)
 
```
# Databáze (sdílí web i worker; pg-boss fronta úloh běží nad stejnou databází)
DATABASE_URL=
# proměnné pro PostgreSQL kontejner v docker-compose (lokální vývoj)
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=linda_fashion
 
# Fronta úloh – volitelný upgrade z pg-boss (výchozí, nad Postgres) na Redis, pokud e-shop hodně vyroste
# REDIS_URL=
 
# Captcha / ochrana proti spamu
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
 
# Autentizace
NEXTAUTH_SECRET=
NEXTAUTH_URL=
ADMIN_EMAIL=
ADMIN_PASSWORD=
 
# Platby – GoPay (doplnit až budou k dispozici)
GOPAY_GOID=
GOPAY_CLIENT_ID=
GOPAY_CLIENT_SECRET=
GOPAY_ENV=sandbox
 
# Bankovní převod (dočasný můstek než bude GoPay aktivní, funguje bez API)
BANK_ACCOUNT_NUMBER=
BANK_IBAN=
 
# Doprava – Zásilkovna/Packeta
PACKETA_API_KEY=
PACKETA_API_PASSWORD=
 
# Doprava – PPL
PPL_API_KEY=
PPL_USERNAME=
PPL_PASSWORD=
 
# Doprava – Česká pošta
CESKA_POSTA_API_KEY=
 
# E-mail (notifikace objednávek)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=
 
# Firemní a kontaktní údaje NEJSOU tady v .env – editují se přímo v administraci (sekce 6.8)
# a žijí v databázi (tabulka Settings, sekce 7), aby je admin mohl měnit bez zásahu do kódu/redeploye.
 
# Analytika a marketing (volitelné, doplnit později)
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_META_PIXEL_ID=
META_CATALOG_FEED_URL=
GOOGLE_MERCHANT_ID=
 
# Cloudové úložiště obrázků (volitelné, do budoucna)
CLOUD_STORAGE_ACCESS_KEY=
CLOUD_STORAGE_SECRET=
CLOUD_STORAGE_BUCKET=
```
 
---
 
## 17. Postup práce po fázích
 
1. Základní architektura projektu (docker-compose skeleton s `web` + `worker` + `postgres`, sekce 3), databázové schéma a migrace, autentizace (zákazník + admin).
2. Veřejná část webu: homepage, katalog, detail produktu, košík, pokladna (zatím jen s bankovním převodem, bez dobírky).
3. Zákaznický účet: registrace/přihlášení, oblíbené, historie objednávek.
4. Administrace: produkty (+ upload s asynchronním zpracováním fotek přes worker a Sharp, sekce 9), kategorie, objednávky, zákaznická databáze.
5. Slevové kódy, dárkové poukazy a režim dovolené.
6. Příprava plateb (GoPay) a dopravy (Zásilkovna, PPL, Česká pošta) jako připravené, zatím neaktivní integrace.
7. Právní stránky, cookie lišta, GDPR.
8. SEO, GEO, strukturovaná data, sitemap.
9. Responzivita, přístupnost, bezpečnostní kontrola, seed data pro testování.
10. Zbylé úlohy na pozadí ve workeru (transakční e-maily, PDF faktury, feed pro Facebook/Google), reverzní proxy a nasazení na hosting.
Po každé fázi krátce napiš, co je hotové a co případně zůstává k doladění.
 
---
 
## 18. Marketingové a sociální integrace (Meta/Google)
 
Navazuje na SEO/GEO (sekce 12) a na cookie lištu (sekce 11) – bez ní by tyhle nástroje neměly běžet.
 
- **Datový feed produktů pro Facebook/Google** – vygeneruj endpoint (např. `/feed.xml`), který exportuje produkty ve formátu vyžadovaném Meta Commerce Manager / Google Merchant Center (ID produktu, název, cena, dostupnost, obrázek, kategorie dle jejich taxonomie, GTIN/EAN pokud existuje). Feed nechej pravidelně přegenerovávat jako naplánovanou úlohu ve `worker` kontejneru (sekce 3), ne při každém požadavku. Díky tomu se produkty automaticky propíšou do Facebook/Instagram katalogu a Google Nákupů.
- **Instagram Shopping (štítkování produktů)** – aby šlo štítkovat fotky na Instagramu přímo produkty z e-shopu, musí mít Linda navázaný a schválený produktový katalog přes Meta Commerce Manager, ověřenou firmu (business verification) a ověřené vlastnictví domény e-shopu. Tohle je administrativní krok na Metě, ne jen kus kódu – zmiň to zadavateli, ať štítkování nečeká hned po nasazení feedu.
- **Meta Pixel** – vlož sledovací skript pro retargeting (zákaznice vidí produkt na Instagramu, později jí ho připomeneme v reklamě). Pixel smí načíst/spustit se až po odsouhlasení marketingových cookies v cookie liště (sekce 11) – napoj to na existující cookie consent logiku, ne jako samostatný kód bokem.
- Do `.env` k tomu patří `META_PIXEL_ID`, `META_CATALOG_FEED_URL` a případně `GOOGLE_MERCHANT_ID` (sekce 16).
## 19. Kontrolní seznam – nic z původního zadání nesmí chybět
 
- ✅ Design na míru, bez šablon, bílá + hnědé tóny, bez italských vlajek, prémiové a zároveň rodinné (sekce 2)
- ✅ Registrace/přihlášení zákazníků + jeden admin účet s údaji v `.env` (sekce 5, 6, 16)
- ✅ Administrace: přidávání produktů – fotky (+ Sharp komprese), míry, velikosti, počty kusů (sekce 6.2, 9)
- ✅ Kategorie produktů (sekce 6.3)
- ✅ Sekce "O mně" – zatím bez fotek (sekce 1, 2)
- ✅ PostgreSQL databáze (sekce 3, 7)
- ✅ Zákaznická databáze v adminu – objednávky, přehled pro majitelku na jednom místě (sekce 6.5)
- ✅ Platby: pouze kartou přes GoPay, žádná dobírka; bankovní převod jen jako dočasný můstek do doby aktivace (sekce 8, 16)
- ✅ Doprava: příprava Zásilkovna, PPL, Česká pošta (sekce 8, 16)
- ✅ Oblíbené produkty pro přihlášené uživatele, perzistentní (sekce 5)
- ✅ SEO a GEO (sekce 12)
- ✅ Slevové kódy nastavitelné adminem v % (sekce 6.6)
- ✅ Režim "dovolená" s datem návratu a textem pro zákazníky (sekce 6.7)
- ✅ Cookies, obchodní podmínky, GDPR, reklamační řád – IČO jako placeholder (sekce 11)
- ✅ Čistý, oddělený, funkční kód (sekce 15)
- ✅ Jednoduchá a přehledná administrace (sekce 6.9)
- ✅ Responzivní design pro všechny velikosti displejů (sekce 13)
- ✅ Doplňkové funkce navržené navíc (sekce 14)
- ✅ Rozdělení práce mezi role a postup po fázích (úvod, sekce 17)
- ✅ Souhlas s obchodními podmínkami + oddělený souhlas s newsletterem, captcha proti spamu (sekce 5, 10)
- ✅ Evidence reklamací/vrácení, více admin účtů, obnova admin hesla (sekce 6.10–6.13)
- ✅ Dárkové poukazy jako platidlo (sekce 6.11)
- ✅ Docker – vícekontejnerová architektura `web` + `worker` + `postgres` s asynchronním zpracováním obrázků, e-mailů, faktur a feedu na pozadí, doporučení hostingu (sekce 3, 9, 15)
- ✅ Marketingové integrace – produktový feed pro Facebook/Google, Instagram Shopping, Meta Pixel napojený na cookie souhlas (sekce 18)
- ✅ Trvalé tlačítko na změnu nastavení cookies, ne jen banner při první návštěvě (sekce 11)
- ✅ E-mail na opuštěný košík jen pro přihlášené zákazníky, poslaný nejvýš jednou (`Cart.pripomenutoAt`, sekce 5, 7, 14)
- ✅ Stornování objednávky zákaznicí, dokud je ve stavu "Nová" (sekce 5, 6.4)
- ✅ Košík u přihlášených zákazníků uložený u účtu, přetrvá po odhlášení i na jiném zařízení, sloučí se s košíkem z prohlížeče při přihlášení (sekce 5, 7)
- ✅ Dárkové poukazy mají vlastní databázový model a propojení na objednávku, i pravidlo kombinace se slevovým kódem (sekce 6.11, 7, 8)
- ✅ Objednávka má snímek doručovací adresy (funguje i pro guest checkout), sledovací číslo zásilky a záznam, kdo ji zrušil (sekce 6.4, 7)
- ✅ Souhlas s newsletterem sjednocený na účtu (`User.newsletterSouhlas`), samostatná tabulka jen pro nepřihlášené (sekce 5)
- ✅ Smazání účtu (GDPR) anonymizuje osobní údaje, ale zachovává doklady/objednávky kvůli zákonné archivační povinnosti (sekce 5)
- ✅ Upozornění na docházející sklad u položek v košíku/oblíbených, jednorázově, s resetem při doplnění zásob (sekce 7, 14)
- ✅ Explicitně uvedená měna CZK (sekce 8)
- ✅ Kontrola dostupnosti položek v košíku, pokud je admin mezitím smaže/deaktivuje (sekce 5)
- ✅ Reklamace a vrácení mají vlastní datový model napojený na objednávku i (volitelně) na konkrétní položku; uznané vrácení automaticky vrátí kusy do skladu a přepne stav objednávky (sekce 6.10, 7)
- ✅ Výdejní místo (Zásilkovna) se ukládá k objednávce (sekce 7, 8)
- ✅ Pravidlo pro % slevu vůči už zlevněné ceně produktu (sekce 6.6)
- ✅ Jasně dané omezení na jeden dárkový poukaz na objednávku (sekce 7)
- ✅ Zákaz fyzického mazání produktů/variant s historií objednávek (sekce 6.2)
- ✅ Reset upozornění na docházející sklad při doplnění zásob, odlišení od `StockNotification` (sekce 14)
- ✅ Oprava vazby `StockNotification` → `ProductVariant` (sekce 7)
- ✅ `Settings` doplněny o ceny dopravy, práh dopravy zdarma, kontaktní údaje a odkazy na sociální sítě – vše editovatelné adminem, ne natvrdo v `.env` (sekce 6.8, 7, 16)
- ✅ Dárkové poukazy si může koupit i zákaznice sama jako fyzický produkt přes běžnou objednávku (adresa, doprava, platba), ne přes samostatný digitální proces (sekce 6.11, 7)
- ✅ Ikonky sociálních sítí v patičce, stylizované do palety webu (sekce 2, 4)
- ✅ Zpracování obrázků přes Sharp/worker platí i pro fotky kategorií, ne jen produktů (sekce 9)
- ✅ Dashboard zobrazuje i počet čekajících reklamací/vrácení, vedle nových objednávek a docházejícího skladu (sekce 6.1)
- ✅ Objednání víc kusů stejného dárkového poukazu najednou vygeneruje odpovídající počet samostatných unikátních kódů, ne jeden společný (sekce 6.11, 7)
- ✅ Admin formulář produktu skryje míry/materiál/péči u produktů typu dárkový poukaz (sekce 6.2)
**Cíl zůstává stejný jako na začátku: reálně fungující, kompletní a profesionální e-shop – ne prototyp.**
 