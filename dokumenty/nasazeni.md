# Spuštění e-shopu – kompletní postup

Všechno, co je potřeba vyřídit, než e-shop poběží na internetu, v pořadí, ve kterém
na sobě kroky závisí. Zaškrtávej průběžně.

**Sestava:** doména u českého registrátora → VPS u **OVHcloud** (Ubuntu 24.04) →
**Coolify** (nasazuje z GitHubu automaticky po každém pushi) → náš `docker-compose.yml`
(web, worker, Postgres, zálohy).

Hetzner byl první volba, ale jeho levné servery (CX/CAX) jsou od září 2026
nedostupné a řada CPX po zdražení vychází zhruba třikrát dráž. Postup je
u kteréhokoli poskytovatele VPS stejný – liší se jen část B1.

> **Všechno, co se platí, patří majitelce.** Doména, server i platební brána se
> zakládají na její jméno, její IČO a její kartu; vývojář dostane jen přístupy.
> Kdyby se cesty rozešly, nesmí e-shop zhasnout s cizím účtem.

---

## Přehled

| # | Co | Kdo | Blokuje |
|---|---|---|---|
| A1 | Doména | majitelka | DNS, GoPay, HTTPS |
| A2 | Účet OVHcloud + server | majitelka platí, vývojář nastaví | všechno technické |
| A3 | Heslo aplikace pro Gmail | majitelka | e-maily zákaznicím |
| A4 | Číslo účtu a IBAN | majitelka | platby převodem |
| A5 | GoPay | majitelka | platba kartou (e-shop jede i bez ní) |
| A6 | Česká pošta, PPL | majitelka rozhodne | nabídka dopravy |
| A7 | Schválení obchodních podmínek | majitelka | spuštění |
| B1–B9 | Server, Coolify, nasazení | vývojář | — |
| C | GoPay zapnout | vývojář | — |
| D | Běžný provoz | vývojář | — |

---

# A. S majitelkou

## A1. Doména `lindashop.cz`

- [ ] U kteréhokoli českého registrátora (Wedos, Forpsi, Active24…) ověřit, že je volná.
- [ ] Objednat. **Držitel:** Martina Ludvíková, sídlo, IČO 02688468, e-mail
      `lindafashioneshop@gmail.com`.
- [ ] **Zapnout automatické prodlužování.** Propadlou doménu může koupit kdokoli
      a s ní zmizí web i e-maily.
- [ ] **Nic nepřikupovat** – webhosting, e-mail ani „SSL certifikát". Web poběží na
      vlastním serveru a HTTPS si zařídí sám.
- [ ] Vývojář dostane přístup k nastavení DNS (krok B4).

## A2. OVHcloud – účet a server

**Účet:**
- [ ] ovhcloud.com → vytvořit účet na `lindafashioneshop@gmail.com`, údaje podnikatelky
      (jméno, sídlo, IČO), platební karta.
- [ ] Pokud OVH chce ověřit totožnost nebo platbu, udělat to rovnou – server se jinak
      nevydá.

**Server (konfigurátor VPS):**
- [ ] **VPS Model 2: 4 vCore, 8 GB RAM, 75 GB NVMe.** Méně než 4 GB RAM ne – sestavení
      webu po každém pushi potřebuje paměť navíc k běžícímu provozu.
- [ ] **Lokalita v EU** (Frankfurt, Gravelines, Strasbourg, Varšava) – kvůli osobním údajům.
- [ ] **Systém Ubuntu 24.04**, bez předinstalovaných aplikací. 26.04 také funguje, ale
      24.04 je vyzkoušenější a podporu má do roku 2029.
- [ ] **Automatické zálohy** přiobjednat. Naše noční zálohy leží na témže serveru
      a ztrátu celého serveru nepřežijí; tyhle ano.
- [ ] **Platba:** konfigurátor nabízí i 12 měsíců předem (levnější, ale nevratné).
      Na začátek měsíčně, na roční přejít, až web běží.
