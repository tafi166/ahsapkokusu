import { Public } from '../common/decorators';
import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { PRISMA, type PrismaClient } from '../prisma/prisma';

@Public()
@Controller('health')
export class HealthController {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  @Get()
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({ message: 'Database unavailable' });
    }
    return { status: 'ok' };
  }
}
