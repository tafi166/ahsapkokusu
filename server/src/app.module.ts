import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuditService } from './audit/audit.service';
import { AuthController } from './auth/auth.controller';
import { AuthGuard } from './auth/auth.guard';
import { AuthService } from './auth/auth.service';
import { CatalogController } from './catalog/catalog.controller';
import { CatalogService } from './catalog/catalog.service';
import { AUTH_RATE_LIMITED } from './common/decorators';
import { APP_CONFIG, type AppConfig } from './config';
import { HealthController } from './health/health.controller';
import { PrismaLifecycle, prismaProvider } from './prisma/prisma';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';

export function createAppModule(config: AppConfig) {
  @Module({
    imports: [
      ThrottlerModule.forRoot([
        { name: 'default', ttl: 60_000, limit: 300 },
        {
          name: 'auth',
          ttl: 60_000,
          limit: config.AUTH_RATE_LIMIT_PER_MIN,
          skipIf: (ctx) => !Reflect.getMetadata(AUTH_RATE_LIMITED, ctx.getHandler()),
        },
      ]),
    ],
    controllers: [HealthController, CatalogController, AuthController, UsersController],
    providers: [
      { provide: APP_CONFIG, useValue: config },
      prismaProvider,
      PrismaLifecycle,
      AuditService,
      AuthService,
      CatalogService,
      UsersService,
      // Rate limiting runs first so rejected credentials still count toward the limit.
      { provide: APP_GUARD, useClass: ThrottlerGuard },
      { provide: APP_GUARD, useClass: AuthGuard },
    ],
  })
  class AppModule {}
  return AppModule;
}
