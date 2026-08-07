# LINDA FASHION

E-shop s italskou dámskou módou. Next.js 14 (App Router) + TypeScript + Tailwind +
Prisma/PostgreSQL, se samostatným `worker` procesem na úlohy běžící na pozadí.

---

## Rychlý start (vývoj)

Potřebuješ Node.js 20+ a Docker Desktop.

```bash
# 1. Závislosti
npm install

# 2. Konfigurace
cp .env.example .env
#    Vyplň aspoň DATABASE_URL, AUTH_SECRET, ADMIN_EMAIL a ADMIN_PASSWORD.
#    AUTH_SECRET vygeneruješ:
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"

# 3. Databáze v Dockeru (jen Postgres, na portu 5433)
docker compose -f docker-compose.dev.yml up -d

# 4. Schéma + ukázková data
npx prisma migrate dev
npm run db:seed

# 5. Web a worker – každý ve svém terminálu
npm run dev       # http://localhost:3000
npm run worker    # zpracování fotek na pozadí
```

Do administrace se přihlásíš na `/prihlaseni` údaji z `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

> **Proč Postgres na 5433?** Na 5432 často běží nativně nainstalovaný PostgreSQL
> jako služba a kontejner by se s ním pral. Port se nastavuje v `docker-compose.dev.yml`.

> **Worker musí běžet**, jinak zůstanou nahrané fotky viset ve stavu „zpracovává se“.
> Nic se ale neztratí – jakmile ho spustíš, worker si nedodělané fotky sám vyzvedne.

---

## Nasazení (produkce)

Celý stack v Dockeru na VPS – `web` + `worker` + `postgres`, volitelně Caddy
jako reverzní proxy s automatickým HTTPS.

```bash
cp .env.example .env      # vyplnit produkčními hodnotami
docker compose up -d --build

# s HTTPS (nejdřív přepiš doménu v Caddyfile):
docker compose --profile proxy up -d --build
```

Migrace se aplikují samy při startu kontejneru `web` (`prisma migrate deploy`),
takže nasazení nevyžaduje ruční krok v databázi. Prvotní admin účet se založí
z `.env`, pokud v databázi ještě žádný admin není.

`web` a `worker` sdílí jeden image i jednu kódovou základnu, liší se jen
spouštěcím příkazem.

---

## Příkazy

| Příkaz | Co dělá |
|---|---|
| `npm run dev` | vývojový server |
| `npm run worker` | worker (fotky, úklid, plánované úlohy) |
| `npm run build` | produkční build webu i workeru |
| `npm run typecheck` | kontrola typů |
| `npm run lint` | ESLint |
| `npm run db:migrate` | vytvoření a aplikace migrace |
| `npm run db:deploy` | aplikace migrací (produkce) |
| `npm run db:seed` | ukázková data |
| `npm run db:studio` | Prisma Studio – prohlížeč databáze |
| `npm run admin:reset-heslo -- <email> <heslo>` | reset hesla administrátorky |
| `npm test` | testy (peníze, slugy, validace uploadu) |

---

## Jak fungují fotky

Zpracování fotek je záměrně oddělené od webu, aby hromadné nahrání
nezpomalilo zákaznice, které si zrovna prohlížejí katalog.

```
admin nahraje fotku
   │
   ├─ web ověří typ (podle obsahu souboru, ne podle přípony) a velikost
   ├─ uloží originál do storage/tmp
   ├─ založí ProductImage ve stavu CEKA
   ├─ zařadí úlohu do fronty (pg-boss nad Postgresem)
   └─ hned odpoví – admin nečeká
          │
          ▼
   worker vyzvedne úlohu
   ├─ Sharp: 3 varianty WebP (1600 / 800 / 300 px), EXIF pryč
   ├─ smaže originál
   └─ nastaví HOTOVO (nebo CHYBA i s důvodem)
          │
          ▼
   administrace se ptá po 2,5 s na stav, dokud něco čeká
```

Naměřeno na fotce z mobilu **4032 × 3024 px, 8,5 MB**:

| varianta | rozměr | velikost |
|---|---|---|
| large | 1600 px | ~198 kB |
| medium | 800 px | ~4 kB |
| thumb | 300 px | ~0,4 kB |
| originál | – | smazán |
| **celkem** | | **~202 kB (2,4 % původní velikosti)** |

**Fotky se mažou samy.** Když majitelka smaže produkt nebo jednotlivou fotku,
odejdou z disku i všechny tři WebP varianty – v databázi po nich nezůstane
odkaz na soubor, který by tam ležel navždy.

Worker navíc každých 15 minut uklidí čtyři místa, kterými by disk jinak pomalu
utíkal:

| co | proč vzniká |
|---|---|
| osiřelé originály | admin vybral fotky ve formuláři a produkt neuložil |
| fotky zaseknuté v `CEKA` | v okamžiku nahrání se nepodařilo oslovit frontu |
| fotky zaseknuté v `ZPRACOVAVA_SE` | worker spadl nebo se restartoval uprostřed práce |
| originály po chybě zpracování | pokusy se vyčerpaly, originál už není k čemu |

### Kam se fotky ukládají

```
storage/tmp/      originál, jen do zpracování (pak se maže)
public/uploads/   hotové WebP varianty, tohle se servíruje
```

V Dockeru jsou obě složky **pojmenované volumes**, takže přežijí přestavbu image.
Pokud chceš mít fotky přímo na disku VPS (kvůli zálohování), přepiš v
`docker-compose.yml` volume na bind mount:

```yaml
volumes:
  - /srv/linda/uploads:/app/public/uploads
  - /srv/linda/storage:/app/storage
```

---

## Struktura

```
prisma/            schéma, migrace, seed
src/
  app/
    (shop)/        veřejná část
    (auth)/        přihlášení, registrace
    admin/         administrace
    api/           REST endpointy
  components/      ui/ · shop/ · admin/
  lib/             db, auth, session, fronta, Sharp, validace
  worker/          vstupní bod workeru + jobs/
  styles/
storage/tmp/       dočasné originály (mimo git)
public/uploads/    hotové WebP varianty (mimo git)
```

Klíčové soubory:

- `src/lib/session.ts` – JWT session, **Edge-safe** (importuje ho middleware)
- `src/lib/hesla.ts` – bcrypt, bez vazby na Next.js (používá i worker)
- `src/lib/auth.ts` – čtení session v Next.js kontextu
- `src/middleware.ts` – ochrana `/admin`, `/api/admin`, `/muj-ucet`, `/oblibene`
- `src/lib/queue.ts` – názvy front, sdílené mezi `web` a `worker`
- `src/lib/sharp-image.ts` – zpracování obrázků (běží **jen** ve workeru)

Kód workeru používá **relativní importy**, ne alias `@/` – kompiluje se
samostatně přes `tsconfig.worker.json` a `tsc` cesty v outputu nepřepisuje.

---

## Co zatím čeká na API klíče

E-shop běží i bez nich; klíče se doplní do `.env`, bez zásahu do kódu.

| Oblast | Stav |
|---|---|
| GoPay | rozhraní připravené, čeká na `GOPAY_*` |
| Zásilkovna / PPL / Česká pošta | rozhraní připravené, ceny se zatím zadávají ručně v nastavení |
| E-maily (SMTP) | worker má úlohu připravenou, zatím jen loguje |
| Cloudflare Turnstile | čeká na `TURNSTILE_*` |
| GA4 / Meta Pixel | čeká na `NEXT_PUBLIC_*`, spustí se až po souhlasu s cookies |
