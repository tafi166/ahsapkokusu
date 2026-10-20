import { Module } from '@nestjs/common';
import { CatalogController } from './catalog/catalog.controller';
import { CatalogService } from './catalog/catalog.service';
import { APP_CONFIG, type AppConfig } from './config';
import { HealthController } from './health/health.controller';
import { PrismaLifecycle, prismaProvider } from './prisma/prisma';

export function createAppModule(config: AppConfig) {
  @Module({
    controllers: [HealthController, CatalogController],
    providers: [{ provide: APP_CONFIG, useValue: config }, prismaProvider, PrismaLifecycle, CatalogService],
  })
  class AppModule {}
  return AppModule;
}
