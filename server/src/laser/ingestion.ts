import { BadRequestException } from "@nestjs/common";
import type { z } from "zod";
import { uploadSchema } from "./schemas";
import { analyzeSvg } from "./svg";
import { analyzeDxf } from "./dxf";
export function ingest(input: z.infer<typeof uploadSchema>) {
  const v = uploadSchema.parse(input);
  if (
    Buffer.byteLength(v.content, "utf8") > 524288 ||
    v.content.includes("\uFFFD") ||
    v.content.includes("\0")
  )
    throw new BadRequestException(
      "Dosya en fazla 512 KiB ve geçerli UTF-8 metin olmalı.",
    );
  const isSvg = /\.svg$/i.test(v.name);
  if (
    (isSvg &&
      !["", "image/svg+xml", "application/octet-stream", "text/plain"].includes(
        v.contentType,
      )) ||
    (!isSvg && v.contentType === "image/svg+xml")
  )
    throw new BadRequestException("Dosya türü ve uzantısı uyuşmuyor.");
  try {
    return isSvg
      ? analyzeSvg(v.content, v.mmPerUnit, v.toleranceMm)
      : analyzeDxf(v.content, v.mmPerUnit, v.toleranceMm);
  } catch (e) {
    if (e instanceof BadRequestException) throw e;
    throw new BadRequestException(
      "Geometri çözümlenemedi; dosya bütünlüğünü kontrol edin.",
    );
  }
}
