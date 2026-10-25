import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, it, expect, vi } from "vitest";
import { ProductImageImport } from "@/pages/admin/products/ProductImageImport";
import { ProductsTab } from "@/pages/admin/tabs/ProductsTab";
import { request } from "@/lib/adminApi";
import { defaultProducts } from "@/data/products/defaults";
vi.mock("@/lib/adminApi", () => ({
  request: vi.fn(),
  errorMessage: (e: Error) => e.message,
  adminApi: { saveProducts: vi.fn() },
}));
const product = defaultProducts[0]!;
const state = {
  revision: "2026-10-25T00:00:00.000Z",
  images: product.images,
  thumbnail: product.thumbnail,
  updatedAt: product.updatedAt,
};
const group = {
  id: "group",
  sourceUrl: "https://www.etsy.com/listing/123/panel",
  title: "Yetkili görseller",
  permissionUntil: null,
  revoked: false,
  expiresAt: "2099-01-01T00:00:00Z",
  images: [{ id: "image", productName: "Panel", fileName: "panel.png" }],
};
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
function setup(images = product.images) {
  const attached = vi.fn();
  vi.mocked(request).mockImplementation(async (_method, url) => {
    if (url.endsWith("/state")) return { ...state, images };
    if (url.endsWith("/batches")) return [group];
    if (url.endsWith("/inspect"))
      return {
        available: false,
        message: "Etsy otomatik alma henüz bağlı değil.",
      };
    return {
      revision: "2026-10-25T00:00:01.000Z",
      images: ["/api/media/new.png"],
      thumbnail: "/api/media/new.png",
      updatedAt: "2026-10-25",
    };
  });
  render(
    <ProductImageImport
      product={product}
      onAttached={attached}
      onClose={vi.fn()}
    />,
  );
  return attached;
}
describe("product-row image import", () => {
  it("shows one import action per product for admins but not editors", () => {
    const { unmount } = render(<ProductsTab canImport />);
    expect(
      screen.getAllByRole("button", { name: "Etsy / Galeriden görsel ekle" })
        .length,
    ).toBe(defaultProducts.length);
    unmount();
    render(<ProductsTab canImport={false} />);
    expect(
      screen.queryByRole("button", { name: "Etsy / Galeriden görsel ekle" }),
    ).not.toBeInTheDocument();
  });
  it("finds an existing gallery by Etsy URL and attaches only to the chosen product after explicit publication review", async () => {
    const attached = setup();
    const u = userEvent.setup();
    await screen.findByRole("option", { name: group.title });
    await u.type(
      screen.getByLabelText("Bu ürünün Etsy bağlantısı"),
      group.sourceUrl,
    );
    await u.click(
      screen.getByRole("button", {
        name: "Bağlantıyı kontrol et / kayıtlı galeriyi bul",
      }),
    );
    await screen.findByText(/kayıtlı özel galeri bulundu/);
    await u.click(screen.getByRole("checkbox", { name: "Panel" }));
    expect(
      screen.getByRole("button", { name: "Seçilen 1 görseli bu ürüne kaydet" }),
    ).toBeDisabled();
    await u.type(
      screen.getByLabelText(/Ticari yayın hakkının doğrulama kaydı/),
      "Hak sahibi benim, süresiz ticari kullanım hakkı doğrulandı.",
    );
    await u.click(
      screen.getByRole("checkbox", { name: /ticari yayın hakkını inceleyip/ }),
    );
    await u.click(
      screen.getByRole("checkbox", { name: /Bu kullanım hakkı süresizdir/ }),
    );
    await u.click(
      screen.getByRole("button", { name: "Seçilen 1 görseli bu ürüne kaydet" }),
    );
    expect(request).toHaveBeenLastCalledWith(
      "POST",
      `/api/admin/research/images/products/${product.id}/attach`,
      expect.objectContaining({
        imageIds: ["image"],
        expectedRevision: state.revision,
        commercialPublicationVerified: true,
        permanentPublicationConfirmed: true,
        makeCover: false,
      }),
    );
    expect(attached).toHaveBeenCalled();
    expect(
      vi
        .mocked(request)
        .mock.calls.some(([, url]) => url === "/api/admin/products"),
    ).toBe(false);
  });
  it("blocks attachment if local product images differ from the server", async () => {
    setup(["#123456"]);
    await screen.findByText(/yerel görselleri sunucuyla eşleşmiyor/);
    expect(
      screen.getByRole("button", { name: "Seçilen 0 görseli bu ürüne kaydet" }),
    ).toBeDisabled();
  });
  it("reports unavailable URL acquisition without pretending to import remote images", async () => {
    setup();
    const u = userEvent.setup();
    await u.type(
      screen.getByLabelText("Bu ürünün Etsy bağlantısı"),
      "https://www.etsy.com/listing/999/other",
    );
    await u.click(
      screen.getByRole("button", {
        name: "Bağlantıyı kontrol et / kayıtlı galeriyi bul",
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Etsy otomatik alma henüz bağlı değil.",
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
