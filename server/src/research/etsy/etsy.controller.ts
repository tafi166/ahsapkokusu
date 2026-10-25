import { Body, Controller, Get, Param, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { z } from "zod";
import { CurrentAuth, Roles } from "../../common/decorators";
import type { AuthContext } from "../../auth/auth-context";
import { parseOrThrow } from "../../common/zod";
import { EtsyService, previewInput, importInput } from "./etsy.service";
@Roles("ADMIN")
@Controller("admin/research/images/etsy")
export class EtsyController {
  constructor(private readonly etsy: EtsyService) {}
  @Get("status")
  status(@Res({ passthrough: true }) res: Response) {
    res.setHeader("Cache-Control", "no-store");
    return this.etsy.status();
  }
  @Post("preview")
  preview(
    @CurrentAuth() auth: AuthContext,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader("Cache-Control", "no-store");
    const input = parseOrThrow(previewInput, body);
    return this.etsy.preview(auth.userId, input.url);
  }
  @Get("previews/:ticket/:imageId")
  async image(
    @CurrentAuth() auth: AuthContext,
    @Param("ticket") ticket: string,
    @Param("imageId") imageId: string,
    @Res() res: Response,
  ) {
    const image = await this.etsy.thumbnail(
      auth.userId,
      parseOrThrow(z.string().regex(/^[a-f0-9]{48}$/), ticket),
      parseOrThrow(z.string().regex(/^[1-9]\d{0,15}$/), imageId),
    );
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", image.contentType);
    res.send(image.bytes);
  }
  @Post("import")
  import(
    @CurrentAuth() auth: AuthContext,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader("Cache-Control", "no-store");
    const input = parseOrThrow(importInput, body);
    return this.etsy.import(auth.userId, input.ticket, input.imageIds);
  }
}
