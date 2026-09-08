#!/bin/sh
# Noční záloha databáze a souborů.
#
# Běží ve vlastním kontejneru na `postgres:16-alpine`, protože `pg_dump` musí být
# ve stejné verzi jako server. Aplikační image (`node:20-alpine`) klienta Postgresu
# nemá a přidat ho tam nejde levně: `web` a `worker` sdílí jeden tag, takže by se
# nafoukly oba kvůli něčemu, co ani jeden nepotřebuje.
#
# Shell, ne Node — v tomhle image žádný Node není.
#
# Dvě použití:
#   sh /zaloha.sh --smycka   spustí se, počká na `ZALOHY_CAS` a pak jede každý den
#   sh /zaloha.sh --jednou   jedna záloha a konec (ruční spuštění, testy)
set -eu

# --- Nastavení -------------------------------------------------------------

# Kam se ukládá. V compose je to bind mount, aby zálohy šly ze serveru odvézt;
# pojmenovaný volume by se kopíroval mizerně a to je celý smysl téhle složky.
ZALOHY_DIR="${ZALOHY_DIR:-/zalohy}"

# Jak dlouho se zálohy drží.
#
# Není to jen o místu na disku. Záloha obsahuje osobní údaje, které retenční úloha
# z živé databáze už smazala, takže tohle číslo určuje, jak dlouho smazaná data
# ještě přežívají. Proto je stejně jako lhůty v `src/lib/retence.ts` zapsané
# v kódu a popsané v záznamech o činnostech zpracování, ne schované v konfiguraci.
ZALOHY_DNU="${ZALOHY_DNU:-30}"

# Kdy se to spouští, HH:MM v **UTC**.
#
# Kontejnery nemají `tzdata` ani `TZ`, takže všechno v tomhle nasazení jede v UTC
# včetně plánovaných úloh workeru. Míchat sem lokální čas by znamenalo, že dvě
# noční úlohy počítají čas jinak.
#
# 04:10 je schválně **po** retenci ve 03:20: záloha pořízená před ní by ještě
# obsahovala údaje, které retence právě smazala, a držela by je dalších 30 dní.
# A schválně ne v celou ani v půl — ostatní úlohy workeru běží na `*/15`, `*/30`,
# `0 */2` a `0 */4`, tedy přesně tam.
ZALOHY_CAS="${ZALOHY_CAS:-04:10}"

# Co zálohovat ze souborů. Volumes jsou připojené jen ke čtení pod jedním
# kořenem a **ve stejném rozložení, jaké má aplikace v `/app`**. Díky tomu jsou
# v archivu cesty `public/uploads/…` a `storage/faktury/…`, takže se obnova
# rozbaluje rovnou na místo a nikdo nemusí nic přesouvat.
ZDROJ_KOREN="${ZDROJ_KOREN:-/zdroj}"
CESTA_UPLOADS="${CESTA_UPLOADS:-public/uploads}"
CESTA_FAKTURY="${CESTA_FAKTURY:-storage/faktury}"

DB_DIR="$ZALOHY_DIR/db"
SOUBORY_DIR="$ZALOHY_DIR/soubory"
STAV="$ZALOHY_DIR/stav.json"

log() { echo "[zaloha] $(date -u '+%Y-%m-%d %H:%M:%S')Z $*"; }

# --- Stav pro administraci -------------------------------------------------

# Zapisuje `stav.json`, který čte `src/lib/zalohy.ts` a přes `provozniVarovani`
# ukazuje na `/admin`. Bez něj by se o zastavených zálohách nikdo nedozvěděl —
# přesně ta neviditelnost, kvůli které `provozni-kontrola.ts` vznikla.
#
# Píše se přes dočasný soubor a `mv`: aplikace ho čte kdykoliv a rozečtený
# polovroubek JSONu by jí spadl na parsování.
zapsat_stav() {
  mkdir -p "$ZALOHY_DIR"
  uspech="$1"
  chyba="$2"
  db_bajtu="${3:-0}"
  soubory_bajtu="${4:-0}"

  if [ -n "$chyba" ]; then
    chyba_json="\"$(echo "$chyba" | sed 's/\\/\\\\/g; s/"/\\"/g')\""
  else
    chyba_json='null'
  fi

  cat > "$STAV.tmp" <<KONEC
{
  "dokonceno": "$(date -u '+%Y-%m-%dT%H:%M:%SZ')",
  "uspech": $uspech,
  "chyba": $chyba_json,
  "dbBajtu": $db_bajtu,
  "souboryBajtu": $soubory_bajtu,
  "drzetDnu": $ZALOHY_DNU
}
KONEC
  mv "$STAV.tmp" "$STAV"
}

selhat() {
  log "CHYBA: $1"
  zapsat_stav false "$1"
  # Úklid starých záloh se schválně **nespouští** — poslední funkční záloha musí
  # přežít i sérii neúspěšných pokusů.
  return 1
}

# --- Jeden běh -------------------------------------------------------------

