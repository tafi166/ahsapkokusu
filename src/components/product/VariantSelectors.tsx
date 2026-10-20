import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import type { ProductVariantOptions, VariantSelection } from "@/types";

const swatchColor: Record<string, string> = {
  Doğal: "#c9a876",
  Ceviz: "#8a6a4b",
  "Koyu Ceviz": "#5c4632",
  Siyah: "#1a1a1a",
  Beyaz: "#f5f5f5",
  Gri: "#8a8a8a",
  "Mavi Tonlu Lake": "#4a6b7a",
  "Karışık Tonlar": "#7a6350",
};

function ChipGroup({
  label,
  options,
  value,
  onSelect,
}: {
  label: string;
  options: (string | number)[];
  value?: string | number;
  onSelect: (v: string | number) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">
        {label}
        {value ? `: ${value}` : ""}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            aria-pressed={value === opt}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition-colors",
              value === opt ? "border-ink bg-ink text-white" : "border-line hover:border-ink",
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function VariantSelectors({
  variants,
  onChange,
}: {
  variants: ProductVariantOptions;
  onChange: (selection: VariantSelection) => void;
}) {
  const [size, setSize] = useState<string | undefined>(variants.sizes?.[0]);
  const [width, setWidth] = useState<string | undefined>(variants.widths?.[0]);
  const [layerCount, setLayerCount] = useState<number | undefined>(variants.layerCounts?.[0]);
  const [color, setColor] = useState<string | undefined>(variants.colors?.[0]);
  const [finish, setFinish] = useState<string | undefined>(variants.finishes?.[0]);
  const [frame, setFrame] = useState<string | undefined>(variants.frames?.[0]);
  const [height, setHeight] = useState<number | undefined>(variants.heightRange ? variants.heightRange[0] : undefined);

  useEffect(() => {
    const isComplete =
      (!variants.sizes || Boolean(size)) &&
      (!variants.widths || Boolean(width)) &&
      (!variants.layerCounts || typeof layerCount === "number") &&
      (!variants.colors || Boolean(color)) &&
      (!variants.finishes || Boolean(finish)) &&
      (!variants.frames || Boolean(frame)) &&
      (!variants.heightRange || typeof height === "number");
    onChange({ size, width, layerCount, color, finish, frame, height, isComplete });
    // `onChange` is expected to be stable (useCallback) in the parent — only the actual selection should re-sync.
  }, [size, width, layerCount, color, finish, frame, height, variants, onChange]);

  return (
    <div className="space-y-6">
      {variants.sizes ? <ChipGroup label="Boyut" options={variants.sizes} value={size} onSelect={(v) => setSize(String(v))} /> : null}
      {variants.widths ? <ChipGroup label="Genişlik" options={variants.widths} value={width} onSelect={(v) => setWidth(String(v))} /> : null}
      {variants.layerCounts ? (
        <ChipGroup
          label="Katman Sayısı"
          options={variants.layerCounts}
          value={layerCount}
          onSelect={(v) => setLayerCount(Number(v))}
        />
      ) : null}

      {variants.colors ? (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Renk{color ? `: ${color}` : ""}</legend>
          <div className="flex flex-wrap gap-3">
            {variants.colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-pressed={color === c}
                aria-label={c}
                title={c}
                className={cn(
                  "h-9 w-9 rounded-full border-2 transition-transform",
                  color === c ? "scale-110 border-ink" : "border-transparent hover:scale-105",
                )}
                style={{ backgroundColor: swatchColor[c] ?? "#999999" }}
              />
            ))}
          </div>
        </fieldset>
      ) : null}

      {variants.finishes ? (
        <ChipGroup label="Yüzey İşlemi" options={variants.finishes} value={finish} onSelect={(v) => setFinish(String(v))} />
      ) : null}
      {variants.frames ? <ChipGroup label="Çerçeve" options={variants.frames} value={frame} onSelect={(v) => setFrame(String(v))} /> : null}

      {variants.heightRange ? (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">
            Yükseklik: {height} cm (aralık {variants.heightRange[0]}–{variants.heightRange[1]} cm)
          </legend>
          <input
            type="range"
            min={variants.heightRange[0]}
            max={variants.heightRange[1]}
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            className="w-full accent-black"
            aria-label="Yükseklik (cm)"
          />
        </fieldset>
      ) : null}
    </div>
  );
}
