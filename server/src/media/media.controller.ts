import { Body, Controller, Get, Headers, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthContext } from '../auth/auth-context';
import { CurrentAuth, Public, Roles } from '../common/decorators';
import { MediaService } from './media.service';

@Controller()
export class MediaController {
  constructor(private readonly media: MediaService) {}

  /** Raw image body (Content-Type image/jpeg, image/png or image/webp). */
  @Roles('ADMIN', 'EDITOR')
  @Post('admin/media')
  upload(@CurrentAuth() auth: AuthContext, @Headers('content-type') type: string | undefined, @Body() body: unknown) {
    return this.media.upload(auth.userId, type, body);
  }

  @Public()
  @Get('media/:file')
  async serve(@Param('file') fileName: string, @Res() res: Response) {
    const { file, contentType } = await this.media.locate(fileName);
    res.setHeader('Content-Type', contentType);
    // Files never change under a given name.
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(file, { dotfiles: 'deny' }, (err) => {
      if (err && !res.headersSent) res.status(404).end();
    });
  }
}
