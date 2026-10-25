import { afterEach, describe, it, expect, vi } from "vitest";
const { fetchMock, closeMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  closeMock: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("undici", () => ({
  fetch: fetchMock,
  EnvHttpProxyAgent: class {
    close = closeMock;
  },
}));
import { EtsyTransport } from "../src/research/etsy/etsy.transport";
import { loadConfig } from "../src/config";
afterEach(() => vi.clearAllMocks());
function transport() {
  return new EtsyTransport(
    loadConfig({
      DATABASE_URL: "postgresql://fixture",
      ETSY_API_KEY: "fixture-key:fixture-secret",
    }),
  );
}
describe("Etsy network boundary", () => {
  it("uses proxy-aware dispatch, disallows redirects and sends the combined key only to the API", async () => {
    fetchMock.mockImplementation(
      async () =>
        new Response("{}", {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    const network = transport();
    await network.get(
      "https://api.etsy.com/v3/application/listings/123",
      true,
      100,
    );
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({
      headers: { "x-api-key": "fixture-key:fixture-secret" },
      redirect: "error",
    });
    expect(fetchMock.mock.calls[0]![1].dispatcher).toBeDefined();
    await network.get("https://i.etsystatic.com/photo.png", false, 100);
    expect(fetchMock.mock.calls[1]![1].headers).not.toHaveProperty("x-api-key");
    await network.onModuleDestroy();
    expect(closeMock).toHaveBeenCalled();
  });
  it("rejects untrusted hosts and credentials before any network call", async () => {
    const network = transport();
    for (const url of [
      "https://127.0.0.1/file",
      "http://i.etsystatic.com/file",
      "https://i.etsystatic.com.evil.test/file",
      "https://user:pass@i.etsystatic.com/file",
    ])
      await expect(network.get(url, false, 100)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
    await network.onModuleDestroy();
  });
  it("bounds unknown-length streamed responses instead of trusting content length", async () => {
    fetchMock.mockResolvedValue(new Response("too much body", { status: 200 }));
    const network = transport();
    await expect(
      network.get("https://i.etsystatic.com/file", false, 4),
    ).rejects.toThrow("çok büyük");
    await network.onModuleDestroy();
  });
  it("does not expose network exceptions or credentials in errors", async () => {
    fetchMock.mockRejectedValue(new Error("fixture-key:fixture-secret"));
    const network = transport();
    await expect(
      network.get(
        "https://api.etsy.com/v3/application/listings/123",
        true,
        100,
      ),
    ).rejects.toThrow("Etsy bağlantısı kurulamadı");
    await network.onModuleDestroy();
  });
});
