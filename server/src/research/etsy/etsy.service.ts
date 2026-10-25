import { imageSize } from "image-size";
import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  GoneException,
  HttpException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";
import { APP_CONFIG, type AppConfig } from "../../config";
import { ResearchImagesService } from "../images/images.service";
import { sniffImage } from "../../media/media.service";
import { httpsUrl } from "../images/schemas";
import { EtsyTransport, type EtsyResponse } from "./etsy.transport";

export const previewInput = z
  .object({ url: httpsUrl, sourcePermissionConfirmed: z.literal(true) })
  .strict();
export const importInput = z
  .object({
    ticket: z.string().regex(/^[a-f0-9]{48}$/),
    imageIds: z
      .array(z.string().regex(/^[1-9]\d{0,15}$/))
      .min(1)
      .max(12)
      .refine((ids) => new Set(ids).size === ids.length),
  })
  .strict();
const numericId = z.number().int().positive().safe();
const listingSchema = z.object({
  listing_id: numericId,
  shop_id: numericId,
  title: z.string().min(1).max(1000),
  state: z.literal("active"),
});
const imageSchema = z.object({
  listing_id: numericId,
  listing_image_id: numericId,
  rank: z.number().int().nonnegative(),
  url_170x135: z.string().url(),
  url_fullxfull: z.string().url(),
});
interface GalleryTicket {
  actor: string;
  expires: number;
  listingId: string;
  shopId: string;
  title: string;
  sourceUrl: string;
  images: z.infer<typeof imageSchema>[];
}
export function listingIdFromUrl(value: string) {
  const u = new URL(value);
  if (
    u.protocol !== "https:" ||
    !["etsy.com", "www.etsy.com"].includes(u.hostname) ||
    u.username ||
    u.password ||
    u.port
  )
    throw new BadRequestException("Geçerli bir Etsy ürün bağlantısı girin.");
  const match = u.pathname.match(
    /^\/(?:[a-z]{2}\/)?listing\/([1-9]\d{0,15})(?:\/|$)/,
  );
  if (!match)
    throw new BadRequestException(
      "Mağaza yerine ürünün /listing/ bağlantısını girin.",
    );
  return match[1]!;
}
function cdnUrl(url: string) {
  const u = new URL(url);
  if (
    u.protocol !== "https:" ||
    u.hostname !== "i.etsystatic.com" ||
    u.port ||
    u.username ||
    u.password
  )
    throw new BadGatewayException("Etsy görsel adresi doğrulanamadı.");
  return u.href;
}
@Injectable()
export class EtsyService {
  private tickets = new Map<string, GalleryTicket>();
  private cooldown = 0;
  private apiTail: Promise<unknown> = Promise.resolve();
  private lastApi = 0;
  private previewRequests = 0;
  private importRequests = 0;
  private importing = new Set<string>();
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly transport: EtsyTransport,
    private readonly images: ResearchImagesService,
  ) {}
  status() {
    const configured =
      this.config.RESEARCH_ENABLED &&
      this.config.ETSY_IMPORT_ENABLED &&
      this.config.ETSY_TERMS_REVIEWED &&
      Boolean(this.config.ETSY_API_KEY);
    return {
      configured,
      connectionVerified: false,
      allowedShopCount: this.config.ETSY_ALLOWED_SHOP_IDS.length,
      message: configured
        ? "Etsy bağlantısı ürün isteği sırasında doğrulanır."
        : !this.config.RESEARCH_ENABLED
          ? "Araştırma Stüdyosu kapalı (RESEARCH_ENABLED)."
          : !this.config.ETSY_IMPORT_ENABLED
            ? "Etsy görsel alma kapalı (ETSY_IMPORT_ENABLED)."
            : !this.config.ETSY_API_KEY
              ? "Sunucuda ETSY_API_KEY eksik. Keystring:SharedSecret biçiminde güvenli ortam ayarına girin."
              : "Etsy API kullanım koşulları incelenip ETSY_TERMS_REVIEWED etkinleştirilmelidir.",
    };
  }
  private enabled() {
    const state = this.status();
    if (!state.configured) throw new ServiceUnavailableException(state.message);
  }
  private response(response: EtsyResponse) {
    if (response.status === 429) {
      const seconds = Math.max(
        1,
        Math.min(86400, Number(response.retryAfter) || 60),
      );
      this.cooldown = Date.now() + seconds * 1000;
      throw new HttpException(
        {
          message: `Etsy istek sınırına ulaşıldı. ${seconds} saniye sonra tekrar deneyin.`,
          retryAfter: seconds,
        },
        429,
      );
    }
    if (response.status === 401 || response.status === 403)
      throw new ForbiddenException(
        "Etsy erişimi reddetti. Uygulama onayını, Keystring:SharedSecret bilgisini ve ağ izinlerini kontrol edin.",
      );
    if (response.status === 404)
      throw new BadRequestException("Etsy ürünü veya görseli bulunamadı.");
    if (response.status !== 200)
      throw new BadGatewayException("Etsy şu anda geçerli bir yanıt vermiyor.");
  }
  private async api(path: string) {
    const run = this.apiTail
      .catch(() => {})
      .then(async () => {
        if (Date.now() < this.cooldown)
          throw new HttpException(
            {
              message: "Etsy istek sınırı bekleme süresi devam ediyor.",
              retryAfter: Math.ceil((this.cooldown - Date.now()) / 1000),
            },
            429,
          );
        await delay(Math.max(0, 300 - (Date.now() - this.lastApi)));
        this.lastApi = Date.now();
        const res = await this.transport.get(
          `https://api.etsy.com/v3/application/${path}`,
          true,
          1024 * 1024,
        );
        this.response(res);
        try {
          return JSON.parse(res.bytes.toString("utf8")) as unknown;
        } catch {
          throw new BadGatewayException("Etsy JSON yanıtı doğrulanamadı.");
        }
      });
    this.apiTail = run;
    return run;
  }
  async preview(actor: string, url: string) {
    if (this.previewRequests >= 8)
      throw new ServiceUnavailableException(
        "Etsy önizlemeleri yoğun. Biraz sonra tekrar deneyin.",
      );
    this.previewRequests++;
    try {
      return await this.fetchPreview(actor, url);
    } finally {
      this.previewRequests--;
    }
  }
  private async fetchPreview(actor: string, url: string) {
    this.enabled();
    const listingId = listingIdFromUrl(url);
    const parsed = listingSchema.safeParse(
      await this.api(`listings/${listingId}`),
    );
    if (!parsed.success || String(parsed.data.listing_id) !== listingId)
      throw new BadGatewayException(
        "Etsy ürün bilgileri doğrulanamadı; yalnızca aktif ürünler desteklenir.",
      );
    const listing = parsed.data,
      shopId = String(listing.shop_id);
    if (!this.config.ETSY_ALLOWED_SHOP_IDS.includes(shopId))
      throw new ForbiddenException(
        `Bu ürünün mağaza ID’si ${shopId}. Yetkili mağazayı sunucunun ETSY_ALLOWED_SHOP_IDS ayarına ekleyin.`,
      );
    const result = z
      .object({ results: z.array(imageSchema).max(50) })
      .safeParse(await this.api(`listings/${listingId}/images`));
    if (!result.success)
      throw new BadGatewayException("Etsy galerisi doğrulanamadı.");
    const rows = result.data.results
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 12);
    if (!rows.length)
      throw new BadRequestException("Üründe alınabilecek görsel yok.");
    if (new Set(rows.map((row) => row.listing_image_id)).size !== rows.length)
      throw new BadGatewayException(
        "Etsy galerisinde tekrarlanan görsel kimliği var.",
      );
    for (const row of rows) {
      if (String(row.listing_id) !== listingId)
        throw new BadGatewayException("Galeri ürünle eşleşmiyor.");
      cdnUrl(row.url_170x135);
      cdnUrl(row.url_fullxfull);
    }
    for (const [id, value] of this.tickets)
      if (value.expires <= Date.now()) this.tickets.delete(id);
    if (this.tickets.size >= 100)
      throw new ServiceUnavailableException(
        "Önizleme alanı dolu; birkaç dakika sonra tekrar deneyin.",
      );
    const ticket = randomBytes(24).toString("hex");
    this.tickets.set(ticket, {
      actor,
      expires: Date.now() + 5 * 60000,
      listingId,
      shopId,
      title: listing.title,
      sourceUrl: `https://www.etsy.com/listing/${listingId}`,
      images: rows,
    });
    return {
      ticket,
      title: listing.title,
      shopId,
      sourceUrl: `https://www.etsy.com/listing/${listingId}`,
      expiresInSeconds: 300,
      images: rows.map((row) => ({
        id: String(row.listing_image_id),
        previewUrl: `/api/admin/research/images/etsy/previews/${ticket}/${row.listing_image_id}`,
      })),
      message:
        "Etsy galerisi alındı. En fazla 12 görsel seçin; ürün kaydı için yayın hakkı ayrıca doğrulanır.",
    };
  }
  private ticket(actor: string, id: string) {
    this.enabled();
    const ticket = this.tickets.get(id);
    if (!ticket || ticket.expires <= Date.now() || ticket.actor !== actor)
      throw new GoneException(
        "Önizlemenin süresi dolmuş. Bağlantıdan görselleri yeniden getirin.",
      );
    return ticket;
  }
  private async image(url: string, thumbnail = false) {
    const res = await this.transport.get(
      cdnUrl(url),
      false,
      thumbnail ? 512 * 1024 : 5 * 1024 * 1024,
    );
    this.response(res);
    const mime = sniffImage(res.bytes);
    if (!mime || mime !== res.contentType.split(";")[0]?.trim())
      throw new BadGatewayException(
        "Etsy dosyası desteklenen bir görsel değil.",
      );
    let size;
    try {
      size = imageSize(res.bytes);
    } catch {
      throw new BadGatewayException("Etsy görsel boyutları okunamadı.");
    }
    if (
      !size.width ||
      !size.height ||
      size.width > 16000 ||
      size.height > 16000 ||
      size.width * size.height > (thumbnail ? 4000000 : 40000000)
    )
      throw new BadGatewayException("Etsy görsel boyutları desteklenmiyor.");
    return { bytes: res.bytes, contentType: mime };
  }
  async thumbnail(actor: string, id: string, imageId: string) {
    const ticket = this.ticket(actor, id),
      image = ticket.images.find(
        (row) => String(row.listing_image_id) === imageId,
      );
    if (!image) throw new BadRequestException("Görsel seçimi geçersiz.");
    return this.image(image.url_170x135, true);
  }
  async import(actor: string, id: string, ids: string[]) {
    this.ticket(actor, id);
    if (this.importRequests >= 2 || this.importing.has(id))
      throw new ServiceUnavailableException(
        "Görseller zaten alınıyor veya Etsy aktarımları yoğun. İşlem bitince tekrar deneyin.",
      );
    this.importRequests++;
    this.importing.add(id);
    try {
      return await this.performImport(actor, id, ids);
    } finally {
      this.importRequests--;
      this.importing.delete(id);
    }
  }
  private async performImport(actor: string, id: string, ids: string[]) {
    const ticket = this.ticket(actor, id);
    const selected = ids.map((imageId) =>
      ticket.images.find((row) => String(row.listing_image_id) === imageId),
    );
    if (selected.some((row) => !row))
      throw new BadRequestException("Seçilen görsel önizlemeye ait değil.");
    // Fetch/validate all source bytes before creating a gallery, so network failure has no partial public effect.
    let totalBytes = 0;
    const deadline = Date.now() + 45000;
    const files: { id: number; bytes: Buffer; contentType: string }[] = [];
    for (const image of selected) {
      if (Date.now() > deadline)
        throw new ServiceUnavailableException(
          "Görsel alma süresi aşıldı. Daha az görsel seçip tekrar deneyin.",
        );
      const file = await this.image(image!.url_fullxfull);
      totalBytes += file.bytes.length;
      if (totalBytes > 50 * 1024 * 1024)
        throw new BadRequestException(
          "Tek aktarım en fazla 50 MB olabilir. Daha az görsel seçin.",
        );
      files.push({ id: image!.listing_image_id, ...file });
    }
    const batch = await this.images.createBatch(
      actor,
      {
        title: ticket.title.slice(0, 160),
        sourceUrl: ticket.sourceUrl,
        permissionBasis: "AUTHORIZED",
        permissionNote:
          "Etsy önizlemesinden özel alana alma yetkisi yönetici tarafından beyan edildi.",
        permissionUntil: null,
        confirmed: true,
      },
      this.config.ETSY_IMPORT_RETENTION_HOURS,
    );
    try {
      const imported = [];
      for (const file of files) {
        const extension =
          file.contentType === "image/jpeg"
            ? "jpg"
            : file.contentType === "image/png"
              ? "png"
              : "webp";
        imported.push(
          await this.images.upload(
            actor,
            batch.id,
            ticket.title.slice(0, 160),
            `etsy-${ticket.listingId}-${file.id}.${extension}`,
            file.contentType,
            file.bytes,
          ),
        );
      }
      this.tickets.delete(id);
      return {
        ...batch,
        images: [
          ...new Map(imported.map((image) => [image.id, image])).values(),
        ],
      };
    } catch (e) {
      await this.images.revoke(actor, batch.id);
      throw e;
    }
  }
}
