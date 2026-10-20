import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { createApp } from './app.factory';
import { loadConfig } from './config';

async function bootstrap() {
  const config = loadConfig();
  const app = await createApp(config);
  await app.listen(config.PORT);
  new Logger('Bootstrap').log(`API listening on http://localhost:${config.PORT}/api`);
}

void bootstrap();
