# Nasazení e-shopu – postup krok za krokem

Návod pro den, kdy se e-shop poprvé pustí na internet. Technické detaily
(co dělá který kontejner, jak fungují zálohy) jsou v [README](../README.md);
tady je **pořadí kroků a to, na čem se dá ztroskotat**.

Počítej s tím, že první nasazení zabere půl dne. Ne proto, že by bylo těžké,
ale protože se čeká: na DNS, na certifikát, na schválení platební brány.

---

## Co musí být hotové předem

| Věc | Kdo ji obstará | Pozn. |
|---|---|---|
| Doména | majitelka, na svůj účet | blokuje všechno ostatní |
| VPS | ty | aspoň 4 GB RAM |
| Klíče GoPay | majitelka | e-shop jede i bez nich (bankovní převod) |
| Klíče Zásilkovny | hotovo | `PACKETA_API_KEY`, `PACKETA_API_PASSWORD`, `PACKETA_ESHOP` |
| Heslo aplikace pro Gmail | hotovo | připravené v `.env` jako zakomentovaný blok |

**Doména i VPS patří majitelce**, ne tobě. Je to majetek obchodu: kdyby se
vaše cesty rozešly, nesmí e-shop zhasnout s tvým účtem.

---

## 1. Doména

Kterýkoli registrátor (Wedos, Forpsi, Active24, Cloudflare). U objednávky:

- **držitel = majitelka** (jméno, IČO, její e-mail)
- **zapni automatické prodloužení** – propadlá doména znamená mrtvý e-shop
  i e-maily a může ji koupit kdokoli jiný
- **nekupuj webhosting** od registrátora, web poběží na VPS
- DNS nech u registrátora, stačí

---

## 2. VPS

Ubuntu LTS, **aspoň 4 GB RAM**. Menší nestačí: současně běží web, Postgres
a worker, který fotky zpracovává Sharpem a ten si paměť vezme.

Po vytvoření dostaneš IP adresu a přístup přes SSH.

### Zabezpečení, než začneš cokoli instalovat

```bash
# přihlášení klíčem místo heslem (na svém počítači)
ssh-keygen -t ed25519
ssh-copy-id root@<IP>

# na serveru: vypnout přihlašování heslem
sudo nano /etc/ssh/sshd_config      # PasswordAuthentication no
sudo systemctl restart ssh

# firewall – ven jen SSH a web
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# bezpečnostní aktualizace samy
sudo apt install unattended-upgrades
```

Databáze ani aplikace se zvenčí nevystavují vůbec – chodí se na ně přes
vnitřní síť Dockeru.

---

## 3. Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER      # pak se odhlas a přihlas znovu
docker compose version             # kontrola
```

---

## 4. Kód na server

```bash
git clone <adresa repozitáře> linda-fashion
cd linda-fashion
```

U soukromého repozitáře budeš potřebovat přístupový token nebo nasazovací
klíč. Alternativa bez gitu je zkopírovat složku přes `scp`, ale pak se
aktualizace dělají hůř.

---

## 5. Soubor `.env`

```bash
cp .env.example .env
nano .env
```

Co **musí** být vyplněné:

```bash
DATABASE_URL=              # produkční compose si ji doplní sám na hostname `postgres`
POSTGRES_USER=             # vymyslíš
POSTGRES_PASSWORD=         # dlouhé náhodné heslo
POSTGRES_DB=linda_fashion

AUTH_SECRET=               # node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
APP_URL=https://<doména>   # bez lomítka na konci

ADMIN_EMAIL=lindafashioneshop@gmail.com
ADMIN_PASSWORD=            # heslo majitelky do administrace