- [ ] Po zaplacení přijde e-mail s **IP adresou** serveru.

## A3. Gmail – heslo aplikace

Majitelka přihlášená do `lindafashioneshop@gmail.com`:
- [ ] Účet Google → Zabezpečení → zapnout **Dvoufázové ověření**.
- [ ] Ve vyhledávání účtu Google: **„Hesla aplikací"** → název `LINDA e-shop` → Vytvořit.
- [ ] Opsat 16znakové heslo (ukáže se jen jednou). **Neposílat chatem ani e-mailem** –
      vloží se rovnou do Coolify jako `SMTP_PASSWORD`.

Zdarma má Gmail limit kolem 500 zpráv denně, na butik dost.

## A4. Bankovní účet

- [ ] Číslo účtu (`123456789/0800`) a IBAN (`CZ…`) účtu, na který mají chodit platby.
      Tisknou se na doklad, do e-mailu i do QR kódu. Překlep = peníze na cizím účtu.

## A5. GoPay

- [ ] Zjistit stav registrace (podaná 11. 9. 2026).
- [ ] Domluvit, že web poběží na `https://lindashop.cz`. GoPay před schválením web
      prochází (obchodní podmínky, kontakty, ceny, doprava, reklamace), takže **finální
      schválení přijde až po spuštění** – do té doby e-shop nabízí jen převod.
- [ ] Zeptat se, zda na webu chtějí logo GoPay nebo loga karet.
- [ ] Po schválení získat **GoID, ClientID, ClientSecret** – testovací (sandbox) i ostré.

## A6. Doprava – Česká pošta a PPL

- [ ] **Česká pošta – jakou službu?**
  - *Balík Do ruky* (na adresu) – web ho umí už teď.
  - *Balíkovna* (výdejní místa pošty) – je potřeba doprogramovat výběr místa.
- [ ] **Jak bude podávat?** Na přepážce bez smlouvy, nebo přes online podání na webu
      České pošty (tisk štítků, obvykle levnější; smlouva se slevami při vyšším objemu).
      Napojení přes API nemáme – číslo zásilky se zapisuje u objednávky ručně.
- [ ] **PPL – má s nimi smlouvu?** Pokud ne, cena PPL v nastavení zůstane prázdná
      a pokladna PPL nenabídne. Nabízet dopravu, kterou neposílá, nejde.
- [ ] Ceny, které bude zákaznicím účtovat (vyplní v B8).

Zásilkovna je hotová – účet schválený, klíče jsou v klientské sekci.

## A7. Obchodní podmínky

- [ ] Majitelka projde `/obchodni-podminky` a `/reklamacni-rad` (verze 2026-10-15) a
      potvrdí hlavně: **splatnost převodu 3 pracovní dny**, náhradu skutečných nákladů
      u nevyzvednuté zásilky, poukazy bez časového omezení a bez proplacení.
- [ ] Každá změna = nové znění (`VYCHOZI_ZNENI` v `src/lib/pravni-dokumenty.ts`)
      a nové vydání v kroku B8. Splatnost žije i v `SPLATNOST_PRACOVNICH_DNU`
      v `src/lib/lhuty.ts` – musí sedět.

---

# B. Server a nasazení

## B1. Přihlášení na server

Na svém počítači (jednou):

```bash
ssh-keygen -t ed25519          # Enter, Enter – klíč vznikne v ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub      # tenhle veřejný klíč patří na server
```

Klíč se vloží při objednávce serveru, nebo se nahraje dodatečně
(`ssh-copy-id ubuntu@<IP>`). U OVH je výchozí uživatel `ubuntu`, ne `root`:

```bash
ssh ubuntu@<IP>
sudo -i                        # administrátorská práva pro další kroky
```

## B2. Základní zabezpečení, swap

