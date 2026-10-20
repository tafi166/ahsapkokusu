import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { AuditService } from '../audit/audit.service';
import { APP_CONFIG, type AppConfig } from '../config';
import { PRISMA, type PrismaClient } from '../prisma/prisma';

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

const EXTENSION: Record<ImageType, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/** Identifies the format from the file's first bytes — the declared type alone is never trusted. */
export function sniffImage(bytes: Buffer): ImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (bytes.length >= 12 && bytes.toString('latin1', 0, 4) === 'RIFF' && bytes.toString('latin1', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

/** File names are `<uuid>.<ext>` — nothing from the client ends up in a path. */
export const MEDIA_FILE = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(jpg|png|webp)$/;

@Injectable()
export class MediaService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly audit: AuditService,
  ) {}

  private get dir() {
    return path.resolve(this.config.UPLOAD_DIR, 'media');
  }

  async upload(actorId: string, declaredType: string | undefined, body: unknown): Promise<{ url: string }> {
    if (!Buffer.isBuffer(body) || body.length === 0) {
      throw new BadRequestException({ message: 'Görsel gövdesi boş ya da türü desteklenmiyor (JPEG, PNG, WebP).' });
    }
    const type = sniffImage(body);
    if (!type || type !== declaredType?.split(';')[0]?.trim()) {
      throw new BadRequestException({ message: 'Dosya içeriği bildirilen görsel türüyle eşleşmiyor.' });
    }
    const extension = EXTENSION[type];
    await mkdir(this.dir, { recursive: true });

    // The row and the file succeed or fail together: the file is written inside the transaction.
    const media = await this.prisma.$transaction(async (tx) => {
      const row = await tx.media.create({
        data: {
          contentType: type,
          extension,
          sizeBytes: body.length,
          sha256: createHash('sha256').update(body).digest('hex'),
          uploadedById: actorId,
        },
      });
      const file = path.join(this.dir, `${row.id}.${extension}`);
      await writeFile(file, body, { flag: 'wx', mode: 0o640 });
      try {
        await this.audit.record({ actorUserId: actorId, action: 'media.uploaded', entityType: 'Media', entityId: row.id }, tx);
      } catch (e) {
        await rm(file, { force: true });
        throw e;
      }
      return row;
    });
    return { url: `/api/media/${media.id}.${media.extension}` };
  }

  /** Absolute path and type of a stored file, or 404. */
  async locate(fileName: string): Promise<{ file: string; contentType: string }> {
    const match = MEDIA_FILE.exec(fileName);
    if (!match) throw new NotFoundException();
    const media = await this.prisma.media.findUnique({ where: { id: match[1] } });
    if (!media || media.extension !== match[2]) throw new NotFoundException();
    return { file: path.join(this.dir, `${media.id}.${media.extension}`), contentType: media.contentType };
  }
}
