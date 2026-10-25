import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
  type OnModuleDestroy,
} from "@nestjs/common";
import { EnvHttpProxyAgent, fetch } from "undici";
import { getCACertificates } from "node:tls";
import { APP_CONFIG, type AppConfig } from "../../config";

export interface EtsyResponse {
  status: number;
  contentType: string;
  retryAfter: string | null;
  bytes: Buffer;
}
/** Proxy-aware TLS with pinned destinations; credentials are never sent to the image CDN. */
@Injectable()
export class EtsyTransport implements OnModuleDestroy {
  private readonly dispatcher = new EnvHttpProxyAgent({
    requestTls: { ca: getCACertificates("default") },
    proxyTls: { ca: getCACertificates("default") },
  });
  private active = 0;
  private waiting: (() => void)[] = [];
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}
  async onModuleDestroy() {
    await this.dispatcher.close();
  }
  async get(url: string, api: boolean, limit: number): Promise<EtsyResponse> {
    const u = new URL(url),
      host = api ? "api.etsy.com" : "i.etsystatic.com";
    if (
      u.protocol !== "https:" ||
      u.hostname !== host ||
      u.port ||
      u.username ||
      u.password
    )
      throw new BadRequestException("Etsy hedef adresi doğrulanamadı.");
    if (this.waiting.length >= 32)
      throw new ServiceUnavailableException(
        "Etsy işlemleri yoğun. Biraz sonra tekrar deneyin.",
      );
    if (this.active >= 4)
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    else this.active++;
    try {
      const response = await fetch(u, {
        dispatcher: this.dispatcher,
        redirect: "error",
        signal: AbortSignal.timeout(8000),
        headers: api
          ? {
              "x-api-key": this.config.ETSY_API_KEY!,
              Accept: "application/json",
            }
          : { Accept: "image/jpeg,image/png,image/webp" },
      });
      const declared = Number(response.headers.get("content-length") ?? 0);
      if (declared > limit) {
        await response.body?.cancel();
        throw new BadGatewayException(
          "Etsy dosyası izin verilen boyutu aşıyor.",
        );
      }
      const chunks: Uint8Array[] = [];
      let size = 0;
      if (response.body) {
        const reader = response.body.getReader();
        try {
          while (true) {
            const part = await reader.read();
            if (part.done) break;
            size += part.value.length;
            if (size > limit) {
              await reader.cancel();
              throw new BadGatewayException("Etsy yanıtı çok büyük.");
            }
            chunks.push(part.value);
          }
        } finally {
          reader.releaseLock();
        }
      }
      return {
        status: response.status,
        contentType: response.headers.get("content-type") ?? "",
        retryAfter: response.headers.get("retry-after"),
        bytes: Buffer.concat(chunks),
      };
    } catch (e) {
      if (e instanceof BadGatewayException) throw e;
      throw new BadGatewayException(
        "Etsy bağlantısı kurulamadı. Ağ erişimini ve TLS ayarlarını kontrol edin.",
      );
    } finally {
      const next = this.waiting.shift();
      if (next) next();
      else this.active--;
    }
  }
}