```bash
apt update && apt upgrade -y
apt install -y unattended-upgrades       # bezpečnostní záplaty se instalují samy

# firewall – ven jen SSH, web a dočasně panel Coolify
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw allow 8000
ufw enable

# swap 4 GB – záchranná brzda, kdyby sestavení webu došla paměť
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

Přihlašování heslem vypnout (jen klíčem): v `/etc/ssh/sshd_config` nastavit
`PasswordAuthentication no` a `systemctl restart ssh`. **Předtím ověřit, že přihlášení
klíčem funguje**, jinak se na server nedostaneš.

Docker si nainstaluje Coolify samo. Databáze ani aplikace nepublikují porty ven.

## B3. Coolify

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

- [ ] **Hned** otevřít `http://<IP>:8000` a založit admin účet. Kdo tam přijde první,
      je administrátor.
- [ ] Server → **Docker Cleanup** zapnout (staré image po buildech jinak zaplní disk).
- [ ] **Sources → + Add → GitHub App**, nainstalovat jen na repozitář
      `Fajlajpos/LINDAFASHION` (může zůstat soukromý).
- [ ] Volitelně panel na vlastní doménu `https://coolify.lindashop.cz`
      (DNS v B4) a pak port 8000 zavřít: `ufw delete allow 8000`.

## B4. DNS

U registrátora:

| Typ | Název | Hodnota |
|---|---|---|
| A | `@` | IP serveru |
| A | `www` | IP serveru |
| A | `coolify` | IP serveru (jen pro panel) |

Kontrola: `nslookup lindashop.cz` musí vrátit IP serveru. Obvykle minuty, výjimečně
hodiny. **Nasazovat až potom** – certifikát pro HTTPS se jinak nevydá.

## B5. Úpravy projektu pro Coolify – před prvním nasazením

`docker-compose.yml` je psaný pro holý server s vlastní Caddy. Pro Coolify:

- [x] **Caddy je v samostatném `docker-compose.caddy.yml`.** Coolify má vlastní proxy
      na 80/443; hlavní compose ji proto vůbec neobsahuje.
- [x] **Skript záloh je zapečený v obrazu** (`deploy/zalohy.Dockerfile`). Coolify soubory
      z repozitáře k běžícím kontejnerům nepřipojuje.
- [x] **Zálohy** ukládá Coolify do `/data/coolify/applications/<uuid>/zalohy`. Složka
      nasazení přežívá (ověřeno); smazala by se jen se smazáním celé aplikace v Coolify.
- [ ] **Pevné `container_name`** ověřit proti Coolify (při novém nasazení nesmí
      kolidovat se starým kontejnerem).
- [ ] Ověřit, že proxy Coolify posílá skutečnou IP návštěvníka v `X-Forwarded-For` –
      opírá se o ni brzda proti hádání hesel.
- [ ] Ověřit, že `APP_URL` a `NEXT_PUBLIC_*` se dostanou do sestavení jako build args.

## B6. Projekt v Coolify

- [ ] **Projects → + Add** → `LINDA FASHION` → prostředí `production`
      → **+ New → Private Repository (with GitHub App)**.
- [ ] Repozitář `LINDAFASHION`, větev `main`, **Build Pack: Docker Compose**,
      soubor `/docker-compose.yml`.
- [ ] U služby **web** doména `https://lindashop.cz:3000` (port říká, kde web uvnitř
      poslouchá; zákaznice ho v adrese neuvidí). Přesměrování `www` → bez `www`.
- [ ] **Environment Variables** (Developer view, vložit najednou):

