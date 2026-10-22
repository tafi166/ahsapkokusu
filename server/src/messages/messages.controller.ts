import { Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import type { AuthContext } from '../auth/auth-context';
import { CurrentAuth, Public, PublicFormRateLimited, RequestLang, Roles, type Lang } from '../common/decorators';
import { parseOrThrow } from '../common/zod';
import { messageIdSchema, messageSchema, messageStatusSchema } from './messages.schemas';
import { MessagesService } from './messages.service';

@Controller()
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  /** Anonymous message from the contact or custom-design form. */
  @Public()
  @PublicFormRateLimited()
  @Post('messages')
  @HttpCode(204)
  async create(@Body() body: unknown, @RequestLang() lang: Lang) {
    await this.messages.create(parseOrThrow(messageSchema, body, lang), lang);
  }

  @Roles('ADMIN', 'EDITOR')
  @Get('admin/messages')
  list() {
    return this.messages.list();
  }

  @Roles('ADMIN', 'EDITOR')
  @Patch('admin/messages/:id')
  setStatus(@CurrentAuth() auth: AuthContext, @Param('id') id: string, @Body() body: unknown) {
    const { status } = parseOrThrow(messageStatusSchema, body);
    return this.messages.setStatus(auth.userId, parseOrThrow(messageIdSchema, id), status);
  }
}
