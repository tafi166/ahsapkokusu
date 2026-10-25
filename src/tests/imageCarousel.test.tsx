import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Link, Route, Routes } from "react-router-dom";
import { I18nProvider } from "@/i18n/I18nProvider";
import { ImageCarousel } from "@/components/product/ImageCarousel";
import { Gallery } from "@/components/product/Gallery";

const photos = ["/api/media/a.jpg", "/api/media/b.jpg", "/api/media/c.jpg"];
const label = (n: number) => `Gecko — görsel ${n}`;

function renderInLink() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="/"
            element={
              <Link to="/urun/gecko" className="group block">
                <ImageCarousel images={photos} label={label} />
              </Link>
            }
          />
          <Route path="/urun/gecko" element={<h1>Ürün sayfası</h1>} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  );
}

/** The photo that stays once the transition settles (the outgoing one is removed). */
async function settledPhoto(container: HTMLElement, src: string) {
  await waitFor(() => {
    const imgs = [...container.querySelectorAll("img")];
    expect(imgs.map((i) => i.getAttribute("src"))).toEqual([src]);
  });
}

describe("ImageCarousel", () => {
  it("steps through the photos in one square without following the surrounding link", async () => {
    const user = userEvent.setup();
    const { container } = renderInLink();
    await settledPhoto(container, photos[0]!);

    await user.click(screen.getByRole("button", { name: "Sonraki görsel" }));
    await settledPhoto(container, photos[1]!);
    expect(screen.queryByRole("heading", { name: "Ürün sayfası" })).not.toBeInTheDocument();

    // Wraps around in both directions.
    await user.click(screen.getByRole("button", { name: "Önceki görsel" }));
    await user.click(screen.getByRole("button", { name: "Önceki görsel" }));
    await settledPhoto(container, photos[2]!);
  });

  it("moves with the arrow keys", async () => {
    const user = userEvent.setup();
    const { container } = renderInLink();
    screen.getByRole("button", { name: "Sonraki görsel" }).focus();
    await user.keyboard("{ArrowRight}");
    await settledPhoto(container, photos[1]!);
    await user.keyboard("{ArrowLeft}");
    await settledPhoto(container, photos[0]!);
  });

  it("shows no controls for a single photo", () => {
    render(
      <I18nProvider>
        <ImageCarousel images={[photos[0]!]} label={label} />
      </I18nProvider>,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });
});

describe("Gallery", () => {
  it("keeps the main photo and the thumbnails in step", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <I18nProvider>
        <Gallery images={photos} title="Gecko" />
      </I18nProvider>,
    );
    const main = container.querySelector('[aria-roledescription="fotoğraf geçişi"]') as HTMLElement;

    await user.click(screen.getByRole("tab", { name: "3. görseli göster" }));
    await settledPhoto(main, photos[2]!);
    expect(screen.getByRole("img", { name: "Gecko — görsel 3" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sonraki görsel" }));
    await settledPhoto(main, photos[0]!);
    expect(screen.getByRole("tab", { name: "1. görseli göster" })).toHaveAttribute("aria-selected", "true");
  });
});
