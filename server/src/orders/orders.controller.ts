import { Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import type { AuthContext } from '../auth/auth-context';
import { CurrentAuth, Public, PublicFormRateLimited, Roles } from '../common/decorators';
import { parseOrThrow } from '../common/zod';
import { orderIdSchema, orderSchema, orderStatusSchema } from './orders.schemas';
import { OrdersService } from './orders.service';

@Controller()
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  /** Places a TEST order: no payment is taken and nothing ships. */
  @Public()
  @PublicFormRateLimited()
  @Post('orders')
  @HttpCode(201)
  place(@Body() body: unknown) {
    return this.orders.place(parseOrThrow(orderSchema, body));
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
