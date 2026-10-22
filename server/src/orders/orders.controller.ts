import { Body, Controller, ForbiddenException, Get, HttpCode, Inject, Param, Patch, Post } from '@nestjs/common';
import type { AuthContext } from '../auth/auth-context';
import { CurrentAuth, Public, PublicFormRateLimited, RequestLang, Roles, type Lang } from '../common/decorators';
import { parseOrThrow } from '../common/zod';
import { APP_CONFIG, type AppConfig } from '../config';
import { orderIdSchema, orderSchema, orderStatusSchema } from './orders.schemas';
import { OrdersService } from './orders.service';

const CLOSED: Record<Lang, string> = {
  tr: 'Şu an online sipariş alınmıyor; ürünler hakkında bizimle iletişime geçebilirsiniz.',
  en: "We're not taking online orders yet; please get in touch about any product.",
};

@Controller()
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** Places a TEST order: no payment is taken and nothing ships. Refused in catalog mode (ORDERS_ENABLED=false). */
  @Public()
  @PublicFormRateLimited()
  @Post('orders')
  @HttpCode(201)
  place(@Body() body: unknown, @RequestLang() lang: Lang) {
    if (!this.config.ORDERS_ENABLED) throw new ForbiddenException({ message: CLOSED[lang] });
    return this.orders.place(parseOrThrow(orderSchema, body, lang), lang);
  }

  @Roles('ADMIN', 'EDITOR')
  @Get('admin/orders')
  list() {
    return this.orders.list();
  }

  @Roles('ADMIN', 'EDITOR')
  @Patch('admin/orders/:id')
  setStatus(@CurrentAuth() auth: AuthContext, @Param('id') id: string, @Body() body: unknown) {
    const { status } = parseOrThrow(orderStatusSchema, body);
    return this.orders.setStatus(auth.userId, parseOrThrow(orderIdSchema, id), status);
  }
}
