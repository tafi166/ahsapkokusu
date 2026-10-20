// No-Docker development database: runs a real PostgreSQL server from user space via
// embedded-postgres. Data lives in server/.local-postgres (gitignored). Stop with Ctrl+C.
import 'dotenv/config';
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
import path from 'node:path';

const port = Number(process.env.LOCAL_PG_PORT ?? 5433);
const user = process.env.LOCAL_PG_USER;
const password = process.env.LOCAL_PG_PASSWORD;
if (!user || !password) {
  console.error('Set LOCAL_PG_USER and LOCAL_PG_PASSWORD in server/.env (see .env.example).');
  process.exit(1);
}

const databaseDir = path.resolve('.local-postgres');
const fresh = !existsSync(path.join(databaseDir, 'PG_VERSION'));
const pg = new EmbeddedPostgres({ databaseDir, user, password, port, persistent: true });

if (fresh) await pg.initialise();
await pg.start();
for (const db of ['parametrika', 'parametrika_test']) {
  try {
    await pg.createDatabase(db);
  } catch (e) {
    if (!String(e?.message ?? e).includes('already exists')) throw e;
  }
}
console.log(`PostgreSQL on localhost:${port} (user ${user}); databases: parametrika, parametrika_test`);

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
setInterval(() => {}, 1 << 30);
