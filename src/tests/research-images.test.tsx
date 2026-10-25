import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ImageDownloads,
  type ImageBatch,
} from "@/pages/admin/research/ImageDownloads";
import { request } from "@/lib/adminApi";
vi.mock("@/lib/adminApi", () => ({
  request: vi.fn(),
  errorMessage: (e: Error) => e.message,
}));
const base = "/api/admin/research/images";
const batch: ImageBatch = {
  id: "batch-one",
  title: "Özel ürünler",
  sourceUrl: "https://www.etsy.com/shop/Example",
  permissionBasis: "AUTHORIZED",
  permissionNote: "İzinli kaynak",
  permissionUntil: null,
  expiresAt: "2099-01-01T00:00:00Z",
  revoked: false,
  images: [
    {
      id: "image-one",
      fileName: "resim.png",
      productName: "Panel",
      width: 1,
      height: 1,
      sizeBytes: 68,
    },
  ],
};
function setup(groups: ImageBatch[] = []) {
  vi.mocked(request).mockImplementation(async (method, url) => {
    if (url === `${base}/batches`) return groups;
    if (url === `${base}/exports` && method === "GET") return [];
    if (url === `${base}/inspect`)
      return {
        available: false,
        message: "Etsy bağlantısından otomatik alma henüz kullanılamıyor.",
      };
    return {};
  });
  render(
    <MemoryRouter
      initialEntries={["/admin/research?view=images&batch=batch-one"]}
    >
      <ImageDownloads />
    </MemoryRouter>,
  );
}
beforeEach(() => vi.resetAllMocks());
afterEach(() => cleanup());
describe("private image download workflow", () => {
  it("requires a permission declaration before creating a gallery and reports unavailable Etsy import honestly", async () => {
    setup();
    const u = userEvent.setup();
    expect(
      screen.getByRole("button", { name: "Özel galeri oluştur" }),
    ).toBeDisabled();
    await u.type(
      screen.getByLabelText("Mağaza veya ürün bağlantısı"),
      batch.sourceUrl,
    );
    await u.click(
      screen.getByRole("button", { name: "Etsy bağlantısını kontrol et" }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "otomatik alma henüz kullanılamıyor",
    );
  });
  it("selects uploaded images and queues the exact selection", async () => {
    setup([batch]);
    const u = userEvent.setup();
    await screen.findByText("resim.png · 1×1");
    await u.click(screen.getByRole("button", { name: "Tüm görselleri seç" }));
    expect(screen.getByText(/1 seçili/)).toBeInTheDocument();
    await u.click(
      screen.getByRole("button", { name: "Seçilenleri ZIP hazırla" }),
    );
    expect(request).toHaveBeenCalledWith("POST", `${base}/exports`, {
      imageIds: ["image-one"],
    });
    expect(await screen.findByText(/ZIP sıraya alındı/)).toBeInTheDocument();
  });
  it("hides preview, upload and selection when permission is revoked", async () => {
    setup([{ ...batch, revoked: true }]);
    await screen.findByText(/Önizleme ve indirme kapalı/);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Tüm görselleri seç" }),
    ).not.toBeInTheDocument();
  });
  it("uploads original bytes from the tablet with the product reference", async () => {
    setup([batch]);
    const u = userEvent.setup();
    await u.type(
      await screen.findByLabelText("Yüklenecek görsellerin ürün adı"),
      "Ceviz",
    );
    const image = new File(["image"], "tablet.png", { type: "image/png" });
    await u.upload(screen.getByLabelText(/Tabletten görsel seç/), image);
    expect(request).toHaveBeenCalledWith(
      "POST",
      `${base}/batches/batch-one/upload?productName=Ceviz&fileName=tablet.png`,
      image,
    );
    expect(await screen.findByText(/Yükleme tamamlandı/)).toBeInTheDocument();
  });
});
