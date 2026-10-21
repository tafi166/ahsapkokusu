import { Body, Controller, Get, HttpCode, Param, Patch, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { AuthContext } from '../auth/auth-context';
import { CurrentAuth, Public, PublicFormRateLimited, Roles, RequestLang, type Lang } from '../common/decorators';
import { parseOrThrow } from '../common/zod';
import { quoteConfig } from './quote-config';
import { quoteFieldsSchema, quoteIdSchema, quoteStatusSchema } from './quotes.schemas';
import { QuotesService, type UploadedSvg } from './quotes.service';

@Controller()
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  /** Anonymous quote request: multipart with one `file` (SVG) and the text fields. */
  @Public()
  @PublicFormRateLimited()
  @Post('quotes')
  @HttpCode(201)
  @UseInterceptors(
    // No `dest`/`storage`: multer keeps the file in memory, so nothing touches disk before it is validated.
    FileInterceptor('file', {
      // Hard limits before anything is buffered beyond them; oversize → 413.
      limits: { fileSize: quoteConfig.maxFileBytes, files: 1, fields: 10, fieldSize: 4000, parts: 12 },
    }),
  )
  create(@UploadedFile() file: UploadedSvg | undefined, @Body() body: unknown, @RequestLang() lang: Lang) {
    return this.quotes.create(file, parseOrThrow(quoteFieldsSchema, body, lang), lang);
  }

  @Roles('ADMIN', 'EDITOR')
  @Get('admin/quotes')
  list() {
    return this.quotes.list();
  }

  @Roles('ADMIN', 'EDITOR')
  @Get('admin/quotes/:id')
  get(@Param('id') id: string) {
    return this.quotes.summary(parseOrThrow(quoteIdSchema, id));
  }

  @Roles('ADMIN', 'EDITOR')
  @Patch('admin/quotes/:id')
  setStatus(@CurrentAuth() auth: AuthContext, @Param('id') id: string, @Body() body: unknown) {
    const { status } = parseOrThrow(quoteStatusSchema, body);
    return this.quotes.setStatus(auth.userId, parseOrThrow(quoteIdSchema, id), status);
  }

  /** Staff download. Sent as an attachment under a sandboxing CSP, so even opened directly it can't run script. */
  @Roles('ADMIN', 'EDITOR')
  @Get('admin/quotes/:id/file')
  async download(@Param('id') id: string, @Res() res: Response) {
    const quote = await this.quotes.get(parseOrThrow(quoteIdSchema, id));
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Content-Disposition', `attachment; filename="${quote.reference}.svg"`);
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(this.quotes.filePath(quote.fileId), { dotfiles: 'deny' }, (err) => {
      if (err && !res.headersSent) res.status(404).end();
    });
  }
}
