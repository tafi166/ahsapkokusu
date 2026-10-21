import { beforeEach, describe, expect, it } from "vitest";
import {
  applyOverride,
  clearLegacyBrowserOverrides,
  LEGACY_STORAGE_KEY,
  loadLegacyBrowserOverrides,
  loadOverrides,
  mergeShallowNested,
  setServerOverrides,
} from "@/lib/adminStore";

describe("mergeShallowNested", () => {
  const base = {
    hero: { title: "Base Title", images: ["a", "b"] },
    contact: { email: "base@example.com", phone: "000" },
  };

  it("returns base unchanged when there is no override", () => {
    expect(mergeShallowNested(base, undefined)).toBe(base);
  });

  it(
    "keeps a field the override predates instead of erasing it — " +
      "regression: a hero override saved before `images` existed on the schema " +
      "used to make `hero.images` undefined and crash the whole app at import time",
    () => {
      const staleOverride = { hero: { title: "Old Saved Title" } } as unknown as Partial<typeof base>;
      const merged = mergeShallowNested(base, staleOverride);
      expect(merged.hero.title).toBe("Old Saved Title");
      expect(merged.hero.images).toEqual(["a", "b"]);
    },
  );

  it("lets a full, current-shape override win entirely for a section it mentions", () => {
    const override = { hero: { title: "New", images: ["c"] } };
    const merged = mergeShallowNested(base, override);
    expect(merged.hero).toEqual({ title: "New", images: ["c"] });
  });

  it("leaves a top-level key untouched when the override doesn't mention it", () => {
    const override = { hero: { title: "New" } } as unknown as Partial<typeof base>;
    const merged = mergeShallowNested(base, override);
    expect(merged.contact).toEqual(base.contact);
  });
});

describe("applyOverride", () => {
  it("uses the override when it's defined, even an empty array", () => {
    expect(applyOverride(["default"], [])).toEqual([]);
  });

  it("falls back to base when the override is undefined", () => {
    expect(applyOverride(["default"], undefined)).toEqual(["default"]);
  });
});

describe("server overrides", () => {
  it("are what the data modules read, once set at start-up", () => {
    setServerOverrides({ partnerLogos: ["A", "B"] });
    expect(loadOverrides()).toEqual({ partnerLogos: ["A", "B"] });
    setServerOverrides({});
    expect(loadOverrides()).toEqual({});
  });

  it("ignore edits left in localStorage by the pre-server admin panel", () => {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ partnerLogos: ["Old"] }));
    expect(loadOverrides()).toEqual({});
    localStorage.clear();
  });
});

describe("legacy browser overrides", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("are readable for migration, tolerating missing or corrupted data", () => {
    expect(loadLegacyBrowserOverrides()).toBeNull();
    localStorage.setItem(LEGACY_STORAGE_KEY, "{not valid json");
    expect(loadLegacyBrowserOverrides()).toBeNull();
    localStorage.setItem(LEGACY_STORAGE_KEY, "[1,2]");
    expect(loadLegacyBrowserOverrides()).toBeNull();
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ partnerLogos: ["A"] }));
    expect(loadLegacyBrowserOverrides()).toEqual({ partnerLogos: ["A"] });
    clearLegacyBrowserOverrides();
    expect(loadLegacyBrowserOverrides()).toBeNull();
  });
});
