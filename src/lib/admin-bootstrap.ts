/**
 * Prvotní založení admin účtu z .env.
 *
 * Admini žijí v databázi jako User s rolí ADMIN – ne jako dvojice v .env
 * porovnávaná v čistém textu. Díky tomu je heslo vždycky bcrypt hashované
 * (sekce 10) a přidat druhý admin účet s omezenými právy (sekce 6.12) je
 * pak jen otázka dalšího řádku v tabulce.
 *
 * Bez aliasů @/ – volá to i worker, který se kompiluje mimo Next.js bundler.
 */
import { db } from './db';
import { hashPassword } from './hesla';

export async function zalozitAdminaPokudChybi(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const heslo = process.env.ADMIN_PASSWORD;

  if (!email || !heslo) {
    console.warn('⚠️ ADMIN_EMAIL/ADMIN_PASSWORD nejsou v .env – prvotní admin účet se nezaloží.');
    return;
  }

  const existuje = await db.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
  if (existuje) return;

  await db.user.upsert({
    where: { email },
    update: { role: 'ADMIN' },
    create: {
      email,
      passwordHash: await hashPassword(heslo),
      role: 'ADMIN',
      jmeno: 'Administrátorka',
    },
  });

  console.log(`✅ Založen prvotní admin účet: ${email}`);
}
