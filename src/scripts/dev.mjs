/**
 * Spustí celé vývojové prostředí jedním příkazem: databázi, web a worker.
 *
 * Proč to existuje: každý z těch tří kusů se dá zapomenout spustit a pokaždé
 * to vypadá jako jiná chyba.
 *   • bez databáze spadne worker na `Can't reach database server`
 *   • bez workera se fotka v pořádku nahraje, zůstane viset ve frontě
 *     a administrace u ní točí kolečko – vypadá to jako rozbitý upload
 *   • dva spuštěné weby nad jednou `.next` si přepíšou zkompilované CSS
 *     a stránce se rozsypou fonty
 *
 * Kdo chce jednotlivé kusy zvlášť, má `npm run dev:web` a `npm run worker`.
 *
 * Bez závislosti na `concurrently` – je to pár řádků a přidávat kvůli tomu
 * balíček do projektu, který se staví v Dockeru přes `npm install`, nemá cenu.
 */
import { spawn, spawnSync } from 'node:child_process';
import { connect } from 'node:net';
import { readFileSync, existsSync } from 'node:fs';

const RESET = '\x1b[0m';
const SEDA = '\x1b[90m';
const ZLUTA = '\x1b[33m';

const PROCESY = [
  { nazev: 'web   ', prikaz: 'npm run dev:web', barva: '\x1b[36m' },
  { nazev: 'worker', prikaz: 'npm run worker', barva: '\x1b[35m' },
];

const COMPOSE = 'docker compose -f docker-compose.dev.yml';

/* ------------------------------------------------------------------ */
/* Databáze                                                            */
/* ------------------------------------------------------------------ */

