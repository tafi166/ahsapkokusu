import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { z } from "zod";
import { AuditService } from "../audit/audit.service";
import { PRISMA, type PrismaClient } from "../prisma/prisma";
import { Prisma } from "../generated/prisma/client";
import { parseOrThrow } from "../common/zod";
import {
  estimateSchema,
  machineSchema,
  materialSchema,
  presetSchema,
  quoteSchema,
  runSchema,
  uploadSchema,
} from "./schemas";
import { ingest } from "./ingestion";
import { bounds, ENGINE_VERSION } from "./geometry";
import { estimateTime } from "./time";
import { estimateCost } from "./pricing";
import type {
  ConfigRow,
  Geometry,
  Machine,
  Material,
  Preset,
  Snapshot,
} from "../../../src/pages/admin/laser/types";
const json = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
export type ConfigKind = "machines" | "materials" | "presets";
@Injectable()
export class LaserService {
  constructor(
    @Inject(PRISMA) private readonly db: PrismaClient,
    private readonly audit: AuditService,
  ) {}
  async configs() {
    const [machines, materials, presets] = await this.db.$transaction([
      this.db.laserMachineProfile.findMany({ orderBy: { createdAt: "desc" } }),
      this.db.laserMaterial.findMany({ orderBy: { createdAt: "desc" } }),
      this.db.laserCutPreset.findMany({ orderBy: { createdAt: "desc" } }),
    ]);
    return { machines, materials, presets };
  }
  async saveConfig(
    actor: string,
    kind: ConfigKind,
    body: unknown,
    id?: string,
  ) {
    const wrapper = parseOrThrow(
      z
        .object({
          data: z.unknown(),
          version: z.number().int().positive().optional(),
        })
        .strict(),
      body,
    );
    if (id && !wrapper.version)
      throw new BadRequestException("Güncelleme sürümü gerekli.");
    return this.db.$transaction(async (tx) => {
      let row: { id: string };
      const where = { id, version: wrapper.version };
      const update = { version: { increment: 1 } };
      if (kind === "machines") {
        const data = parseOrThrow(machineSchema, wrapper.data);
        if (id) {
          if (
            !(
              await tx.laserMachineProfile.updateMany({
                where,
                data: { data: json(data), ...update },
              })
            ).count
          )
            throw new ConflictException("Makine değişti; listeyi yenileyin.");
          row = await tx.laserMachineProfile.findUniqueOrThrow({
            where: { id },
          });
        } else
          row = await tx.laserMachineProfile.create({
            data: { data: json(data), createdById: actor },
          });
      } else if (kind === "materials") {
        const data = parseOrThrow(materialSchema, wrapper.data);
        if (id) {
          if (
            !(
              await tx.laserMaterial.updateMany({
                where,
                data: { data: json(data), ...update },
              })
            ).count
          )
            throw new ConflictException("Malzeme değişti; listeyi yenileyin.");
          row = await tx.laserMaterial.findUniqueOrThrow({ where: { id } });
        } else
          row = await tx.laserMaterial.create({
            data: { data: json(data), createdById: actor },
          });
      } else {
        const data = parseOrThrow(presetSchema, wrapper.data);
        if (
          !(await tx.laserMachineProfile.findUnique({
            where: { id: data.machineId },
          })) ||
          !(await tx.laserMaterial.findUnique({
            where: { id: data.materialId },
          }))
        )
          throw new BadRequestException(
            "Reçete için makine / malzeme bulunamadı.",
          );
        const values = {
          data: json(data),
          machineId: data.machineId,
          materialId: data.materialId,
        };
        if (id) {
          if (
            !(
              await tx.laserCutPreset.updateMany({
                where,
                data: { ...values, ...update },
              })
            ).count
          )
            throw new ConflictException("Reçete değişti; listeyi yenileyin.");
          row = await tx.laserCutPreset.findUniqueOrThrow({ where: { id } });
        } else
          row = await tx.laserCutPreset.create({
            data: { ...values, createdById: actor },
          });
      }
      await this.audit.record(
        {
          actorUserId: actor,
          action: `laser.${kind}.${id ? "updated" : "created"}`,
          entityType: kind,
          entityId: row.id,
        },
        tx,
      );
      return row;
    });
  }
  async upload(actor: string, input: z.infer<typeof uploadSchema>) {
    const analysis = ingest(input);
    return this.db.$transaction(async (tx) => {
      const row = await tx.laserDesignFile.create({
        data: {
          name: input.name,
          content: input.content,
          sha256: createHash("sha256").update(input.content).digest("hex"),
          analysis: json(analysis),
          createdById: actor,
        },
      });
      await this.audit.record(
        {
          actorUserId: actor,
          action: "laser.design.uploaded",
          entityType: "LaserDesignFile",
          entityId: row.id,
        },
        tx,
      );
      return { id: row.id, name: row.name, analysis };
    });
  }
  async scale(actor: string, id: string, mmPerUnit: number) {
    const row = await this.db.laserDesignFile.findUnique({ where: { id } });
    if (!row) throw new NotFoundException();
    return this.upload(actor, {
      name: row.name,
      content: row.content,
      contentType: "",
      mmPerUnit,
      toleranceMm: 0.02,
    });
  }
  async design(id: string) {
    const row = await this.db.laserDesignFile.findUnique({
      where: { id },
      select: { id: true, name: true, analysis: true },
    });
    if (!row) throw new NotFoundException();
    return row;
  }
  private async snapshot(
    tx: Prisma.TransactionClient,
    input: z.infer<typeof estimateSchema>,
  ): Promise<Snapshot> {
    const design = await tx.laserDesignFile.findUnique({
      where: { id: input.designId },
      select: { id: true, name: true, analysis: true },
    });
    const machine = await tx.laserMachineProfile.findUnique({
      where: { id: input.machineId },
    });
    const material = await tx.laserMaterial.findUnique({
      where: { id: input.materialId },
    });
    if (!design || !machine || !material)
      throw new BadRequestException("Çizim, makine veya malzeme bulunamadı.");
    const m = machineSchema.parse(machine.data),
      mat = materialSchema.parse(material.data),
      g = design.analysis as unknown as Geometry;
    if (!m.active || !mat.available)
      throw new BadRequestException("Makine / malzeme kullanım dışı.");
    const layers = new Set(g.paths.map((p) => p.layer));
    if (
      Object.keys(input.assignments).some((layer) => !layers.has(layer)) ||
      [...layers].some((layer) => !input.assignments[layer])
    )
      throw new BadRequestException(
        "Tüm çizim katmanları için geçerli işlem atayın.",
      );
    const ids = [
      ...new Set(
        Object.values(input.assignments)
          .filter((a) => a.operation !== "ignore")
          .map((a) => a.presetId)
          .filter((id): id is string => !!id),
      ),
    ];
    const presets = await tx.laserCutPreset.findMany({
      where: { id: { in: ids } },
    });
    if (
      presets.some(
        (p) => p.machineId !== machine.id || p.materialId !== material.id,
      )
    )
      throw new BadRequestException(
        "Reçete seçilen makine ve malzemeye ait olmalı.",
      );
    const presetMap = new Map(
      presets.map((p) => [p.id, presetSchema.parse(p.data)]),
    );
    const activePaths = g.paths.filter(
      (p) => input.assignments[p.layer]!.operation !== "ignore",
    );
    const productionGeometry = {
      ...g,
      paths: activePaths,
      bounds: bounds(activePaths.flatMap((p) => p.points)),
    };
    const time = estimateTime(g, m, presetMap, input),
      cost = estimateCost(productionGeometry, m, mat, time, input);
    if (
      mat.kerfMm &&
      activePaths.some(
        (p) =>
          p.closed &&
          (bounds(p.points).width <= mat.kerfMm ||
            bounds(p.points).height <= mat.kerfMm),
      )
    )
      time.warnings.push(
        "Bazı kapalı detaylar kerf payından küçük; üretimde kaybolabilir.",
      );
    const reviewReasons = g.warnings
      .filter((w) => w.review)
      .map((w) => w.message);
    if (!mat.compatibilityVerified)
      reviewReasons.push(
        "Malzemenin CO₂ lazer uyumluluğu doğrulanmalı. Bilinmeyen malzemeyi işlemeyin.",
      );
    if (!g.scaleConfirmed) reviewReasons.push("Fiziksel ölçek doğrulanmadı.");
    const overscan = Math.max(
      0,
      ...[...presetMap.values()]
        .filter((p) => p.operation === "fill")
        .map((p) => p.overscanMm),
    );
    if (
      productionGeometry.bounds.width + 2 * overscan > m.widthMm ||
      productionGeometry.bounds.height > m.heightMm
    )
      reviewReasons.push(
        "Etkin çizim / overscan makine çalışma alanını aşıyor.",
      );
    if (
      [...presetMap.values()].some((p) => !p.tested) &&
      !input.acceptUnverified
    )
      reviewReasons.push(
        "Test edilmemiş reçete tahmini açıkça kabul edilmeli.",
      );
    if (time.fillS && !input.acceptUnverified)
      reviewReasons.push("Yaklaşık dolgu tahmini açıkça kabul edilmeli.");
    return json({
      input,
      result: {
        engineVersion: ENGINE_VERSION,
        time,
        cost,
        reviewReasons: [...new Set(reviewReasons)],
        canFinalize: reviewReasons.length === 0,
      },
      design: { ...design, analysis: g },
      machine: { ...machine, data: m },
      material: { ...material, data: mat },
      presets,
    }) as unknown as Snapshot;
  }
  estimate(input: z.infer<typeof estimateSchema>) {
    return this.db.$transaction(
      async (tx) => (await this.snapshot(tx, input)).result,
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
  async saveQuote(actor: string, data: z.infer<typeof quoteSchema>) {
    return this.db.$transaction(
      async (tx) => {
        const snapshot = await this.snapshot(tx, data.input);
        if (data.status === "FINAL" && !snapshot.result.canFinalize)
          throw new BadRequestException(
            "İnceleme gereken teklif yalnızca taslak olarak kaydedilebilir.",
          );
        if (
          data.parentId &&
          !(await tx.laserQuote.findUnique({ where: { id: data.parentId } }))
        )
          throw new BadRequestException("Önceki teklif bulunamadı.");
        const row = await tx.laserQuote.create({
          data: {
            name: data.name,
            status: data.status,
            parentId: data.parentId,
            designId: data.input.designId,
            machineId: data.input.machineId,
            materialId: data.input.materialId,
            engineVersion: ENGINE_VERSION,
            snapshot: json(snapshot),
            createdById: actor,
          },
        });
        await this.audit.record(
          {
            actorUserId: actor,
            action: "laser.quote.created",
            entityType: "LaserQuote",
            entityId: row.id,
            details: { parentId: data.parentId, status: data.status },
          },
          tx,
        );
        return row;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
  quotes() {
    return this.db.laserQuote.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
      select: {
        id: true,
        name: true,
        status: true,
        parentId: true,
        createdAt: true,
      },
    });
  }
  async quote(id: string) {
    const q = await this.db.laserQuote.findUnique({ where: { id } });
    if (!q) throw new NotFoundException();
    return q;
  }
  async recordRun(actor: string, input: z.infer<typeof runSchema>) {
    const quote = await this.quote(input.quoteId),
      snapshot = quote.snapshot as unknown as Snapshot;
    if (input.quantity !== snapshot.input.quantity)
      throw new BadRequestException(
        "Gerçek parti adedi teklif ile aynı olmalı. Farklı adet için yeni teklif oluşturun.",
      );
    return this.db.$transaction(async (tx) => {
      const row = await tx.laserProductionRun.create({
        data: {
          ...input,
          producedAt: new Date(input.producedAt),
          estimatedS: snapshot.result.time.simulatedS,
          createdById: actor,
        },
      });
      await this.audit.record(
        {
          actorUserId: actor,
          action: "laser.production.recorded",
          entityType: "LaserProductionRun",
          entityId: row.id,
        },
        tx,
      );
      return row;
    });
  }
  async runs() {
    const rows = await this.db.laserProductionRun.findMany({
      orderBy: { producedAt: "desc" },
      take: 100,
      include: {
        quote: { select: { name: true, machineId: true, materialId: true } },
      },
    });
    return rows.map((r) => ({
      ...r,
      absoluteErrorS: Math.abs(r.actualS - r.estimatedS),
      errorPercent: r.actualS
        ? (100 * (r.estimatedS - r.actualS)) / r.actualS
        : null,
    }));
  }
}
// Snapshot configuration values are versioned in JSON alongside the immutable calculation.
export type LaserConfiguration = ConfigRow<Machine | Material | Preset>;
