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
#   sh /zaloha.sh --smycka   denně po `ZALOHY_CAS`; zmeškaný den (i první start) dožene hned
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

# Jak dlouho čekat na databázi. Postgres po startu obvykle naběhne do pár
# sekund; po nečistém vypnutí ale přehrává WAL a to trvá déle.
CEKAT_NA_DB_SEKUND=300

cekat_na_databazi() {
  zbyva="$CEKAT_NA_DB_SEKUND"
  while ! pg_isready --host=postgres --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" \
        > /dev/null 2>&1; do
    if [ "$zbyva" -le 0 ]; then
      return 1
    fi
    if [ "$zbyva" -eq "$CEKAT_NA_DB_SEKUND" ]; then
      log "databáze ještě nepřijímá spojení, čekám…"
    fi
    sleep 5
    zbyva=$(( zbyva - 5 ))
  done
}

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

  # Počkat, až Postgres přijímá spojení. `depends_on: service_healthy` v compose
  # tohle nezaručí: platí jen pro `docker compose up`, ne když kontejnery po
  # startu počítače nebo rebootu serveru nahazuje sám Docker. Ten pustí všechno
  # naráz, záloha po startu sáhla do databáze o vteřinu dřív, než naběhla,
  # a `pg_dump` skončil na „Connection refused".
  if ! cekat_na_databazi; then
    selhat "databáze nepřijímá spojení ani po $CEKAT_NA_DB_SEKUND s"
    return 1
  fi

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

# Smyčka se neřídí tím, „kolik zbývá do 04:10", ale otázkou „proběhl od posledního
# 04:10 nějaký pokus?". Dřív tu bylo jedno dlouhé `sleep` až do `ZALOHY_CAS`
# a to mělo dvě tiché díry:
#
#   • po startu kontejneru (první nasazení, restart serveru) se až do rána
#     nezálohovalo vůbec a administrace celý den hlásila „Neběží zálohování";
#   • `sleep` neběží, když stroj spí. Uspaný počítač (vývoj na Docker Desktopu,
#     ale i pozastavená VPS) posunul běh o dobu spánku, slot se minul a po 36
#     hodinách naskočilo „Zálohy přestaly přibývat".
#
# Teď se každých `KONTROLA_SEKUND` porovná čas posledního pokusu se slotem.
# Chybějící `stav.json` znamená „nikdy" → záloha proběhne hned po startu.
# Zmeškaný slot se dožene při nejbližší kontrole.
#
# Pořadí vůči retenci (03:20) zůstává: dohnaný běh je vždycky **po** dnešním
# `ZALOHY_CAS`, takže i po retenci.
#
# Počítá se z `date -u +%s`, ne přes `date -d`, který busybox v Alpine neumí ve
# stejném tvaru jako GNU date. Unixový čas nemá přestupné sekundy, takže zbytek
# po dělení 86 400 je přesně počet sekund od půlnoci UTC.
KONTROLA_SEKUND=600

# Epoch posledního `ZALOHY_CAS`, který už nastal.
posledni_slot() {
  cil_h="${ZALOHY_CAS%%:*}"
  cil_m="${ZALOHY_CAS##*:}"
  cil=$(( ${cil_h#0} * 3600 + ${cil_m#0} * 60 ))

  ted="$(date -u '+%s')"
  slot=$(( ted - ted % 86400 + cil ))
  if [ "$slot" -gt "$ted" ]; then
    slot=$(( slot - 86400 ))
  fi
  echo "$slot"
}

# Kdy proběhl poslední pokus — `mtime` souboru `stav.json`, 0 když chybí.
posledni_pokus() {
  stat -c '%Y' "$STAV" 2>/dev/null || echo 0
}

posledni_selhal() {
  grep -q '"uspech": false' "$STAV" 2>/dev/null
}

# Za jak dlouho zkusit neúspěšnou zálohu znovu.
#
# Dřív až v dalším slotu, tedy skoro za den. Jenže většina selhání je
# přechodná — databáze po rebootu ještě nenaběhla, síť chvíli nejela — a celý
# den by administrace kriticky hlásila něco, co se samo spravilo. Každých deset
# minut ale ne: nad plným diskem by se `pg_dump` jen točil a plnil log.
OPAKOVAT_PO_SEKUNDACH=3600

# Je čas zálohovat? Od posledního slotu žádný pokus, nebo poslední pokus selhal
# a od něj uplynula `OPAKOVAT_PO_SEKUNDACH`.
je_na_rade() {
  pokus="$(posledni_pokus)"
  if [ "$pokus" -lt "$(posledni_slot)" ]; then
    return 0
  fi
  if posledni_selhal && [ $(( $(date -u '+%s') - pokus )) -ge "$OPAKOVAT_PO_SEKUNDACH" ]; then
    return 0
  fi
  return 1
}

oznamit_dalsi() {
  if posledni_selhal; then
    log "další pokus nejdřív za $(( OPAKOVAT_PO_SEKUNDACH / 60 )) min"
    return
  fi
  cekat=$(( $(posledni_slot) + 86400 - $(date -u '+%s') ))
  log "další záloha za $(( cekat / 3600 )) h $(( (cekat % 3600) / 60 )) min"
}

case "${1:---smycka}" in
  --jednou)
    zalohovat
    ;;
  --smycka)
    log "zálohy zapnuté – denně v $ZALOHY_CAS UTC, držím $ZALOHY_DNU dní, ukládám do $ZALOHY_DIR"
    if ! je_na_rade; then
      oznamit_dalsi
    fi
    while true; do
      if je_na_rade; then
        # `|| true`: neúspěšná záloha nesmí shodit kontejner. Stav je zapsaný,
        # administrace to ukáže a za hodinu se to zkusí znovu.
        zalohovat || true
        oznamit_dalsi
      fi
      sleep "$KONTROLA_SEKUND"
    done
    ;;
  *)
    echo "Použití: $0 [--smycka|--jednou]" >&2
    exit 2
    ;;
esac
