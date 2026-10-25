import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, it, expect, vi } from "vitest";
import { EtsyListingPicker } from "@/pages/admin/products/EtsyListingPicker";
import { request } from "@/lib/adminApi";
vi.mock("@/lib/adminApi", () => ({
  request: vi.fn(),
  errorMessage: (e: Error) => e.message,
  adminApi: {},
}));
const url = "https://www.etsy.com/listing/123/panel";
const preview = {
  ticket: "ticket",
  title: "Panel",
  images: [
    {
      id: "456",
      previewUrl: "/api/admin/research/images/etsy/previews/ticket/456",
    },
  ],
  message: "Etsy galerisi alındı.",
};
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
function setup(configured = true) {
  vi.mocked(request).mockImplementation(async (_method, path) =>
    path.endsWith("/status")
      ? { configured, message: "Sunucuda ETSY_API_KEY eksik." }
      : path.endsWith("/preview")
        ? preview
        : { id: "new-gallery", images: [{ id: "local-image" }] },
  );
  const imported = vi.fn(),
    busy = vi.fn();
  const view = render(
    <EtsyListingPicker url={url} onImported={imported} onBusy={busy} />,
  );
  return { imported, busy, ...view };
}
describe("Etsy listing picker", () => {
  it("shows missing setup without pretending the live connection is verified", async () => {
    setup(false);
    expect(
      await screen.findByText("Sunucuda ETSY_API_KEY eksik."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Etsy’den yeni görselleri getir" }),
    ).toBeDisabled();
  });
  it("requires source permission, previews actual provider images and imports only the selected original", async () => {
    const { imported, busy } = setup();
    const u = userEvent.setup();
    await screen.findByText(/API erişimi ilk ürün isteğinde/);
    expect(
      screen.getByRole("button", { name: "Etsy’den yeni görselleri getir" }),
    ).toBeDisabled();
    await u.click(
      screen.getByRole("checkbox", { name: /Bu kaynağın görsellerini/ }),
    );
    await u.click(
      screen.getByRole("button", { name: "Etsy’den yeni görselleri getir" }),
    );
    expect(
      await screen.findByRole("img", { name: "Etsy görsel 1" }),
    ).toHaveAttribute("src", preview.images[0]!.previewUrl);
    await u.click(screen.getByRole("checkbox", { name: "Görsel 1" }));
    await u.click(
      screen.getByRole("button", {
        name: "Seçilen 1 Etsy görselini özel alana al",
      }),
    );
    expect(request).toHaveBeenCalledWith(
      "POST",
      "/api/admin/research/images/etsy/import",
      { ticket: "ticket", imageIds: ["456"] },
    );
    expect(imported).toHaveBeenCalledWith({
      id: "new-gallery",
      images: [{ id: "local-image" }],
    });
    expect(busy).toHaveBeenLastCalledWith(false);
    expect(
      vi
        .mocked(request)
        .mock.calls.some(([, path]) => path.endsWith("/attach")),
    ).toBe(false);
  });
  it("invalidates previews when the source URL changes", async () => {
    const { rerender, imported, busy } = setup();
    const u = userEvent.setup();
    await screen.findByText(/API erişimi ilk ürün isteğinde/);
    await u.click(
      screen.getByRole("checkbox", { name: /Bu kaynağın görsellerini/ }),
    );
    await u.click(
      screen.getByRole("button", { name: "Etsy’den yeni görselleri getir" }),
    );
    await screen.findByRole("img", { name: "Etsy görsel 1" });
    rerender(
      <EtsyListingPicker
        url="https://etsy.com/listing/999/other"
        onImported={imported}
        onBusy={busy}
      />,
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Etsy görselini özel alana al/ }),
    ).not.toBeInTheDocument();
  });
  it("reports upstream denial and preserves the current product", async () => {
    const { imported } = setup();
    vi.mocked(request).mockImplementation(async (_method, path) => {
      if (path.endsWith("/status")) return { configured: true };
      throw new Error("Etsy erişimi reddetti.");
    });
    const u = userEvent.setup();
    await screen.findByText(/API erişimi ilk ürün isteğinde/);
    await u.click(
      screen.getByRole("checkbox", { name: /Bu kaynağın görsellerini/ }),
    );
    await u.click(
      screen.getByRole("button", { name: "Etsy’den yeni görselleri getir" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Etsy erişimi reddetti.",
    );
    expect(imported).not.toHaveBeenCalled();
  });
});
