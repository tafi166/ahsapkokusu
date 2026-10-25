import { ProductImagesService, attachImagesInput, catalogProductId } from './product-images.service';
import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import { z } from "zod";
import type { Response } from "express";
import { APP_CONFIG, type AppConfig } from "../../config";
import { CurrentAuth, Roles } from "../../common/decorators";
import type { AuthContext } from "../../auth/auth-context";
import { parseOrThrow } from "../../common/zod";
import {
  batchInput,
  exportInput,
  idSchema,
  inspectEtsyUrl,
  inspectInput,
} from "./schemas";
import { ResearchImagesService } from "./images.service";

@Roles("ADMIN")
@Controller("admin/research/images")
export class ResearchImagesController {
  constructor(
    private readonly images: ResearchImagesService,
    private readonly productImages: ProductImagesService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}
  private enabled() {
    if (!this.config.RESEARCH_ENABLED) throw new NotFoundException();
  }
  @Post("inspect")
  inspect(@Body() body: unknown) {
    this.enabled();
    return inspectEtsyUrl(parseOrThrow(inspectInput, body).url);
  }
  @Get("batches")
  batches(@Res({ passthrough: true }) res: Response) {
    this.enabled();
    res.setHeader("Cache-Control", "no-store");
    return this.images.batches();
  }
  @Post("batches")
  create(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    this.enabled();
    return this.images.createBatch(auth.userId, parseOrThrow(batchInput, body));
  }
  @Patch("batches/:id/revoke")
  revoke(@CurrentAuth() auth: AuthContext, @Param("id") id: string) {
    this.enabled();
    return this.images.revoke(auth.userId, parseOrThrow(idSchema, id));
  }
  @Post("batches/:id/upload")
  upload(
    @CurrentAuth() auth: AuthContext,
    @Param("id") id: string,
    @Headers("content-type") type: string | undefined,
    @Query() query: unknown,
    @Body() body: unknown,
  ) {
    this.enabled();
    const meta = parseOrThrow(
      z
        .object({
          productName: z.string().trim().min(1).max(160),
          fileName: z.string().trim().min(1).max(200),
        })
        .strict(),
      query,
    );
    return this.images.upload(
      auth.userId,
      parseOrThrow(idSchema, id),
      meta.productName,
      meta.fileName,
      type,
      body,
    );
  }
  @Get("files/:id")
  async image(@Param("id") id: string, @Res() res: Response) {
    this.enabled();
    const image = await this.images.image(parseOrThrow(idSchema, id));
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", image.contentType);
    res.setHeader("Content-Disposition", "inline");
    res.sendFile(image.file, { dotfiles: "deny" }, (err) => {
      if (err && !res.headersSent) res.status(404).end();
    });
  }
  @Get("exports")
  exports(@Res({ passthrough: true }) res: Response) {
    this.enabled();
    res.setHeader("Cache-Control", "no-store");
    return this.images.exports();
  }
  @Post("exports")
  export(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    this.enabled();
    return this.images.createExport(
      auth.userId,
      parseOrThrow(exportInput, body).imageIds,
    );
  }
  @Patch("exports/:id/cancel")
  cancel(@CurrentAuth() auth: AuthContext, @Param("id") id: string) {
    this.enabled();
    return this.images.cancel(auth.userId, parseOrThrow(idSchema, id));
  }
  @Get("exports/:id/download")
  async download(
    @CurrentAuth() auth: AuthContext,
    @Param("id") raw: string,
    @Res() res: Response,
  ) {
    this.enabled();
    const id = parseOrThrow(idSchema, raw),
      file = await this.images.download(auth.userId, id);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="ahsap-kokusu-${id}.zip"`,
    );
    res.sendFile(file, { dotfiles: "deny" }, (err) => {
      if (err && !res.headersSent) res.status(404).end();
    });
  }
  @Get('products/:id/state')
  productState(@Param('id') id:string,@Res({passthrough:true}) res:Response){
    this.enabled();res.setHeader('Cache-Control','no-store');return this.productImages.state(parseOrThrow(catalogProductId,id));
  }
  @Post('products/:id/attach')
  attach(@CurrentAuth() auth:AuthContext,@Param('id') id:string,@Body() body:unknown){
    this.enabled();return this.productImages.attach(auth.userId,parseOrThrow(catalogProductId,id),parseOrThrow(attachImagesInput,body));
  }

}
