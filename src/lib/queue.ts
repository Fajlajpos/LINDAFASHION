import PgBoss from 'pg-boss';

const connectionString = process.env.DATABASE_URL || 'postgresql://linda:lindapassword@localhost:5432/linda_fashion?schema=public';

let bossInstance: PgBoss | null = null;

export async function getQueueBoss(): Promise<PgBoss> {
  if (!bossInstance) {
    bossInstance = new PgBoss({
      connectionString,
      application_name: 'linda-fashion-queue',
    });

    bossInstance.on('error', (error) => console.error('❌ Fronta pg-boss chyba:', error));

    try {
      await bossInstance.start();
      console.log('⚡ pg-boss fronta úloh úspěšně spuštěna.');
    } catch (err) {
      console.warn('⚠️ pg-boss nebyl schopen se připojit k DB. Úlohy poběží v synchronním záložním režimu.');
    }
  }

  return bossInstance;
}

export async function publishJob(queueName: string, data: object): Promise<string | null> {
  try {
    const boss = await getQueueBoss();
    if (boss) {
      return await boss.send(queueName, data);
    }
  } catch (err) {
    console.error(`Chyba při odesílání úlohy do fronty [${queueName}]:`, err);
  }
  return null;
}