zalohovat() {
  mkdir -p "$DB_DIR" "$SOUBORY_DIR"
  razitko="$(date -u '+%Y-%m-%d_%H%M')"

  # 1) Databáze -------------------------------------------------------------
  #
  # `-Fc` je vlastní formát pg_dumpu: komprimovaný a `pg_restore` z něj umí
  # obnovit i jednotlivé tabulky. Prostý SQL výpis tohle neumí.
  #
  # Nejdřív `.probiha`, teprve po ověření přejmenovat. Přerušený dump (restart
  # serveru, plný disk) nesmí zůstat ležet pod jménem, které vypadá jako hotová
  # záloha — na to by se přišlo až ve chvíli, kdy je potřeba obnovit.
  db_soubor="$DB_DIR/$razitko.dump"
  log "zálohuji databázi $POSTGRES_DB…"

  if ! PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
        --host=postgres --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" \
        --format=custom --compress=6 --file="$db_soubor.probiha" 2>&1; then
    rm -f "$db_soubor.probiha"
    selhat "pg_dump selhal"
    return 1
  fi

  # Ověření je součást zálohy, ne luxus. Dump, který `pg_restore` nepřečte,
  # není záloha — jen soubor správné velikosti.
  if ! pg_restore --list "$db_soubor.probiha" > /dev/null 2>&1; then
    rm -f "$db_soubor.probiha"
    selhat "dump databáze je nečitelný (pg_restore --list selhal)"
    return 1
  fi

  mv "$db_soubor.probiha" "$db_soubor"
  db_bajtu="$(wc -c < "$db_soubor" | tr -d ' ')"
  log "databáze hotova ($db_bajtu B)"

  # 2) Soubory --------------------------------------------------------------
  #
  # Fotky produktů se z ničeho neobnoví: originál se po zpracování Sharpem maže,
  # takže WebP varianty jsou jediné, co existuje. Faktury jsou účetní doklady.
  #
  # `storage/tmp` se **nezálohuje schválně** — jsou to originály čekající na
  # zpracování, které úklidová úloha maže do patnácti minut. V záloze by byly
  # jen šum a nafouklý archiv.
  soubory_soubor="$SOUBORY_DIR/$razitko.tar.gz"
  log "zálohuji fotky a faktury…"

  # Relativní cesty proti `ZDROJ_KOREN`, ne absolutní — absolutní cesty se při
  # obnově rozbalují tam, odkud se zálohovalo, což skoro nikdy není to místo,
  # kam se obnovuje.
  cesty=''
  if [ -d "$ZDROJ_KOREN/$CESTA_UPLOADS" ]; then cesty="$cesty $CESTA_UPLOADS"; fi
  if [ -d "$ZDROJ_KOREN/$CESTA_FAKTURY" ]; then cesty="$cesty $CESTA_FAKTURY"; fi

  if [ -z "$cesty" ]; then
    selhat "zdrojové složky s fotkami ani fakturami neexistují"
    return 1
  fi

  # shellcheck disable=SC2086
  if ! tar czf "$soubory_soubor.probiha" -C "$ZDROJ_KOREN" $cesty 2>&1; then
    rm -f "$soubory_soubor.probiha"
    selhat "tar souborů selhal"
    return 1
  fi

  if ! tar tzf "$soubory_soubor.probiha" > /dev/null 2>&1; then
    rm -f "$soubory_soubor.probiha"
    selhat "archiv souborů je nečitelný"
    return 1
  fi

  mv "$soubory_soubor.probiha" "$soubory_soubor"
  soubory_bajtu="$(wc -c < "$soubory_soubor" | tr -d ' ')"
  log "soubory hotové ($soubory_bajtu B)"

  # 3) Úklid ----------------------------------------------------------------
  #
  # Až tady, po úspěchu obou částí. Kdyby se mazalo dřív, série neúspěšných
  # běhů by postupně smazala i tu poslední zálohu, ze které jde obnovit.
  smazano="$(find "$DB_DIR" "$SOUBORY_DIR" -type f -mtime "+$ZALOHY_DNU" -print -delete 2>/dev/null | wc -l | tr -d ' ')"
  if [ "$smazano" -gt 0 ]; then
    log "smazáno $smazano záloh starších než $ZALOHY_DNU dní"
  fi

  zapsat_stav true '' "$db_bajtu" "$soubory_bajtu"
  log "hotovo"
  return 0
}

# --- Spuštění --------------------------------------------------------------

# Kolik sekund zbývá do nejbližšího `ZALOHY_CAS` (UTC).
#
# Počítá se přes sekundy od půlnoci, ne přes `date -d`, který busybox v Alpine
# neumí ve stejném tvaru jako GNU date.
sekund_do_startu() {
  cil_h="${ZALOHY_CAS%%:*}"
  cil_m="${ZALOHY_CAS##*:}"
  cil=$(( ${cil_h#0} * 3600 + ${cil_m#0} * 60 ))

  ted_h="$(date -u '+%H')"
  ted_m="$(date -u '+%M')"
  ted_s="$(date -u '+%S')"
  ted=$(( ${ted_h#0} * 3600 + ${ted_m#0} * 60 + ${ted_s#0} ))

  rozdil=$(( cil - ted ))
  if [ "$rozdil" -le 0 ]; then
    rozdil=$(( rozdil + 86400 ))
  fi
  echo "$rozdil"
}

case "${1:---smycka}" in
  --jednou)
    zalohovat
    ;;
  --smycka)
    log "zálohy zapnuté – denně v $ZALOHY_CAS UTC, držím $ZALOHY_DNU dní, ukládám do $ZALOHY_DIR"
    while true; do
      cekat="$(sekund_do_startu)"
      log "další záloha za $(( cekat / 3600 )) h $(( (cekat % 3600) / 60 )) min"
      sleep "$cekat"
      # `|| true`: neúspěšná záloha nesmí shodit kontejner. Stav je zapsaný,
      # administrace to ukáže a zítra se to zkusí znovu.
      zalohovat || true
    done
    ;;
  *)
    echo "Použití: $0 [--smycka|--jednou]" >&2
    exit 2
    ;;
esac
