/**
 * Změna hesla admin účtu.
 *
 *   npm run admin:reset-heslo -- <email> <nove-heslo>
 *
 * Bez argumentů si obojí vezme z `ADMIN_EMAIL` / `ADMIN_PASSWORD` v `.env` –
 * tedy z téhož zdroje, ze kterého zakládá prvotní účet
 * [admin-bootstrap.ts](../lib/admin-bootstrap.ts).
 *
 * Zástupné hodnoty tu schválně **nejsou**. Skript dřív bez argumentů sáhl po
 * `admin@lindafashion.cz` a hesle `novesilneheslo123`, takže omylem spuštěný
 * příkaz nastavil administraci veřejně známé heslo – a to heslo je v repozitáři
 * k přečtení. Chybějící vstup má skončit chybou, ne otevřít administraci.
 *
 * E-mail se normalizuje na malá písmena stejně jako v `admin-bootstrap.ts`.
 * Bez toho `npm run admin:reset-heslo -- Linda@…` založil **druhý** účet, na
 * který se pak nešlo přihlásit, protože přihlášení hledá adresu malými písmeny.
 */
import { db } from '../lib/db';
import bcrypt from 'bcryptjs';

async function resetAdminPassword() {
  const email = (process.argv[2] || process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const noveHeslo = process.argv[3] || process.env.ADMIN_PASSWORD || '';

  if (!email || !noveHeslo) {
    console.error(
      '❌ Chybí e-mail nebo heslo.\n' +
        '   npm run admin:reset-heslo -- <email> <nove-heslo>\n' +
        '   Nebo vyplň ADMIN_EMAIL a ADMIN_PASSWORD v .env a spusť bez argumentů.',
    );
    process.exit(1);
  }

  console.log(`🔒 Nastavuji heslo pro admin účet: ${email}`);

  const passwordHash = await bcrypt.hash(noveHeslo, 12);

  const ulozeny = await db.user.upsert({
    where: { email },
    update: { passwordHash, role: 'ADMIN' },
    create: {
      email,
      passwordHash,
      role: 'ADMIN',
      jmeno: 'Administrátorka',
    },
  });

  // Heslo se schválně nevypisuje – konzole i log CI ho jinak uchovají natrvalo.
  console.log(`✅ Heslo pro ${ulozeny.email} bylo změněno.`);
  process.exit(0);
}

resetAdminPassword().catch((err) => {
  console.error('❌ Chyba při resetu hesla admina:', err);
  process.exit(1);
});
