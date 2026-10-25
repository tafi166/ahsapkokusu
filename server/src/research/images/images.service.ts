import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  type OnModuleInit,
  type OnModuleDestroy,
} from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile, rm, stat } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import archiver from "archiver";
import { imageSize } from "image-size";
import type { z } from "zod";
import { APP_CONFIG, type AppConfig } from "../../config";
import { PRISMA, type PrismaClient } from "../../prisma/prisma";
import { AuditService } from "../../audit/audit.service";
import { sniffImage } from "../../media/media.service";
import { batchInput } from "./schemas";

const DAY = 86400000;
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
@Injectable()
export class ResearchImagesService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private working: Promise<void> | null = null;
  constructor(
    @Inject(PRISMA) private readonly db: PrismaClient,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly audit: AuditService,
  ) {}
  private file(id: string, extension: string) {
    return path.resolve(
      this.config.UPLOAD_DIR,
      "research-images",
      `${id}.${extension}`,
    );
  }
  onModuleInit() {
    if (this.config.RESEARCH_ENABLED) {
      this.timer = setInterval(() => {
        if (!this.working)
          this.working = this.work()
            .catch(() => {})
            .finally(() => {
              this.working = null;
            });
      }, 1000);
      this.timer.unref();
    }
  }
  async onModuleDestroy() {
    clearInterval(this.timer);
    await this.working;
  }
  private allowed(batch: {
    revoked: boolean;
    expiresAt: Date;
    permissionUntil: Date | null;
  }) {
    if (
      batch.revoked ||
      batch.expiresAt.getTime() <= Date.now() ||
      (batch.permissionUntil && batch.permissionUntil.getTime() <= Date.now())
    )
      throw new ForbiddenException(
        "İndirme izni iptal edilmiş veya süresi dolmuş.",
      );
  }
  async batches() {
    return this.db.researchImageBatch.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { images: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } },
    });
  }
  async createBatch(actor: string, input: z.infer<typeof batchInput>) {
    const { confirmed: _confirmed, ...data } = input;
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(925421)`;
      if ((await tx.researchImageBatch.count()) >= 500)
        throw new BadRequestException(
          "Çalışma alanı sınırı doldu. Süresi dolan kayıtların temizlenmesini bekleyin.",
        );
      const row = await tx.researchImageBatch.create({
        data: {
          ...data,
          permissionUntil: data.permissionUntil
            ? new Date(data.permissionUntil)
            : null,
          createdById: actor,
          expiresAt: new Date(Date.now() + 7 * DAY),
        },
      });
      await this.audit.record(
        {
          actorUserId: actor,
          action: "research.images.permission.declared",
          entityType: "ResearchImageBatch",
          entityId: row.id,
        },
        tx,
      );
      return { ...row, images: [] };
    });
  }
  async revoke(actor: string, id: string) {
    return this.db.$transaction(async (tx) => {
      if (!(await tx.researchImageBatch.findUnique({ where: { id } })))
        throw new NotFoundException();
      await tx.researchImageBatch.update({
        where: { id },
        data: { revoked: true },
      });
      await this.audit.record(
        {
          actorUserId: actor,
          action: "research.images.permission.revoked",
          entityType: "ResearchImageBatch",
          entityId: id,
        },
        tx,
      );
      return { revoked: true };
    });
  }
  async upload(
    actor: string,
    batchId: string,
    productName: string,
    fileName: string,
    type: string | undefined,
    body: unknown,
  ) {
    if (
      !Buffer.isBuffer(body) ||
      !body.length ||
      body.length > Math.min(this.config.MEDIA_MAX_BYTES, 5 * 1024 * 1024)
    )
      throw new BadRequestException("Görsel en fazla 5 MB olabilir.");
    const mime = sniffImage(body);
    if (!mime || mime !== type?.split(";")[0])
      throw new BadRequestException("JPEG, PNG veya WebP yükleyin.");
    let size;
    try {
      size = imageSize(body);
    } catch {
      throw new BadRequestException("Görsel boyutları okunamadı.");
    }
    if (
      !size.width ||
      !size.height ||
      size.width * size.height > 40_000_000 ||
      size.width > 16000 ||
      size.height > 16000
    )
      throw new BadRequestException("Görsel boyutları desteklenmiyor.");
    const id = randomUUID(),
      extension = EXT[mime]!,
      file = this.file(id, extension),
      sha256 = createHash("sha256").update(body).digest("hex");
    await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
    try {
      return await this.db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(925421)`;
        const batch = await tx.researchImageBatch.findUnique({
          where: { id: batchId },
        });
        if (!batch) throw new NotFoundException();
        this.allowed(batch);
        const duplicate = await tx.researchImage.findUnique({
          where: { batchId_sha256: { batchId, sha256 } },
        });
        if (duplicate) return duplicate;
        if ((await tx.researchImage.count({ where: { batchId } })) >= 50)
          throw new BadRequestException(
            "Her grupta en fazla 50 görsel olabilir.",
          );
        const used = await tx.researchImage.aggregate({
          _sum: { sizeBytes: true },
        });
        if ((used._sum.sizeBytes ?? 0) + body.length > 1024 * 1024 * 1024)
          throw new BadRequestException("Özel görsel alanı dolu.");
        await writeFile(file, body, { flag: "wx", mode: 0o600 });
        const row = await tx.researchImage.create({
          data: {
            id,
            batchId,
            productName,
            fileName,
            contentType: mime,
            extension,
            sizeBytes: body.length,
            sha256,
            width: size.width!,
            height: size.height!,
          },
        });
        await this.audit.record(
          {
            actorUserId: actor,
            action: "research.images.uploaded",
            entityType: "ResearchImage",
            entityId: id,
          },
          tx,
        );
        return row;
      });
    } catch (e) {
      await rm(file, { force: true });
      throw e;
    }
  }
  async image(id: string) {
    const row = await this.db.researchImage.findUnique({
      where: { id },
      include: { batch: true },
    });
    if (!row) throw new NotFoundException();
    this.allowed(row.batch);
    return { ...row, file: this.file(row.id, row.extension) };
  }
  private async selection(ids: string[]) {
    const rows = await this.db.researchImage.findMany({
      where: { id: { in: ids } },
      include: { batch: true },
      orderBy: { id: "asc" },
    });
    if (rows.length !== ids.length)
      throw new NotFoundException("Seçilen görsellerden biri bulunamadı.");
    for (const row of rows) this.allowed(row.batch);
    if (rows.reduce((sum, r) => sum + r.sizeBytes, 0) > 50 * 1024 * 1024)
      throw new BadRequestException(
        "Bir ZIP en fazla 50 MB görsel içerebilir. Seçimi bölün.",
      );
    return rows;
  }
  async createExport(actor: string, imageIds: string[]) {
    await this.selection(imageIds);
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(925422)`;
      if (
        (await tx.researchImageExport.count({
          where: { expiresAt: { gt: new Date() } },
        })) >= 50
      )
        throw new BadRequestException(
          "ZIP sınırı dolu. Süresi dolan paketleri bekleyin.",
        );
      const row = await tx.researchImageExport.create({
        data: {
          imageIds,
          createdById: actor,
          expiresAt: new Date(Date.now() + DAY),
        },
      });
      await this.audit.record(
        {
          actorUserId: actor,
          action: "research.images.export.queued",
          entityType: "ResearchImageExport",
          entityId: row.id,
        },
        tx,
      );
      return row;
    });
  }
  exports() {
    return this.db.researchImageExport.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }
  async download(actor: string, id: string) {
    const job = await this.db.researchImageExport.findUnique({ where: { id } });
    if (!job || job.status !== "READY" || job.expiresAt.getTime() <= Date.now())
      throw new NotFoundException("Paket hazır değil veya süresi dolmuş.");
    await this.selection(job.imageIds as string[]);
    const file = this.file(id, "zip");
    try {
      await stat(file);
    } catch {
      throw new NotFoundException("Paket bulunamadı; yeniden hazırlayın.");
    }
    await this.audit.record({
      actorUserId: actor,
      action: "research.images.export.downloaded",
      entityType: "ResearchImageExport",
      entityId: id,
    });
    return file;
  }
  async cancel(actor: string, id: string) {
    const changed = await this.db.researchImageExport.updateMany({
      where: { id, status: { in: ["QUEUED", "RUNNING"] } },
      data: { status: "CANCELLED" },
    });
    if (!changed.count)
      throw new BadRequestException("Bu iş iptal edilemiyor.");
    await this.audit.record({
      actorUserId: actor,
      action: "research.images.export.cancelled",
      entityType: "ResearchImageExport",
      entityId: id,
    });
    return { cancelled: true };
  }
  /** One bounded ZIP per worker. Conditional claim permits more than one API process. */
  async work() {
    await this.db.researchImageExport.updateMany({
      where: {
        status: "RUNNING",
        updatedAt: { lt: new Date(Date.now() - 10 * 60_000) },
      },
      data: {
        status: "FAILED",
        error: "İş kesintiye uğradı. Seçimi yeniden hazırlayın.",
      },
    });
    const expired = await this.db.researchImageExport.findMany({
      where: { expiresAt: { lte: new Date() } },
    });
    for (const job of expired) {
      await rm(this.file(job.id, "zip"), { force: true });
      await this.db.researchImageExport.deleteMany({ where: { id: job.id } });
    }
    const batches = await this.db.researchImageBatch.findMany({
      where: { expiresAt: { lte: new Date() } },
      include: { images: true },
    });
    for (const batch of batches) {
      for (const img of batch.images)
        await rm(this.file(img.id, img.extension), { force: true });
      await this.db.researchImageBatch.deleteMany({ where: { id: batch.id } });
    }
    const job = await this.db.researchImageExport.findFirst({
      where: { status: "QUEUED" },
      orderBy: { createdAt: "asc" },
    });
    if (!job) return;
    if (
      !(
        await this.db.researchImageExport.updateMany({
          where: { id: job.id, status: "QUEUED" },
          data: { status: "RUNNING" },
        })
      ).count
    )
      return;
    const file = this.file(job.id, "zip");
    try {
      const images = await this.selection(job.imageIds as string[]);
      await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
      const archive = archiver("zip", { zlib: { level: 6 } }),
        output = createWriteStream(file, { flags: "wx", mode: 0o600 });
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          archive.abort();
          output.destroy();
          reject(new Error("timeout"));
        }, 60_000);
        const fail = (e: Error) => {
          clearTimeout(timer);
          archive.abort();
          output.destroy();
          reject(e);
        };
        output.once("close", () => {
          clearTimeout(timer);
          resolve();
        });
        output.once("error", fail);
        archive.once("error", fail);
        archive.once("warning", fail);
        archive.pipe(output);
        const manifest = images.map((img, index) => {
          const folder =
            img.productName
              .normalize("NFKD")
              .replace(/[^a-zA-Z0-9_-]/g, "_")
              .slice(0, 60) || "urun";
          const entry = `${folder}/${String(index + 1).padStart(2, "0")}-${img.id}.${img.extension}`;
          archive.file(this.file(img.id, img.extension), { name: entry });
          return {
            file: entry,
            originalName: img.fileName,
            sourceUrl: img.batch.sourceUrl,
            productName: img.productName,
            sha256: img.sha256,
            permissionBasis: img.batch.permissionBasis,
            permissionNote: img.batch.permissionNote,
            permissionStatus: "USER_DECLARED_NOT_VERIFIED",
            commercialPublicationGranted: false,
            uploadedAt: img.createdAt.toISOString(),
          };
        });
        archive.append(
          JSON.stringify(
            { exportedAt: new Date().toISOString(), images: manifest },
            null,
            2,
          ),
          { name: "kaynaklar.json" },
        );
        void archive.finalize().catch(fail);
      });
      await this.selection(job.imageIds as string[]);
      const sizeBytes = (await stat(file)).size;
      if (
        !(
          await this.db.researchImageExport.updateMany({
            where: { id: job.id, status: "RUNNING" },
            data: { status: "READY", sizeBytes },
          })
        ).count
      )
        await rm(file, { force: true });
    } catch {
      await rm(file, { force: true });
      await this.db.researchImageExport.updateMany({
        where: { id: job.id, status: "RUNNING" },
        data: {
          status: "FAILED",
          error:
            "Paket hazırlanamadı. Görselleri ve izin durumunu kontrol edip yeniden deneyin.",
        },
      });
    }
  }
}
