import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthContext } from './auth-context';
import { changePasswordSchema, loginSchema } from './auth.schemas';
import { AuthService, toPublicUser } from './auth.service';
import { AuthRateLimited, CurrentAuth, Public } from '../common/decorators';
import { parseOrThrow } from '../common/zod';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @AuthRateLimited()
  @Post('login')
  @HttpCode(200)
  async login(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const { email, password } = parseOrThrow(loginSchema, body);
    const { token, session, user } = await this.auth.login(email, password);
    res.cookie(this.auth.cookieName, token, this.auth.cookieOptions(session.expiresAt));
    return { user: toPublicUser(user), csrfToken: session.csrfToken };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@CurrentAuth() auth: AuthContext, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(auth.sessionId, auth.userId);
    res.clearCookie(this.auth.cookieName, this.auth.cookieOptions());
  }

  /** Current user plus the CSRF token, so a reloaded admin page can resume its session. */
  @Get('me')
  async me(@CurrentAuth() auth: AuthContext) {
    return { user: toPublicUser(await this.auth.getUser(auth.userId)), csrfToken: auth.csrfToken };
  }

  @AuthRateLimited()
  @Post('password')
  @HttpCode(200)
  async changePassword(
    @CurrentAuth() auth: AuthContext,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { currentPassword, newPassword } = parseOrThrow(changePasswordSchema, body);
    const { token, session } = await this.auth.changePassword(auth.userId, currentPassword, newPassword);
    res.cookie(this.auth.cookieName, token, this.auth.cookieOptions(session.expiresAt));
    return { csrfToken: session.csrfToken };
  }
}
