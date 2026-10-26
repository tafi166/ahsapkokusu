import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Put,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { z } from "zod";
import { CurrentAuth, Roles } from "../common/decorators";
import type { AuthContext } from "../auth/auth-context";
import { parseOrThrow } from "../common/zod";
import {
  estimateSchema,
  idSchema,
  quoteSchema,
  runSchema,
  uploadSchema,
} from "./schemas";
import { LaserService } from "./laser.service";
@Roles("ADMIN")
@Controller("admin/laser")
export class LaserController {
  constructor(private readonly service: LaserService) {}
  @Get("config")
  @Header("Cache-Control", "no-store")
  config() {
    return this.service.configs();
  }
  @Post("config/:kind")
  @Header("Cache-Control", "no-store")
  createConfig(
    @CurrentAuth() a: AuthContext,
    @Param("kind") kind: string,
    @Body() body: unknown,
  ) {
    return this.service.saveConfig(
      a.userId,
      parseOrThrow(z.enum(["machines", "materials", "presets"]), kind),
      body,
    );
  }
  @Put("config/:kind/:id")
  @Header("Cache-Control", "no-store")
  updateConfig(
    @CurrentAuth() a: AuthContext,
    @Param("kind") kind: string,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.service.saveConfig(
      a.userId,
      parseOrThrow(z.enum(["machines", "materials", "presets"]), kind),
      body,
      parseOrThrow(idSchema, id),
    );
  }
  @Post("designs")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Header("Cache-Control", "no-store")
  upload(@CurrentAuth() a: AuthContext, @Body() body: unknown) {
    return this.service.upload(a.userId, parseOrThrow(uploadSchema, body));
  }
  @Post("designs/:id/scale")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Header("Cache-Control", "no-store")
  scale(
    @CurrentAuth() a: AuthContext,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const v = parseOrThrow(
      z
        .object({ mmPerUnit: z.number().finite().positive().max(1000) })
        .strict(),
      body,
    );
    return this.service.scale(
      a.userId,
      parseOrThrow(idSchema, id),
      v.mmPerUnit,
    );
  }
  @Get("designs/:id")
  @Header("Cache-Control", "no-store")
  design(@Param("id") id: string) {
    return this.service.design(parseOrThrow(idSchema, id));
  }
  @Post("estimate")
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Header("Cache-Control", "no-store")
  estimate(@Body() body: unknown) {
    return this.service.estimate(parseOrThrow(estimateSchema, body));
  }
  @Post("quotes")
  @Header("Cache-Control", "no-store")
  save(@CurrentAuth() a: AuthContext, @Body() body: unknown) {
    return this.service.saveQuote(a.userId, parseOrThrow(quoteSchema, body));
  }
  @Get("quotes")
  @Header("Cache-Control", "no-store")
  quotes() {
    return this.service.quotes();
  }
  @Get("quotes/:id")
  @Header("Cache-Control", "no-store")
  quote(@Param("id") id: string) {
    return this.service.quote(parseOrThrow(idSchema, id));
  }
  @Get("runs")
  @Header("Cache-Control", "no-store")
  runs() {
    return this.service.runs();
  }
  @Post("runs")
  @Header("Cache-Control", "no-store")
  run(@CurrentAuth() a: AuthContext, @Body() body: unknown) {
    return this.service.recordRun(a.userId, parseOrThrow(runSchema, body));
  }
  @Get("lightburn")
  @Header("Cache-Control", "no-store")
  lightburn() {
    return {
      enabled: false,
      minimumVersion: "2.2",
      durationSource: "manual-preview",
      remoteMachineControl: false,
    };
  }
}
