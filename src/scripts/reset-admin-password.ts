import { db } from '../lib/db';
import bcrypt from 'bcryptjs';

async function resetAdminPassword() {
  const email = process.argv[2] || process.env.ADMIN_EMAIL || 'admin@lindafashion.cz';
  const newPassword = process.argv[3] || 'novesilneheslo123';

  console.log(`🔒 Resetuji heslo pro admin účet: ${email}`);

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  const updated = await db.user.upsert({
    where: { email },
    update: { passwordHash: hashedPassword, role: 'ADMIN' },
    create: {
      email,
      passwordHash: hashedPassword,
      role: 'ADMIN',
      jmeno: 'Linda Administrátorka',
    },
  });

  console.log(`✅ Heslo pro admin účet ${updated.email} bylo úspěšně změněno na: "${newPassword}"`);
  process.exit(0);
}

resetAdminPassword().catch((err) => {
  console.error('❌ Chyba při resetu hesla admina:', err);
  process.exit(1);
});
