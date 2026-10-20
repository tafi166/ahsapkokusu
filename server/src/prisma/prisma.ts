import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { APP_CONFIG, type AppConfig } from '../config';

export { PrismaClient };
export const PRISMA = Symbol('PRISMA');

export function createPrismaClient(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export const prismaProvider = {
  provide: PRISMA,
  inject: [APP_CONFIG],
  useFactory: (config: AppConfig) => createPrismaClient(config.DATABASE_URL),
};

@Injectable()
export class PrismaLifecycle implements OnModuleDestroy {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
