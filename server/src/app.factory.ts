import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { createAppModule } from './app.module';
import { IMAGE_TYPES } from './media/media.service';
import type { AppConfig } from './config';

export async function createApp(config: AppConfig, opts: { logger?: false } = {}): Promise<INestApplication> {
  const app = await NestFactory.create<NestExpressApplication>(createAppModule(config), {
    logger: opts.logger,
    bodyParser: false,
  });
  // The storefront reaches the API through a same-origin proxy (Vite in development,
  // the web server in production), so CORS stays disabled.
  app.set('trust proxy', 'loopback');
  // The admin panel saves the whole product list at once.
  app.useBodyParser('json', { limit: '2mb' });
  // Image uploads arrive as raw bytes; the media service checks the actual format.
  app.useBodyParser('raw', { type: [...IMAGE_TYPES], limit: config.MEDIA_MAX_BYTES });
  app.use(helmet());
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  return app;
}
