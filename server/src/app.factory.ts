import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { createAppModule } from './app.module';
import { IMAGE_TYPES } from './media/media.service';
import { serveStorefront } from './static-site';
import type { AppConfig } from './config';

export async function createApp(config: AppConfig, opts: { logger?: false } = {}): Promise<INestApplication> {
  const app = await NestFactory.create<NestExpressApplication>(createAppModule(config), {
    logger: opts.logger,
    bodyParser: false,
  });
  // The storefront reaches the API on the same origin (Vite's proxy in development,
  // the web server or STATIC_DIR in production), so CORS stays disabled.
  app.set('trust proxy', config.TRUST_PROXY);
  // The admin panel saves the whole product list at once.
  app.useBodyParser('json', { limit: '2mb' });
  // Image uploads arrive as raw bytes; the media service checks the actual format.
  app.useBodyParser('raw', { type: [...IMAGE_TYPES], limit: config.MEDIA_MAX_BYTES });
  app.use(helmet());
  app.use(cookieParser());
  if (config.STATIC_DIR) serveStorefront(app, config.STATIC_DIR);
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  return app;
}
