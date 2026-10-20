// Applies committed migrations to the integration-test database (TEST_DATABASE_URL).
import 'dotenv/config';
import { spawnSync } from 'node:child_process';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test')) {
  console.error('TEST_DATABASE_URL must be set and point at a *_test database.');
  process.exit(1);
}
const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: url },
});
process.exit(result.status ?? 1);