/** Adresa databáze z prostředí, jinak z `.env`. Vitest ani ts-node `.env` nečtou. */
function adresaDatabaze() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (!existsSync('.env')) return null;

  for (const radek of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const shoda = radek.trim().match(/^DATABASE_URL\s*=\s*(.+)$/);
    if (shoda) return shoda[1].trim().replace(/^(['"])(.*)\1$/, '$2');
  }

  return null;
}

/** Odpovídá na daném portu někdo? Levnější a spolehlivější než parsovat docker. */
function portOdpovida(host, port, casMs = 1000) {
  return new Promise((vyres) => {
    const spojeni = connect({ host, port });
    const hotovo = (vysledek) => {
      spojeni.destroy();
      vyres(vysledek);
    };

    spojeni.setTimeout(casMs);
    spojeni.once('connect', () => hotovo(true));
    spojeni.once('timeout', () => hotovo(false));
    spojeni.once('error', () => hotovo(false));
  });
}

const cekej = (ms) => new Promise((vyres) => setTimeout(vyres, ms));

function napis(text) {
  process.stdout.write(`${SEDA}start ${RESET}${SEDA}│${RESET} ${text}\n`);
}

/** Odpovídá Docker démon? Když neběží, `docker info` skončí nenulovým kódem. */
function dockerBezi() {
  const vysledek = spawnSync('docker info', { shell: true, stdio: 'ignore', timeout: 20_000 });
  return vysledek.status === 0;
}

/** Kde bývá Docker Desktop na Windows. */
const CESTY_DOCKER = [
  `${process.env.ProgramFiles ?? 'C:\\Program Files'}\\Docker\\Docker\\Docker Desktop.exe`,
  `${process.env.LOCALAPPDATA ?? ''}\\Docker\\Docker Desktop.exe`,
];

/**
 * Nahodí Docker Desktop, když neběží.
 *
 * Po restartu počítače se Docker sám nespustí, takže první `npm run dev` toho
 * dne skončil na nedostupné databázi – a bylo to k nerozeznání od skutečné
 * chyby. Startuje pomalu (klidně minutu), proto se průběh vypisuje; mlčící
 * terminál by vypadal, že se zaseklo.
 */
async function zajistitDocker() {
  if (dockerBezi()) return true;

  let spusteno = false;

  if (process.platform === 'win32') {
    for (const cesta of CESTY_DOCKER) {
      if (!existsSync(cesta)) continue;

      // `detached` + `unref`: Docker Desktop musí přežít konec tohohle skriptu.
      spawn(`"${cesta}"`, { shell: true, detached: true, stdio: 'ignore' }).unref();
      spusteno = true;
      break;
    }
  } else if (process.platform === 'darwin') {
    spusteno = spawnSync('open -a Docker', { shell: true, stdio: 'ignore' }).status === 0;
  }

  if (!spusteno) {
    napis(`${ZLUTA}Docker neběží a nepodařilo se ho spustit – spusť ho prosím ručně.${RESET}`);
    return false;
  }

  napis('Docker neběží, spouštím Docker Desktop…');
  napis(`${SEDA}(po restartu počítače to trvá i minutu, vydrž)${RESET}`);

  for (let pokus = 0; pokus < 24; pokus++) {
    await cekej(5000);
    if (dockerBezi()) {
      napis('Docker běží.');
      return true;
    }
  }

  napis(`${ZLUTA}Docker nenaběhl do dvou minut – zkus to prosím znovu.${RESET}`);
  return false;
}

/**
 * Zajistí běžící databázi.
 *
 * Vrací `true`, když je dostupná. Když ne, **nebrání spuštění zbytku** – web
 * se aspoň nahodí a ukáže chybovou stránku, což je pro hledání příčiny víc
 * než mrtvý terminál.
 */
async function zajistitDatabazi() {
  const adresa = adresaDatabaze();
  if (!adresa) {
    napis(`${ZLUTA}DATABASE_URL není nastavená – přeskakuji kontrolu databáze.${RESET}`);
    return false;
  }

  let host = 'localhost';
  let port = 5432;
  try {
    const url = new URL(adresa);
    host = url.hostname || host;
    port = Number(url.port) || port;
  } catch {
    napis(`${ZLUTA}DATABASE_URL nejde přečíst – přeskakuji kontrolu databáze.${RESET}`);
    return false;
  }

  if (await portOdpovida(host, port)) return true;

  napis(`databáze na ${host}:${port} neodpovídá.`);

  // Kontejner bez běžícího Dockeru nespustíme, tak ho nejdřív nahodíme.
  if (!(await zajistitDocker())) {
    process.stderr.write(
      `\n${ZLUTA}${'═'.repeat(60)}${RESET}\n` +
        `${ZLUTA}  Databáze není dostupná, protože neběží Docker.${RESET}\n` +
        `${SEDA}  Web se spustí, ale worker ne – fotky se nezpracují.\n` +
        `  Až Docker naběhne: ${COMPOSE} up -d && npm run worker${RESET}\n` +
        `${ZLUTA}${'═'.repeat(60)}${RESET}\n\n`
    );
    return false;
  }

  napis('spouštím kontejner s databází…');

  const compose = spawnSync(`${COMPOSE} up -d`, { shell: true, stdio: 'pipe' });

  if (compose.status !== 0) {
    const vypis = String(compose.stderr ?? '');

    /*
     * Docker chybí, nebo neběží jeho démon. Formulací je několik podle
     * systému: Windows hlásí „is not recognized", Linux „command not found",
     * a když je nainstalovaný, ale vypnutý, mluví o „docker API" či „daemon".
     */
    const chybiDocker = /docker api|daemon|pipe|not recognized|not found|cannot find/i.test(vypis);

    process.stderr.write(
      `\n${ZLUTA}${'═'.repeat(60)}${RESET}\n` +
        `${ZLUTA}  Databázi se nepodařilo spustit.${RESET}\n` +
        (chybiDocker
          ? `${SEDA}  Vypadá to, že neběží Docker Desktop – spusť ho a zkus znovu.${RESET}\n`
          : `${SEDA}  ${vypis.trim().split('\n').slice(-2).join('\n  ')}${RESET}\n`) +
        `${SEDA}  Ručně: ${COMPOSE} up -d${RESET}\n` +
        `${ZLUTA}${'═'.repeat(60)}${RESET}\n\n`
    );
    return false;
  }

  // Kontejner sice běží, ale Postgres uvnitř ještě chvíli startuje.
  for (let pokus = 0; pokus < 30; pokus++) {
    if (await portOdpovida(host, port)) {
      napis('databáze je připravená.');
      return true;
    }
    await cekej(1000);
  }

  napis(`${ZLUTA}databáze nenaběhla do 30 s – worker si bude stěžovat.${RESET}`);
  return false;
}

/* ------------------------------------------------------------------ */
/* Procesy                                                             */
/* ------------------------------------------------------------------ */

const deti = [];
let ukoncujeme = false;

/** Předsadí každému řádku jméno procesu, ať je poznat, kdo mluví. */
function prefixovat(nazev, barva, proud, data) {
  const radky = data.toString().split(/\r?\n/);
  if (radky[radky.length - 1] === '') radky.pop();

  for (const radek of radky) {
    proud.write(`${barva}${nazev}${RESET} ${SEDA}│${RESET} ${radek}\n`);
  }
}

function ukoncit(kod) {
  if (ukoncujeme) return;
  ukoncujeme = true;

  for (const dite of deti) {
    if (dite.exitCode !== null || dite.signalCode !== null) continue;

    /*
     * Na Windows spouštíme přes shell, takže `kill()` sestřelí jen ten shell
     * a `next dev` s workerem by běžely dál a držely porty. `taskkill /T`
     * ukončí celý strom procesů.
     */
    if (process.platform === 'win32') {
      spawn('taskkill', ['/PID', String(dite.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      dite.kill('SIGTERM');
    }
  }

  process.exitCode = kod;
}

function spustitProcesy() {
  for (const { nazev, prikaz, barva } of PROCESY) {
    /*
     * Celý příkaz jde jako jeden řetězec, ne jako pole argumentů. Node od
     * verze 20 varuje (DEP0190), když se argumenty předávají spolu se
     * `shell: true` – nejsou totiž escapované. Řetězce jsou tu pevně dané,
     * takže není co escapovat, a varování z výpisu zmizí.
     */
    const dite = spawn(prikaz, {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    dite.stdout.on('data', (data) => prefixovat(nazev, barva, process.stdout, data));
    dite.stderr.on('data', (data) => prefixovat(nazev, barva, process.stderr, data));

    dite.on('exit', (kod, signal) => {
      if (ukoncujeme) return;

      /*
       * Pád jednoho procesu **neshazuje** druhý.
       *
       * Původně to tak bylo, jenže nejčastější příčina pádu workera je
       * nedostupná databáze – a tehdy zhasl i web, takže z celého vývojového
       * prostředí zbyla jen stěna Prisma stack trace a nešlo se ani podívat
       * na chybovou stránku.
       */
      const duvod = signal ?? `kód ${kod}`;

      process.stderr.write(
        `\n${barva}${'═'.repeat(60)}${RESET}\n` +
          `${barva}  Proces „${nazev.trim()}" skončil (${duvod}).${RESET}\n` +
          (nazev.trim() === 'worker'
            ? `${SEDA}  Nahrané fotky se do jeho spuštění nezpracují – zůstanou\n` +
              `  ve frontě a administrace na ně upozorní.\n` +
              `  Až bude databáze v pořádku: npm run worker${RESET}\n`
            : `${SEDA}  Zbylé procesy běží dál. Ukonči je Ctrl+C.${RESET}\n`) +
          `${barva}${'═'.repeat(60)}${RESET}\n\n`
      );

      if (deti.every((d) => d.exitCode !== null || d.signalCode !== null)) {
        process.exitCode = kod ?? 1;
      }
    });

    deti.push(dite);
  }
}

process.on('SIGINT', () => ukoncit(0));
process.on('SIGTERM', () => ukoncit(0));

await zajistitDatabazi();
spustitProcesy();
