import { describe, expect, it } from "vitest";
import { cncQuoteConfig } from "@/config/cncQuote";
import { checkFileMeta, inspectSvgText, parseDecimal, validateContact, validateDetails } from "@/lib/cncQuote";

const svg = (inner: string, attrs = 'viewBox="0 0 100 50"') =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ${attrs}>${inner}</svg>`;

describe("checkFileMeta", () => {
  it("accepts an .svg file with an SVG or empty type", () => {
    expect(checkFileMeta({ name: "Logo.SVG", type: "image/svg+xml", size: 1200 })).toBeNull();
    expect(checkFileMeta({ name: "logo.svg", type: "", size: 1200 })).toBeNull();
  });

  it("rejects other extensions, types, empty and oversized files", () => {
    expect(checkFileMeta({ name: "logo.png", type: "image/png", size: 10 })).toMatch(/\.svg/);
    expect(checkFileMeta({ name: "logo.svg.exe", type: "", size: 10 })).toMatch(/\.svg/);
    expect(checkFileMeta({ name: "logo.svg", type: "text/html", size: 10 })).toMatch(/türü/);
    expect(checkFileMeta({ name: "logo.svg", type: "image/svg+xml", size: 0 })).toMatch(/boş/);
    expect(
      checkFileMeta({ name: "logo.svg", type: "image/svg+xml", size: cncQuoteConfig.maxFileBytes + 1 }),
    ).toMatch(/büyük/);
  });
});

describe("inspectSvgText", () => {
  it("accepts a plain drawing and reads its size", () => {
    const result = inspectSvgText(svg('<path d="M0 0L10 10"/>', 'width="300mm" height="15cm" viewBox="0 0 300 150"'));
    expect(result).toEqual({
      ok: true,
      info: { physicalCm: { width: 30, height: 15 }, viewBox: { width: 300, height: 150 } },
    });
  });

  it("does not invent a physical size for unitless or px dimensions", () => {
    const result = inspectSvgText(svg("<rect/>", 'width="800" height="400px" viewBox="0 0 800 400"'));
    expect(result).toEqual({ ok: true, info: { viewBox: { width: 800, height: 400 } } });
  });

  it("allows internal references", () => {
    const inner = '<defs><path id="a" d="M0 0"/></defs><use href="#a"/><rect style="fill:url(#g)"/>';
    expect(inspectSvgText(svg(inner)).ok).toBe(true);
  });

  it.each([
    ["not XML", "hello world"],
    ["HTML", "<html><body>hi</body></html>"],
    ["broken markup", '<svg xmlns="http://www.w3.org/2000/svg"><g></svg>'],
    ["DOCTYPE / entities", '<!DOCTYPE svg [<!ENTITY x "y">]>' + svg("<g/>")],
    ["script element", svg("<script>alert(1)</script>")],
    ["event handler", svg('<rect onclick="alert(1)"/>')],
    ["handler on the root", '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'],
    ["foreignObject", svg("<foreignObject><div/></foreignObject>")],
    ["javascript: link", svg('<a href="javascript:alert(1)"><rect/></a>')],
    ["external image", svg('<image href="https://example.com/x.png"/>')],
    ["xlink external use", svg('<use xlink:href="other.svg#a"/>')],
    ["data: URI", svg('<image href="data:image/png;base64,AAAA"/>')],
    ["external CSS url", svg('<rect style="fill:url(https://example.com/x)"/>')],
    ["CSS @import", svg('<style>@import "https://example.com/x.css";</style>')],
  ])("rejects %s", (_label, text) => {
    expect(inspectSvgText(text).ok).toBe(false);
  });
});

describe("validateDetails", () => {
  const valid = { widthCm: "60", heightCm: "40,5", material: "MDF", quantity: "2" };

  it("accepts valid details, including a Turkish decimal comma", () => {
    expect(validateDetails(valid)).toEqual({});
  });

  it("enforces the configured size, material and quantity limits", () => {
    const errors = validateDetails({ widthCm: "1", heightCm: "abc", material: "Altın", quantity: "1.5" });
    expect(Object.keys(errors).sort()).toEqual(["heightCm", "material", "quantity", "widthCm"]);
    expect(validateDetails({ ...valid, widthCm: String(cncQuoteConfig.maxSizeCm + 1) }).widthCm).toBeDefined();
    expect(validateDetails({ ...valid, quantity: "0" }).quantity).toBeDefined();
    expect(validateDetails({ ...valid, quantity: String(cncQuoteConfig.maxQuantity + 1) }).quantity).toBeDefined();
  });

  it("parses decimals strictly", () => {
    expect(parseDecimal(" 12,5 ")).toBe(12.5);
    expect(parseDecimal("12")).toBe(12);
    expect(parseDecimal("-3")).toBeUndefined();
    expect(parseDecimal("1e3")).toBeUndefined();
    expect(parseDecimal("")).toBeUndefined();
  });
});

describe("validateContact", () => {
  const valid = { name: "Ada Lovelace", email: "ada@example.com", phone: "", notes: "" };

  it("accepts valid contact details with optional fields empty", () => {
    expect(validateContact(valid)).toEqual({});
    expect(validateContact({ ...valid, phone: "+90 (532) 123-45-67" })).toEqual({});
  });

  it("rejects missing or malformed fields", () => {
    expect(validateContact({ name: " ", email: "nope", phone: "abc", notes: "x".repeat(2001) })).toEqual({
      name: expect.any(String),
      email: expect.any(String),
      phone: expect.any(String),
      notes: expect.any(String),
    });
  });
});
