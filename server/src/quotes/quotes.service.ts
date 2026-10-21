import { BadRequestException, HttpException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { isUniqueConflict } from '../common/errors';
import { APP_CONFIG, type AppConfig } from '../config';
import { Prisma, type QuoteRequest, type QuoteStatus } from '../generated/prisma/client';
import { PRISMA, type PrismaClient } from '../prisma/prisma';
import { checkSvg } from './svg';
import type { quoteFieldsSchema } from './quotes.schemas';

/** What multer hands over for the uploaded file (memory storage). */
export interface UploadedSvg {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const ACCEPTED_MIME = new Set(['image/svg+xml', 'application/octet-stream', '']);

/** Unambiguous upper-case alphabet (no 0/O, 1/I). */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function newReference(): string {
  const bytes = randomBytes(8);
  return `Q-${Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')}`;
}

/** Display-only copy of the client's file name: no path, no control characters, bounded. */
function displayName(original: string): string {
  const base = original.split(/[\\/]/).pop() ?? '';
  // Stripping control characters is the point of this expression.
  // oxlint-disable-next-line no-control-regex
  const clean = base.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 200);
  return clean || 'dosya.svg';
}

export interface QuoteSummary {
  id: string;
  reference: string;
  status: QuoteStatus;
  widthCm: number;
  heightCm: number;
  material: string;
  quantity: number;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  notes: string | null;
  fileName: string;
  fileSize: number;
  createdAt: string;
}

function toSummary(q: QuoteRequest): QuoteSummary {
  return {
    id: q.id,
    reference: q.reference,
    status: q.status,
    widthCm: q.widthCm.toNumber(),
    heightCm: q.heightCm.toNumber(),
    material: q.material,
    quantity: q.quantity,
    contactName: q.contactName,
    contactEmail: q.contactEmail,
    contactPhone: q.contactPhone,
    notes: q.notes,
    fileName: q.fileName,
    fileSize: q.fileSize,
    createdAt: q.createdAt.toISOString(),
  };
}

@Injectable()
export class QuotesService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly audit: AuditService,
  ) {}

  /** Private directory — never served by any route except the staff download. */
  private get dir() {
    return path.resolve(this.config.UPLOAD_DIR, 'quotes');
  }

  filePath(fileId: string) {
    return path.join(this.dir, `${fileId}.svg`);
  }

  async create(file: UploadedSvg | undefined, fields: z.infer<typeof quoteFieldsSchema>): Promise<{ reference: string }> {
    if (!file || file.size === 0) throw new BadRequestException({ message: 'Bir SVG dosyası ekleyin.' });
    if (!file.originalname.toLowerCase().endsWith('.svg') || !ACCEPTED_MIME.has(file.mimetype)) {
      throw new BadRequestException({ message: 'Yalnızca .svg dosyaları kabul edilir.' });
    }
    const check = checkSvg(file.buffer);
    if (!check.ok) throw new BadRequestException({ message: check.error });

    const since = new Date(Date.now() - 24 * 3_600_000);
    if ((await this.prisma.quoteRequest.count({ where: { createdAt: { gte: since } } })) >= this.config.QUOTE_DAILY_LIMIT) {
      throw new HttpException(
        { message: 'Şu anda çok fazla teklif talebi var; lütfen daha sonra tekrar deneyin veya bize e-posta ile ulaşın.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await mkdir(this.dir, { recursive: true });
    const fileId = randomUUID();
    const target = this.filePath(fileId);

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const quote = await this.prisma.$transaction(async (tx) => {
          const created = await tx.quoteRequest.create({
            data: {
              reference: newReference(),
              widthCm: new Prisma.Decimal(fields.widthCm),
              heightCm: new Prisma.Decimal(fields.heightCm),
              material: fields.material,
              quantity: fields.quantity,
              contactName: fields.name,
              contactEmail: fields.email,
              contactPhone: fields.phone || null,
              notes: fields.notes?.trim() || null,
              fileName: displayName(file.originalname),
              fileId,
              fileSize: file.size,
              fileSha256: createHash('sha256').update(file.buffer).digest('hex'),
            },
          });
          // Written inside the transaction: if it fails, no row is left pointing at a missing file.
          await writeFile(target, file.buffer, { flag: 'wx', mode: 0o640 });
          await this.audit.record(
            { actorUserId: null, action: 'quote.created', entityType: 'QuoteRequest', entityId: created.id },
            tx,
          );
          return created;
        });
        return { reference: quote.reference };
      } catch (e) {
        await rm(target, { force: true });
        // A reference collision is astronomically unlikely, but retry rather than fail the customer.
        if (isUniqueConflict(e) && attempt < 2) continue;
        throw e;
      }
    }
    throw new Error('unreachable');
  }

  async list(): Promise<QuoteSummary[]> {
    const rows = await this.prisma.quoteRequest.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
    return rows.map(toSummary);
  }

  async get(id: string): Promise<QuoteRequest> {
    const quote = await this.prisma.quoteRequest.findUnique({ where: { id } });
    if (!quote) throw new NotFoundException({ message: 'Teklif talebi bulunamadı.' });
    return quote;
  }

  async summary(id: string): Promise<QuoteSummary> {
    return toSummary(await this.get(id));
  }

  async setStatus(actorId: string, id: string, status: QuoteStatus): Promise<QuoteSummary> {
    return this.prisma.$transaction(async (tx) => {
      const found = await tx.quoteRequest.findUnique({ where: { id }, select: { status: true } });
      if (!found) throw new NotFoundException({ message: 'Teklif talebi bulunamadı.' });
      const updated = await tx.quoteRequest.update({ where: { id }, data: { status } });
      await this.audit.record(
        {
          actorUserId: actorId,
          action: 'quote.status_changed',
          entityType: 'QuoteRequest',
          entityId: id,
          details: { from: found.status, to: status },
        },
        tx,
      );
      return toSummary(updated);
    });
  }
}
