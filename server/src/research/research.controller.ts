import { Body, Controller, Get, Inject, NotFoundException, Param, Post, Put, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthContext } from '../auth/auth-context';
import { CurrentAuth, Roles } from '../common/decorators';
import { APP_CONFIG, type AppConfig } from '../config';
import { parseOrThrow } from '../common/zod';
import { collectionInput, collectionUpdate, itemInput, itemUpdate, listQuery, researchId } from './research.schemas';
import { ResearchService } from './research.service';

@Roles('ADMIN')
@Controller('admin/research')
export class ResearchController {
  constructor(private readonly service: ResearchService, @Inject(APP_CONFIG) private readonly config: AppConfig) {}
  private enabled() { if (!this.config.RESEARCH_ENABLED) throw new NotFoundException(); }

  @Get('status')
  status(@Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    return { enabled: this.config.RESEARCH_ENABLED, etsyEnabled: false, aiEnabled: false };
  }
  @Get('items')
  list(@Query() query: unknown, @Res({ passthrough: true }) res: Response) {
    this.enabled(); res.setHeader('Cache-Control', 'no-store');
    return this.service.list(parseOrThrow(listQuery, query));
  }
  @Post('items')
  create(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    this.enabled(); return this.service.saveItem(auth.userId, parseOrThrow(itemInput, body));
  }
  @Put('items/:id')
  update(@CurrentAuth() auth: AuthContext, @Param('id') id: string, @Body() body: unknown) {
    this.enabled(); const { version, ...data } = parseOrThrow(itemUpdate, body);
    return this.service.saveItem(auth.userId, data, parseOrThrow(researchId, id), version);
  }
  @Get('collections')
  collections(@Res({ passthrough: true }) res: Response) {
    this.enabled(); res.setHeader('Cache-Control', 'no-store'); return this.service.collections();
  }
  @Post('collections')
  createCollection(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    this.enabled(); return this.service.saveCollection(auth.userId, parseOrThrow(collectionInput, body));
  }
  @Put('collections/:id')
  updateCollection(@CurrentAuth() auth: AuthContext, @Param('id') id: string, @Body() body: unknown) {
    this.enabled(); const { version, ...data } = parseOrThrow(collectionUpdate, body);
    return this.service.saveCollection(auth.userId, data, parseOrThrow(researchId, id), version);
  }
}
