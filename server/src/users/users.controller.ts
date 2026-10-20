import { Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import type { AuthContext } from '../auth/auth-context';
import { CurrentAuth, Roles } from '../common/decorators';
import { parseOrThrow } from '../common/zod';
import { createUserSchema, resetPasswordSchema, updateUserSchema, userIdSchema } from './users.schemas';
import { UsersService } from './users.service';

@Roles('ADMIN')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list() {
    return this.users.list();
  }

  @Post()
  create(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    return this.users.create(auth.userId, parseOrThrow(createUserSchema, body));
  }

  @Patch(':id')
  update(@CurrentAuth() auth: AuthContext, @Param('id') id: string, @Body() body: unknown) {
    return this.users.update(auth.userId, parseOrThrow(userIdSchema, id), parseOrThrow(updateUserSchema, body));
  }

  @Post(':id/password')
  @HttpCode(204)
  async resetPassword(@CurrentAuth() auth: AuthContext, @Param('id') id: string, @Body() body: unknown) {
    const { password } = parseOrThrow(resetPasswordSchema, body);
    await this.users.resetPassword(auth.userId, parseOrThrow(userIdSchema, id), password);
  }
}