```bash
# Databáze – heslo dlouhé a náhodné, nikde jinde nepoužité
POSTGRES_USER=linda
POSTGRES_PASSWORD=
POSTGRES_DB=linda_fashion

# Přihlášení – vygenerovat:
#   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
AUTH_SECRET=
APP_URL=https://lindashop.cz
WEB_BIND=127.0.0.1

# První administrátorka (založí se, jen když v databázi žádná není)
ADMIN_EMAIL=lindafashioneshop@gmail.com
ADMIN_PASSWORD=

# Převod (A4)
BANK_ACCOUNT_NUMBER=
BANK_IBAN=

# Zásilkovna – PACKETA_ESHOP je „Označení" odesílatele, musí sedět na znak
PACKETA_API_KEY=
PACKETA_API_PASSWORD=
PACKETA_ESHOP=

# E-mail přes Gmail (A3) – EMAIL_FROM musí mít stejnou adresu jako SMTP_USER
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=lindafashioneshop@gmail.com
SMTP_PASSWORD=
EMAIL_FROM=LINDA FASHION <lindafashioneshop@gmail.com>

# Zálohy
ZALOHY_DNU=30
ZALOHY_CAS=04:10

# GoPay – zatím prázdné, doplní se v kroku C
GOPAY_GOID=
GOPAY_CLIENT_ID=
GOPAY_CLIENT_SECRET=
GOPAY_ENV=sandbox

# Volitelné, až budou: Turnstile, analytika (NEXT_PUBLIC_* chce nové sestavení)
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_META_PIXEL_ID=
```

- [ ] **Auto Deploy** zapnuté.
- [ ] **Deploy.** První sestavení 5–10 minut, průběh v logu.

**Pozor:** vývojový `.env` z počítače sem nekopírovat – míří na Mailpit, takže by e-shop
„odesílal" e-maily, které nikdy neodejdou. A `NEXT_PUBLIC_*` a `APP_URL` se vpékají do
stránky při sestavení: po jejich změně je potřeba **Redeploy**, restart nestačí.

## B7. Kontrola, že web žije

- [ ] `https://lindashop.cz/api/health` odpoví v pořádku.
- [ ] Zámek v adresním řádku, `http://` přesměruje na `https://`.
- [ ] Přihlášení do `/admin` účtem z `ADMIN_EMAIL`.

## B8. Naplnit obsah

V Coolify → služba **worker** → **Terminal**:

```bash
node dist/scripts/vyplnit-udaje-firmy.js        # identifikace prodávající do nastavení
node dist/scripts/vlozit-pravni-dokumenty.js    # obchodní podmínky a reklamační řád
```

Druhý příkaz je povinný: bez uloženého znění se objednávka nemá na co odkázat a nedá
se doložit, s čím zákaznice souhlasila. **`prisma/seed.ts` na serveru nikdy nespouštět** –
maže katalog.

Majitelka v `/admin/nastaveni`:
- [ ] ceny dopravy (prázdná cena = doprava se nenabízí; PPL jen se smlouvou)
- [ ] doprava zdarma: nechat prázdné, dokud ji nechce nabízet
- [ ] hmotnost jednoho kusu (pro Zásilkovnu)
- [ ] adresa provozovny, otevírací doba, adresa pro vrácení, e-mail pro GDPR

Pak produkty a fotky v `/admin/produkty`.

## B9. Zkušební objednávka

Projít jako zákaznice:
- [ ] Košík → Údaje → Doprava a platba → Shrnutí → Objednat.
- [ ] **Potvrzovací e-mail opravdu dorazí** (i do mobilu, ne do spamu).
- [ ] Doklad se stáhne, má **správný účet a IBAN**, stav „Čeká na úhradu" a splatnost.
- [ ] QR kód jde načíst v bankovní aplikaci (nemusí se platit).
- [ ] Zásilkovna: zásilka se u objednávky založí a štítek vytiskne.
- [ ] Objednávku v administraci zrušit – zboží se vrátí na sklad, doklad dostane „ZRUŠENO".
- [ ] `/admin` – sekce „Vyžaduje pozornost" nehlásí nic kritického (zálohy se objeví
      po první noci).

Teprve potom pustit odkaz mezi lidi.

---

# C. GoPay – až po schválení

