import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";
import { PRISMA, type PrismaClient } from "../../prisma/prisma";
import { APP_CONFIG, type AppConfig } from "../../config";
import { AuditService } from "../../audit/audit.service";
import { rowToProduct } from "../../catalog/mapping";
import { MEDIA_PATH } from "../../content/schemas";
import { idSchema } from "./schemas";

export const catalogProductId = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/);
export const attachImagesInput = z
  .object({
    imageIds: z
      .array(idSchema)
      .min(1)
      .max(12)
      .refine((ids) => new Set(ids).size === ids.length),
    expectedRevision: z.string().datetime(),
    publicationEvidence: z.string().trim().min(10).max(3000),
    commercialPublicationVerified: z.literal(true),
    permanentPublicationConfirmed: z.literal(true),
    makeCover: z.boolean(),
  })
  .strict();
@Injectable()
export class ProductImagesService {
  constructor(
    @Inject(PRISMA) private readonly db: PrismaClient,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly audit: AuditService,
  ) {}
  async state(id: string) {
    const row = await this.db.product.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Ürünü önce sunucuya kaydedin.");
    const p = rowToProduct(row);
    return {
      revision: row.updatedAt.toISOString(),
      images: p.images,
      thumbnail: p.thumbnail,
      updatedAt: p.updatedAt,
    };
  }
  async attach(
    actor: string,
    productId: string,
    input: z.infer<typeof attachImagesInput>,
  ) {
    const createdFiles: string[] = [];
    try {
      return await this.db.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id" = ${productId} FOR UPDATE`;
          const row = await tx.product.findUnique({ where: { id: productId } });
          if (!row)
            throw new NotFoundException(
              "Ürün bulunamadı. Önce ürünü kaydedin.",
            );
          if (row.updatedAt.toISOString() !== input.expectedRevision)
            throw new ConflictException(
              "Ürün başka bir işlemde değişti. Yenileyip yeniden deneyin.",
            );
          const images = await tx.researchImage.findMany({
            where: { id: { in: input.imageIds } },
            include: { batch: true },
          });
          if (images.length !== input.imageIds.length)
            throw new NotFoundException("Görsel bulunamadı.");
          const batches = [...new Set(images.map((i) => i.batchId))].sort();
          for (const id of batches)
            await tx.$queryRaw`SELECT "id" FROM "ResearchImageBatch" WHERE "id" = ${id}::uuid FOR UPDATE`;
          const grants = await tx.researchImageBatch.findMany({
            where: { id: { in: batches } },
          });
          for (const grant of grants) {
            if (
              grant.revoked ||
              grant.expiresAt.getTime() <= Date.now() ||
              (grant.permissionUntil &&
                grant.permissionUntil.getTime() <= Date.now())
            )
              throw new ForbiddenException(
                "Kaynak görselin izni iptal edilmiş veya süresi dolmuş.",
              );
          }
          if (grants.length !== batches.length) throw new NotFoundException();
          const product = rowToProduct(row),
            urls = product.images.filter((url) => MEDIA_PATH.test(url));
          const existing = await tx.media.findMany({
            where: {
              id: {
                in: urls.map((url) => url.split("/").pop()!.split(".")[0]!),
              },
            },
          });
          const byHash = new Map(
            existing.map((m) => [
              m.sha256,
              { id: m.id, url: `/api/media/${m.id}.${m.extension}` },
            ]),
          );
          const selectedUrls: string[] = [];
          const dir = path.resolve(this.config.UPLOAD_DIR, "media");
          await mkdir(dir, { recursive: true });
          for (const id of input.imageIds) {
            const image = images.find((im) => im.id === id)!;
            let media = byHash.get(image.sha256);
            if (!media) {
              const source = path.resolve(
                this.config.UPLOAD_DIR,
                "research-images",
                `${image.id}.${image.extension}`,
              );
              let bytes: Buffer;
              try {
                bytes = await readFile(source);
              } catch {
                throw new NotFoundException("Kaynak dosya bulunamadı.");
              }
              if (
                bytes.length !== image.sizeBytes ||
                createHash("sha256").update(bytes).digest("hex") !==
                  image.sha256
              )
                throw new BadRequestException(
                  "Kaynak dosya bütünlüğü doğrulanamadı.",
                );
              const added = await tx.media.create({
                data: {
                  contentType: image.contentType,
                  extension: image.extension,
                  sizeBytes: image.sizeBytes,
                  sha256: image.sha256,
                  uploadedById: actor,
                },
              });
              const dest = path.join(dir, `${added.id}.${added.extension}`);
              await copyFile(source, dest, constants.COPYFILE_EXCL);
              createdFiles.push(dest);
              media = {
                id: added.id,
                url: `/api/media/${added.id}.${added.extension}`,
              };
              byHash.set(image.sha256, media);
            }
            if (!urls.includes(media.url)) urls.push(media.url);
            selectedUrls.push(media.url);
            await tx.researchProductImageGrant.create({
              data: {
                productId,
                mediaId: media.id,
                sourceImageId: image.id,
                sourceUrl: image.batch.sourceUrl,
                sha256: image.sha256,
                evidence: input.publicationEvidence,
                reviewedById: actor,
              },
            });
          }
          if (urls.length > 12)
            throw new BadRequestException(
              "Bir üründe en fazla 12 görsel olabilir. Önce mevcut görselleri azaltın.",
            );
          const thumbnail = input.makeCover
            ? selectedUrls[0]!
            : urls.includes(product.thumbnail)
              ? product.thumbnail
              : urls[0]!;
          const details = {
            ...(row.details as Record<string, unknown>),
            images: urls,
            thumbnail,
          };
          const updated = await tx.product.update({
            where: { id: productId },
            data: {
              details: JSON.parse(JSON.stringify(details)),
              contentUpdatedAt: new Date(),
            },
          });
          await this.audit.record(
            {
              actorUserId: actor,
              action: "research.images.product.attached",
              entityType: "Product",
              entityId: productId,
              details: {
                imageIds: input.imageIds,
                count: selectedUrls.length,
                publicationReviewed: true,
              },
            },
            tx,
          );
          const value = rowToProduct(updated);
          return {
            revision: updated.updatedAt.toISOString(),
            images: value.images,
            thumbnail: value.thumbnail,
            updatedAt: value.updatedAt,
          };
        },
        { timeout: 15000 },
      );
    } catch (e) {
      await Promise.all(createdFiles.map((file) => rm(file, { force: true })));
      throw e;
    }
  }
}
