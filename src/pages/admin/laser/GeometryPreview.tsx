import { useRef, useState } from "react";
import { AdminButton, Checkbox } from "../controls";
import type { EstimateInput, Geometry, Operation } from "./types";
import { tokens } from "@/config/tokens";
import { operationLabels } from "./defaults";
const colors: Record<Operation, string> = {
  cut: tokens.color.accentDeep,
  score: tokens.color.wood,
  line: tokens.color.success,
  fill: tokens.color.ink,
  ignore: tokens.color.divider,
};
export function GeometryPreview({
  geometry,
  assignments,
}: {
  geometry: Geometry;
  assignments: EstimateInput["assignments"];
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [grid, setGrid] = useState(true);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null,
  );
  const b = geometry.bounds,
    pad = Math.max(b.width, b.height, 10) * 0.1;
  const width = (b.width + 2 * pad) / zoom,
    height = (b.height + 2 * pad) / zoom;
  const view = {
    x: b.x + b.width / 2 - width / 2 + pan.x,
    y: b.y + b.height / 2 - height / 2 + pan.y,
  };
  const step =
    10 ** Math.floor(Math.log10(Math.max(b.width, b.height, 10) / 10));
  return (
    <section className="laser-card space-y-4" aria-label="Çizim önizlemesi">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Ölçülen geometri</h3>
          <p className="text-sm text-body">
            {b.width.toFixed(2)} × {b.height.toFixed(2)} mm
            {!geometry.scaleConfirmed ? " · Ölçek doğrulanmalı" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <AdminButton
            variant="outline"
            aria-label="Uzaklaştır"
            onClick={() => setZoom((z) => Math.max(0.25, z / 1.5))}
          >
            −
          </AdminButton>
          <AdminButton
            variant="outline"
            aria-label="Yakınlaştır"
            onClick={() => setZoom((z) => Math.min(30, z * 1.5))}
          >
            +
          </AdminButton>
          <AdminButton
            variant="outline"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            Sığdır
          </AdminButton>
        </div>
      </div>
      <svg
        role="img"
        aria-label="Sunucuda ölçülen vektör yolları; sürükleyerek kaydırın"
        className="h-[360px] w-full touch-none rounded-lg border border-line bg-paper"
        viewBox={`${view.x} ${view.y} ${width} ${height}`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const r = e.currentTarget.getBoundingClientRect(),
            ratio = Math.max(width / r.width, height / r.height);
          setPan({
            x: drag.current.px - (e.clientX - drag.current.x) * ratio,
            y: drag.current.py - (e.clientY - drag.current.y) * ratio,
          });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <defs>
          <pattern
            id="laser-grid"
            width={step}
            height={step}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${step} 0 L 0 0 0 ${step}`}
              fill="none"
              stroke={tokens.color.line}
              strokeWidth={0.5}
              vectorEffect="non-scaling-stroke"
            />
          </pattern>
        </defs>
        {grid && (
          <rect
            x={view.x}
            y={view.y}
            width={width}
            height={height}
            fill="url(#laser-grid)"
          />
        )}
        {geometry.paths.map((p) => (
          <polyline
            key={p.id}
            points={p.points.map((q) => `${q.x},${q.y}`).join(" ")}
            fill="none"
            stroke={colors[assignments[p.layer]?.operation ?? "cut"]}
            strokeWidth={1.6}
            vectorEffect="non-scaling-stroke"
            strokeDasharray={p.closed ? undefined : "5 3"}
          >
            <title>
              {p.layer} · {p.lengthMm.toFixed(2)} mm ·{" "}
              {p.closed ? "Kapalı" : "Açık"}
            </title>
          </polyline>
        ))}
      </svg>
      <div className="flex flex-wrap gap-4 text-xs">
        <Checkbox label="Izgara" checked={grid} onChange={setGrid} />
        {Object.entries(colors).map(([op, color]) => (
          <span key={op} className="flex items-center gap-1">
            <span
              style={{ background: color }}
              className="inline-block h-2 w-3"
            />
            {operationLabels[op as Operation]}
          </span>
        ))}
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        {[
          ["Toplam yol", `${geometry.lengthMm.toFixed(2)} mm`],
          ["Kontur", `${geometry.closed} kapalı · ${geometry.open} açık`],
          ["Delik adayı", geometry.holes],
          ["Başlangıç", geometry.starts],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-body">{label}</dt>
            <dd className="mt-1 font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      {geometry.warnings.length > 0 && (
        <ul
          className="space-y-2 text-sm text-wood-deep"
          aria-label="Geometri uyarıları"
        >
          {geometry.warnings.map((w) => (
            <li key={w.code}>
              {w.review ? "İnceleme gerekli: " : "Bilgi: "}
              {w.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