- [ ] V administraci GoPay **povolit notifikační adresu**
      `https://lindashop.cz/api/platba/gopay/notifikace`. Bez ní se objednávka po
      zaplacení sama neoznačí jako zaplacená.
- [ ] V Coolify doplnit testovací `GOPAY_GOID`, `GOPAY_CLIENT_ID`, `GOPAY_CLIENT_SECRET`,
      `GOPAY_ENV=sandbox` → **Restart** (nové sestavení není potřeba).
- [ ] Zkušební platba kartou v sandboxu – objednávka se sama přepne na zaplacenou,
      doklad ukáže „Uhrazeno".
- [ ] Ostré údaje a `GOPAY_ENV=production` (přesně takhle, cokoli jiného míří do sandboxu)
      → Restart.

---

# D. Smlouvy o zpracování (GDPR)

Do [zpracovatele-a-smlouvy.md](zpracovatele-a-smlouvy.md) doplnit a u každého mít
uzavřenou smlouvu podle čl. 28 GDPR (u velkých poskytovatelů bývá součástí podmínek):

- [ ] OVHcloud (server – drží celou databázi)
- [ ] GoPay
- [ ] Zásilkovna (a Česká pošta / PPL, pokud se budou používat)
- [ ] Google (Gmail – odchozí e-maily)

---

# E. Běžný provoz

**Nová verze webu:** `npm test` → commit → `git push` do `main`. Coolify si to samo
stáhne, sestaví a nasadí (pár minut); migrace databáze proběhnou při startu webu.
Průběh a chyby v Coolify → Deployments. Když sestavení selže, běží dál stará verze.
Každý push do `main` jde rovnou k zákaznicím – rozpracované věci patří do jiné větve.

**Zálohy:** každou noc ve 04:10 UTC, drží se 30 dní; stav ukazuje `/admin`. Leží na
témže serveru – proto i zálohy OVH (A2). Občas stáhnout k sobě, viz
[zalohy-a-obnova.md](zalohy-a-obnova.md). **Jednou za čas zkusit obnovu** – záloha,
ze které nikdo nikdy neobnovoval, je jen naděje.

**Nezaplacené objednávky:** po 3 pracovních dnech je může majitelka zrušit v administraci
(vrátí sklad, kód i poukaz a pošle zákaznici e-mail). Automaticky se neruší.

**Nová verze Ubuntu (za pár let):** nejbezpečněji nový server s novým Ubuntu a Coolify,
obnovit na něj zálohu, ověřit a pak přepnout IP v DNS. Starý server mezitím běží.

---

## Když se něco pokazí

| Projev | Příčina |
|---|---|
| Nenaběhne HTTPS | doména ještě neukazuje na server (B4) |
| Sestavení spadne na paměť | chybí swap (B2) |
| Web hlásí 502 / Bad Gateway | služba `web` nenaběhla – log v Coolify |
| E-maily nechodí | špatné `SMTP_*`, běžné heslo místo hesla aplikace, nebo `EMAIL_FROM` ≠ `SMTP_USER` |
| Platba kartou se nenabízí | chybí některý z `GOPAY_*` |
| Zaplacená objednávka se neoznačí | GoPay nemá povolenou notifikační adresu (C) |
| Analytika se nenačítá | `NEXT_PUBLIC_*` doplněné bez Redeploy |
| Fotky se nezpracují | neběží `worker` |
| Zásilkovna nejde založit | `PACKETA_ESHOP` nesedí na „Označení" odesílatele |
| Administrace hlásí chybějící údaje | neproběhl krok B8 |

---

## Bez Coolify

`docker-compose.yml` jde pustit i na holém serveru s Dockerem a vlastní Caddy:
`.env` vedle compose, v `Caddyfile` skutečná doména, pak
`docker compose -f docker-compose.yml -f docker-compose.caddy.yml up -d --build`. Aktualizace pak ručně (`git pull`
a totéž znovu) – proto je výchozí cesta Coolify.
