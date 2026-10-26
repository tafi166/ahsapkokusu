import { describe, it, expect } from "vitest";
import { analyzeSvg } from "../src/laser/svg";
import { analyzeDxf } from "../src/laser/dxf";
import { ingest } from "../src/laser/ingestion";
import { svg, square, dxf, dxfLine } from "./laser-fixtures";
describe("bounded SVG geometry in physical millimeters", () => {
  it("measures a 100mm square perimeter and dimensions", () => {
    const g = analyzeSvg(square);
    expect(g.lengthMm).toBeCloseTo(400, 5);
    expect(g.bounds).toEqual({ x: 0, y: 0, width: 100, height: 100 });
    expect(g.closed).toBe(1);
    expect(g.starts).toBe(1);
    expect(g.scaleConfirmed).toBe(true);
  });
  it("measures known circles and elliptical paths", () => {
    expect(
      analyzeSvg(svg('<circle cx="50" cy="50" r="50"/>')).lengthMm,
    ).toBeCloseTo(100 * Math.PI, 0);
    expect(
      analyzeSvg(svg('<ellipse cx="50" cy="50" rx="20" ry="10"/>')).lengthMm,
    ).toBeGreaterThan(90);
  });
  it("finds nested contour hole candidates and open polylines", () => {
    const g = analyzeSvg(
      svg(
        '<rect width="100" height="100"/><rect x="10" y="10" width="10" height="10"/><polyline points="0,0 10,0 10,20"/>',
      ),
    );
    expect(g.holes).toBe(1);
    expect(g.open).toBe(1);
    expect(g.lengthMm).toBeCloseTo(470);
  });
  it("measures cubic, quadratic, smooth and arc commands", () => {
    const g = analyzeSvg(
      svg(
        '<path d="M0 0 C0 20 20 20 20 0 S40 -20 40 0 Q50 20 60 0 T80 0 A10 10 0 0 1 100 0"/>',
      ),
    );
    expect(g.lengthMm).toBeGreaterThan(120);
    expect(g.paths[0]!.points.length).toBeGreaterThan(30);
  });
  it("applies nested transformations and internal references", () => {
    const g = analyzeSvg(
      svg(
        '<defs><path id="edge" d="M0 0L10 0"/></defs><g transform="translate(5 8)"><g transform="scale(2)"><use href="#edge" x="3"/></g></g>',
      ),
    );
    expect(g.lengthMm).toBeCloseTo(20);
    expect(g.bounds.x).toBeCloseTo(11);
    expect(g.bounds.y).toBeCloseTo(8);
  });
  it.each([
    ["1in", 25.4],
    ["2.54cm", 25.4],
    ["72pt", 25.4],
    ["6pc", 25.4],
  ])("converts %s physical units", (unit, size) => {
    expect(
      analyzeSvg(
        svg(
          '<rect width="100" height="100"/>',
          `width="${unit}" height="${unit}" viewBox="0 0 100 100"`,
        ),
      ).bounds.width,
    ).toBeCloseTo(size);
  });
  it("supports physical shape lengths without a viewBox", () => {
    const g = analyzeSvg(
      svg('<rect width="100mm" height="50mm"/>', 'width="100mm" height="50mm"'),
    );
    expect(g.lengthMm).toBeCloseTo(300);
    expect(g.warnings.some((w) => w.code === "zero")).toBe(false);
  });
  it("honors meet/none viewBox ratios and offsets", () => {
    const g = analyzeSvg(
      svg(
        '<rect x="10" y="20" width="100" height="100"/>',
        'width="200mm" height="100mm" viewBox="10 20 100 100"',
      ),
    );
    expect(g.bounds).toEqual({ x: 50, y: 0, width: 100, height: 100 });
    const none = analyzeSvg(
      svg(
        '<rect width="100" height="100"/>',
        'width="200mm" height="100mm" viewBox="0 0 100 100" preserveAspectRatio="none"',
      ),
    );
    expect(none.bounds.width).toBe(200);
  });
  it("does not infer millimeters from viewBox alone; supports scale confirmation", () => {
    const content = svg(
      '<rect width="100" height="100"/>',
      'viewBox="0 0 100 100"',
    );
    expect(analyzeSvg(content).scaleConfirmed).toBe(false);
    expect(analyzeSvg(content, 1).lengthMm).toBe(400);
    expect(analyzeSvg(content, 1).scaleConfirmed).toBe(true);
  });
  it("keeps duplicates in measurements and blocks review", () => {
    const g = analyzeSvg(svg('<line x2="100"/><line x1="100"/>'));
    expect(g.lengthMm).toBe(200);
    expect(g.duplicateSegments).toBe(1);
    expect(g.warnings.some((w) => w.code === "duplicate" && w.review)).toBe(
      true,
    );
  });
  it("never hides unsupported text, images or styled objects", () => {
    const g = analyzeSvg(
      svg(
        '<rect width="10" height="10" style="display:none"/><text>Test</text><image/>',
      ),
    );
    expect(g.warnings.filter((w) => w.review).length).toBeGreaterThanOrEqual(3);
  });
  it.each([
    svg(""),
    "<svg>",
    svg('<path d="M0 nope"/>'),
    svg('<g transform="banana(10)"><line x2="1"/></g>'),
    svg('<use href="#loop" id="loop"/>'),
    "<not-svg/>",
  ])("rejects empty or malformed geometry", (content) =>
    expect(() => analyzeSvg(content)).toThrow(),
  );
  it.each([
    svg("<script>alert(1)</script>"),
    svg('<line x2="1" onclick="bad()"/>'),
    svg('<use href="https://example.com/file.svg"/>'),
    '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]>' + square,
    svg("<foreignObject/>"),
  ])("rejects active content and XXE", (content) =>
    expect(() => analyzeSvg(content)).toThrow(),
  );
  it("enforces expansion, size, namespace, type and complexity limits", () => {
    expect(() => analyzeSvg(svg('<line x2="1"/>'.repeat(3001)))).toThrow();
    expect(() =>
      ingest({
        name: "x.dxf",
        content: square,
        contentType: "application/dxf",
        toleranceMm: 0.02,
      }),
    ).toThrow();
    expect(() =>
      ingest({
        name: "x.svg",
        content: " ".repeat(524289),
        contentType: "image/svg+xml",
        toleranceMm: 0.02,
      }),
    ).toThrow();
  });
});
describe("validated core DXF adapter", () => {
  it("converts mm and inches and flags unknown units", () => {
    expect(analyzeDxf(dxf(dxfLine)).lengthMm).toBe(100);
    expect(analyzeDxf(dxf(dxfLine, 1)).lengthMm).toBeCloseTo(2540);
    expect(analyzeDxf(dxf(dxfLine, 0)).scaleConfirmed).toBe(false);
    expect(analyzeDxf(dxf(dxfLine, 0), 2).lengthMm).toBe(200);
  });
  it("handles circles, arcs and bulge semicircles", () => {
    const circle = analyzeDxf(dxf("0\nCIRCLE\n10\n0\n20\n0\n40\n50\n"));
    expect(circle.lengthMm).toBeCloseTo(100 * Math.PI, 0);
    const arc = analyzeDxf(
      dxf("0\nARC\n10\n0\n20\n0\n40\n50\n50\n0\n51\n90\n"),
    );
    expect(arc.lengthMm).toBeCloseTo(25 * Math.PI, 0);
    const bulge = analyzeDxf(
      dxf("0\nLWPOLYLINE\n90\n2\n70\n0\n10\n0\n20\n0\n42\n1\n10\n100\n20\n0\n"),
    );
    expect(bulge.lengthMm).toBeCloseTo(50 * Math.PI, 0);
  });
  it("expands block insert base point, scaling, rotation and translation", () => {
    const blocks = `0\nBLOCK\n2\nedge\n70\n0\n10\n0\n20\n0\n${dxfLine}0\nENDBLK\n`;
    const g = analyzeDxf(
      dxf(
        "0\nINSERT\n2\nedge\n10\n5\n20\n10\n41\n2\n42\n2\n50\n90\n",
        4,
        blocks,
      ),
    );
    expect(g.lengthMm).toBeCloseTo(200);
    expect(g.bounds.width).toBeCloseTo(0);
    expect(g.bounds.height).toBeCloseTo(200);
  });
  it("flags unsupported entities even when the parser ignores them", () => {
    const g = analyzeDxf(dxf(`${dxfLine}0\nHATCH\n10\n0\n20\n0\n`));
    expect(g.warnings.some((w) => w.code === "unsupported-HATCH")).toBe(true);
  });
  it.each(["bad dxf", dxf(""), dxf(dxfLine).replace("EOF", "BROKEN")])(
    "rejects malformed and empty DXF",
    (content) => expect(() => analyzeDxf(content)).toThrow(),
  );
});