BANK_ACCOUNT_NUMBER=
BANK_IBAN=
```

### Pozor na tyhle tři věci

**SMTP.** Vývojový `.env` míří na Mailpit (`SMTP_HOST=localhost`). Na server
patří **produkční blok pro Gmail**, který je v `.env` připravený zakomentovaný.
Když se zkopíruje vývojová verze, e-shop se tváří, že e-maily odesílá, ale
zákaznice nedostane nic – a potvrzení objednávky je povinné (§ 1822 o. z.).

**`NEXT_PUBLIC_*` se vpéká do stránky při buildu.** `NEXT_PUBLIC_GA_ID`
a `NEXT_PUBLIC_META_PIXEL_ID` proto musí být v `.env` **před** prvním
`up -d --build`. Doplnit je později znamená image přestavět, samotný restart
nestačí.

**`WEB_BIND` nech na `127.0.0.1`.** Znamená to, že se na web dá jen přes Caddy.
Kdo ho přepne na `0.0.0.0`, otevře hádání hesel: brzda se řídí hlavičkou
`X-Forwarded-For`, kterou si při přímém přístupu může kdokoli vymyslet.

---

## 6. Doména do Caddyfile

V souboru `Caddyfile` je zatím zástupná doména. Přepiš první řádek na tu
skutečnou:

```
tvojedomena.cz, www.tvojedomena.cz {
```

Bez toho si Caddy vyžádá certifikát na cizí doménu a HTTPS nenaběhne.

---

## 7. DNS

U registrátora nastav dva **A záznamy** na IP adresu serveru:

| Typ | Název | Hodnota |
|---|---|---|
| A | `@` | IP adresa VPS |
| A | `www` | IP adresa VPS |

Než se to rozšíří, trvá obvykle minuty, výjimečně hodiny. Zkontroluj:

```bash
nslookup tvojedomena.cz
```

**Nespouštěj další krok dřív, než doména ukazuje na server.** Caddy by
certifikát nedostal a Let's Encrypt má limit na počet neúspěšných pokusů.

---

## 8. Start

```bash
docker compose --profile proxy up -d --build
```

Poprvé to trvá několik minut – staví se image. Pak:

```bash
docker compose ps        # všechno má běžet
docker compose logs -f   # Ctrl+C ukončí sledování
```

Migrace databáze se spustí samy při startu webu, ruční krok není potřeba.
Účet administrátorky se založí z `.env`, pokud v databázi žádný není.

---

## 9. Naplnit obsah

Skripty jsou v produkčním image zkompilované, takže se pouští bez `ts-node`:

```bash
# identifikace prodávajícího do Settings
docker compose run --rm worker node dist/scripts/vyplnit-udaje-firmy.js

# obchodní podmínky a reklamační řád do databáze
docker compose run --rm worker node dist/scripts/vlozit-pravni-dokumenty.js
```

Druhý příkaz je důležitý. Dokud v tabulce žádné znění není, stránka sice
podmínky zobrazí ze záložního textu v kódu, ale **objednávka se pak nemá na co
odkázat** – a doložit, s čím zákaznice souhlasila, je smysl celé té tabulky.

Zbytek se vyplňuje v `/admin/nastaveni`:

- ceny dopravy (bez ceny se doprava vůbec nenabídne)
- práh pro dopravu zdarma, nebo prázdné, když se nenabízí
- hmotnost jednoho kusu (podklad pro zásilky Zásilkovny)
- adresa pro vracené zboží, e-mail pro GDPR, zápis v rejstříku

---

## 10. Kontrola, že to opravdu běží

Projdi to jako zákaznice, ne jen kouknutím na titulní stránku:

- [ ] `https://tvojedomena.cz` má **zámek v adresním řádku** (Caddy si certifikát vyřídil sám)
- [ ] `http://` přesměruje na `https://`
- [ ] Přihlášení do `/admin` funguje
- [ ] V `/admin` sekce **„Vyžaduje pozornost"** nehlásí nic kritického
- [ ] Zkušební objednávka projde až na potvrzovací stránku
- [ ] **Potvrzovací e-mail opravdu dorazí** do schránky
- [ ] Faktura se z potvrzovací stránky stáhne
- [ ] Zásilka u objednávky se založí a štítek se vytiskne
- [ ] Po zkoušce objednávku zruš – vrátí zboží na sklad

Teprve potom pusť odkaz mezi lidi.

---

## Když se něco pokazí

| Projev | Příčina |
|---|---|
| Caddy nedá HTTPS | doména ještě neukazuje na server, nebo je v `Caddyfile` stará |
| Web hlásí 502 | kontejner `web` nenaběhl – `docker compose logs web` |
| E-maily nechodí | v `.env` zůstal Mailpit, nebo prázdný `SMTP_HOST` |
| Analytika se nenačítá | `NEXT_PUBLIC_*` se doplnily bez `--build` |
| Fotky se nezpracují | neběží `worker` – `docker compose ps` |
| Administrace hlásí chybějící údaje | neproběhl krok 9 |

Logy konkrétní služby:

```bash
docker compose logs web
docker compose logs worker
docker compose logs caddy
```

---

## Po spuštění

Zálohy se rozjedou samy – každou noc ve 04:10 UTC. **Leží ale na tomtéž
serveru**, takže chrání před smazáním dat, ne před ztrátou serveru. Jak je
odvážet jinam a hlavně jak z nich obnovit, je v
[`zalohy-a-obnova.md`](zalohy-a-obnova.md).

Až dorazí klíče GoPay, doplní se do `.env` a stačí restart – platba kartou se
zapne sama, bez přestavování image:

```bash
docker compose up -d
```
