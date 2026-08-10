/**
 * Spustí web i worker jedním příkazem.
 *
 * Proč to existuje: zpracování fotek běží schválně mimo web (Sharp by jinak
 * konkuroval zákaznicím, které si prohlížejí katalog). Ve vývoji to ale
 * znamenalo dva terminály – a když se na ten druhý zapomnělo, fotka se
 * v pořádku nahrála, zůstala viset ve frontě a administrace u ní donekonečna
 * točila kolečko. Vypadalo to jako rozbitý upload, přestože bylo všechno
 * uložené správně a čekalo to jen na workera.
 *
 * Kdo chce jen web (a worker si pustit zvlášť), má `npm run dev:web`.
 *
 * Bez závislosti na `concurrently` – je to pár řádků a přidávat kvůli tomu
 * balíček do projektu, který se staví v Dockeru přes `npm install`, nemá cenu.
 */
import { spawn } from 'node:child_process';

const PROCESY = [
  { nazev: 'web   ', skript: 'dev:web', barva: '\x1b[36m' },
  { nazev: 'worker', skript: 'worker', barva: '\x1b[35m' },
];

const RESET = '\x1b[0m';
const SEDA = '\x1b[90m';

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

for (const { nazev, skript, barva } of PROCESY) {
  const dite = spawn('npm', ['run', skript], {
    // `npm` je na Windows .cmd, bez shellu ho spawn nenajde.
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  dite.stdout.on('data', (data) => prefixovat(nazev, barva, process.stdout, data));
  dite.stderr.on('data', (data) => prefixovat(nazev, barva, process.stderr, data));

  dite.on('exit', (kod, signal) => {
    if (ukoncujeme) return;

    // Když jeden spadne, druhý nemá smysl držet – jinak by zůstal běžet web
    // bez workera, což je přesně ten stav, kterému se tenhle skript vyhýbá.
    process.stderr.write(
      `\n${barva}${nazev}${RESET} ${SEDA}│${RESET} skončil (${signal ?? `kód ${kod}`}), ukončuji i zbytek.\n`
    );
    ukoncit(kod ?? 1);
  });

  deti.push(dite);
}

process.on('SIGINT', () => ukoncit(0));
process.on('SIGTERM', () => ukoncit(0));
