# Zálohy a obnova

Zálohuje kontejner `zalohy` z `docker-compose.yml`, skript je `deploy/zaloha.sh`.
Běží **každou noc ve 04:10 UTC** (tedy 05:10 SEČ / 06:10 SELČ) a drží **30 dní**.

Kontejnery nemají `tzdata`, takže celé nasazení včetně plánovaných úloh workeru
jede v UTC. Čas je schválně **až po retenční úloze ve 03:20**: záloha pořízená
před ní by ještě obsahovala údaje, které retence právě smazala, a držela by je
dalších třicet dní.

Skript nečeká na budík, ale každých deset minut se ptá: **proběhl od posledního
04:10 UTC nějaký pokus?** Když ne, zálohuje hned. Proto:

- **po startu kontejneru** (první nasazení, restart serveru) proběhne záloha
  okamžitě — dřív se až do rána nezálohovalo vůbec;
- **zmeškaný den se dožene** — vypnutý nebo uspaný stroj dřív posunul jedno dlouhé
  `sleep` o dobu spánku a slot se minul;
- **restart nezálohuje dvakrát** — pokus po posledním slotu už je zapsaný;
- dohnaný běh je vždy po dnešním 04:10, takže **pořád až po retenci**;
- **neúspěch se zkusí znovu za hodinu** — většina selhání je přechodná a celý den
  kritické hlášky kvůli něčemu, co se samo spravilo, by jen otupilo pozornost.
  Ne každých deset minut: nad plným diskem by se `pg_dump` jen točil dokola.
  Po opravě příčiny jde hned pustit [ruční zálohu](#ruční-záloha);
- **před `pg_dump` čeká až 5 minut, než databáze přijímá spojení** (`pg_isready`).
  `depends_on: service_healthy` platí jen pro `docker compose up`. Po startu počítače
  nebo rebootu serveru nahazuje kontejnery Docker sám a pouští je všechny naráz —
  první záloha pak sáhla do Postgresu dřív, než naběhl, a skončila na
  `Connection refused`.

„Pokus" je `mtime` souboru `zalohy/stav.json`, který se zapisuje i při chybě.

## Co se zálohuje

| Co | Kam | Proč |
|---|---|---|
| Celá databáze (`pg_dump -Fc`) | `zalohy/db/RRRR-MM-DD_HHMM.dump` | objednávky a faktury jsou účetní doklady, cenová evidence je důkaz podle § 12a |
| `public/uploads` | `zalohy/soubory/RRRR-MM-DD_HHMM.tar.gz` | **fotky produktů nejdou vyrobit znovu** – originál se po zpracování Sharpem maže |
| `storage/faktury` | tentýž archiv | PDF doklady k objednávkám |

### Co se nezálohuje a proč

- **`storage/tmp`** – originály čekající na zpracování, které úklidová úloha maže
  do patnácti minut. V záloze by byly jen šum a nafouklý archiv.
- **Certifikáty Caddy (`caddy_data`)** – Let's Encrypt je vydá znovu během pár
  minut. Zálohovat privátní klíče zbytečně zvyšuje expozici za něco, co se
  obnoví samo.

## Čemu to zabrání a čemu ne

Zálohy leží **na tomtéž serveru jako databáze**. Chrání před smazáním, rozbitou
migrací, poškozením dat i překlepem v administraci.

**Nechrání před ztrátou serveru.** Když shoří VPS, shoří s ním i zálohy. Kdo chce
být chráněný i proti tomu, musí je pravidelně odvážet jinam — proto je výstup
bind mount `./zalohy`, a ne pojmenovaný volume:

```bash
# ze svého počítače, klidně v cronu
rsync -avz --delete uzivatel@server:/cesta/k/projektu/zalohy/ ~/zalohy-linda/
```

Na cizím úložišti už dává smysl i šifrování (`gpg -c`), tady na serveru ne —
heslo by leželo v `.env` hned vedle záloh.

## Jak se pozná, že zálohy běží

Skript po každém běhu zapíše `zalohy/stav.json`. Administrace ho čte a na
`/admin` v sekci „Vyžaduje pozornost" hlásí:

- **Poslední záloha selhala** (kritické) – i s důvodem
- **Zálohy přestaly přibývat** (kritické) – poslední je starší než 36 hodin
- **Neběží zálohování** (kritické) – žádný `stav.json`, tedy služba `zalohy` neběží

Podrobnosti vždy v `docker compose logs zalohy`.

## Ruční záloha

```bash
docker compose run --rm zalohy sh /zaloha.sh --jednou
```

Skončí nenulovým kódem, když se něco nepovede.

## Ve vývoji

`docker-compose.dev.yml` má stejnou službu `zalohy` (kontejner `linda_zalohy_dev`),
takže ji `npm run dev` nahodí spolu s databází. Zálohuje stejným skriptem do
stejné složky `./zalohy`, jen zdrojem jsou `./public/uploads` a `./storage`
z pracovního adresáře. Díky tomu jde zálohu i obnovu vyzkoušet lokálně dřív,
než to poprvé poběží na serveru.

```bash
docker compose -f docker-compose.dev.yml logs zalohy
docker compose -f docker-compose.dev.yml run --rm zalohy sh /zaloha.sh --jednou
```

Počítač v noci obvykle nejede — nevadí, zmeškaný den se dožene po spuštění.

> Skript se do kontejneru připojuje přímo z Windows. `.gitattributes` proto drží
> `*.sh` v LF: s `core.autocrlf=true` by ho checkout převedl na CRLF, Alpine `sh`
> by spadl na `set: illegal option -` a kontejner by nezálohoval.

---

# Obnova

## Databáze

> Přepíše **všechna** data. Nejdřív si udělej zálohu současného stavu.

```bash
# 1) Zastavit vše, co do databáze zapisuje
docker compose stop web worker

# 2) Prázdná databáze místo staré
docker compose exec postgres psql -U linda -d postgres \
  -c 'DROP DATABASE IF EXISTS linda_fashion' \
  -c 'CREATE DATABASE linda_fashion'

# 3) Obnovit vybranou zálohu
docker compose exec -T postgres pg_restore \
  -U linda -d linda_fashion --no-owner < zalohy/db/2026-09-08_0410.dump

# 4) Nahodit zpět
docker compose start web worker
```

`--no-owner` je tam schválně: dump si pamatuje původního vlastníka objektů a bez
toho přepínače obnova spadne, když se uživatel v databázi jmenuje jinak.

Migrace se po startu `web` doženou samy (`prisma migrate deploy`), takže obnovit
starší zálohu do novějšího nasazení jde.

## Fotky a faktury

Archiv má uvnitř cesty `public/uploads/…` a `storage/faktury/…`, tedy přesně
rozložení, jaké má aplikace v `/app`. Rozbaluje se proto rovnou na místo:

```bash
docker compose stop web worker

docker run --rm \
  -v lindafashion_uploads_data:/app/public/uploads \
  -v lindafashion_storage_data:/app/storage \
  -v "$PWD/zalohy:/zalohy:ro" \
  alpine sh -c '
    tar xzf /zalohy/soubory/2026-09-08_0410.tar.gz -C /app &&
    chown -R 1001:1001 /app/public/uploads /app/storage
  '

docker compose start web worker
```

**`chown` není volitelný.** Aplikace běží pod uživatelem `nextjs` (uid 1001) a do
souborů rozbalených rootem by nezapsala — nové fotky by se přestaly nahrávat.

Název volume má předponu podle jména složky projektu; ověř si ho přes
`docker volume ls`.

## Ověření obnovy

```bash
docker compose exec postgres psql -U linda -d linda_fashion \
  -c 'select count(*) from "Order"' \
  -c 'select count(*) from "Product"' \
  -c 'select count(*) from "PriceHistory"'
```

Postup byl vyzkoušený proti skutečné záloze: obnova do prázdné databáze vrátila
všech 24 tabulek a počty řádků seděly.

**Záloha, ze které se nikdo nikdy nepokusil obnovit, není záloha.** Stojí za to
si to jednou za čas zkusit nanečisto do pomocné databáze (`CREATE DATABASE
linda_zkouska` a `pg_restore -d linda_zkouska`), kde to nic neohrozí.
