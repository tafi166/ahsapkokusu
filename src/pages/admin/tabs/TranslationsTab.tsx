import { useMemo, useState } from "react";
import { translationsFor } from "@/i18n/content";
import { loadOverrides } from "@/lib/adminStore";
import { adminApi } from "@/lib/adminApi";
import { runSave } from "@/pages/admin/saving";
import { AdminButton, Checkbox, SavedBanner, SectionCard, TextArea, TextInput } from "@/pages/admin/controls";
import { buildBlock, rowId, rowValues, TRANSLATION_BLOCKS, type TranslationRow } from "@/pages/admin/translationRows";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * English translations of the site content, one block at a time: the Turkish
 * text on the left, its English version on the right. A blank English field
 * shows the Turkish text on the English site. Turkish content itself is edited
 * in the other tabs; prices, images and links are shared and not translated.
 */
export function TranslationsTab() {
  const [blockKey, setBlockKey] = useState(TRANSLATION_BLOCKS[0]!.key);
  const block = TRANSLATION_BLOCKS.find((b) => b.key === blockKey)!;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">İngilizce</h2>
        <p className="text-sm text-black/55">
          İngilizce sitenin (<a href="/en" className="underline">/en</a>) metinleri. Boş bırakılan alanlarda İngilizce sitede Türkçe metin görünür.
          Türkçe metinler, fiyatlar, görseller ve bağlantılar diğer sekmelerden düzenlenir ve iki dilde ortaktır.
        </p>
      </div>

      <label className="block max-w-xs">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-black/55">Bölüm</span>
        <select
          value={blockKey}
          onChange={(e) => setBlockKey(e.target.value as typeof blockKey)}
          className="w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm"
        >
          {TRANSLATION_BLOCKS.map((b) => (
            <option key={b.key} value={b.key}>
              {b.title}
            </option>
          ))}
        </select>
      </label>

      {/* Keyed by block so switching sections starts from that block's stored text. */}
      <BlockEditor key={block.key} blockKey={block.key} title={block.title} rows={block.rows()} />
    </div>
  );
}

function BlockEditor({
  blockKey,
  title,
  rows,
}: {
  blockKey: (typeof TRANSLATION_BLOCKS)[number]["key"];
  title: string;
  rows: TranslationRow[];
}) {
  const isSaved = loadOverrides().translations?.en?.[blockKey] !== undefined;
  const [values, setValues] = useState(() => rowValues(rows, translationsFor("en")[blockKey]));
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const invalidSlugs = rows.filter((r) => r.slug && values[rowId(r)]?.trim() && !SLUG.test(values[rowId(r)]!.trim()));
  const missing = rows.filter((r) => r.source.trim() && !values[rowId(r)]?.trim()).length;
  const visible = onlyMissing ? rows.filter((r) => !values[rowId(r)]?.trim()) : rows;
  const groups = useMemo(() => {
    const byGroup = new Map<string, TranslationRow[]>();
    for (const row of visible) byGroup.set(row.group, [...(byGroup.get(row.group) ?? []), row]);
    return [...byGroup];
  }, [visible]);

  function set(row: TranslationRow, value: string) {
    setValues((v) => ({ ...v, [rowId(row)]: value }));
    setSaved(false);
  }

  function handleSave() {
    void runSave(() => adminApi.saveTranslation("en", blockKey, buildBlock(rows, values) as never), setSaved, setSaveError);
  }

  function handleReset() {
    if (!window.confirm(`"${title}" bölümünün kaydedilmiş İngilizce metinleri silinip yerleşik taslağa dönülsün mü?`)) return;
    void runSave(() => adminApi.resetTranslation("en", blockKey), setSaved, setSaveError);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 text-sm text-black/60">
        <span>{isSaved ? "Kaydedilmiş çeviri" : "Yerleşik taslak (henüz kaydedilmedi)"}</span>
        <span>{missing === 0 ? "Tüm alanlar çevrili" : `${missing} alan çevrilmemiş`}</span>
        <Checkbox label="Yalnızca çevrilmemişleri göster" checked={onlyMissing} onChange={setOnlyMissing} />
      </div>

      {groups.length === 0 ? <p className="text-sm text-black/50">Bu bölümde çevrilmemiş alan yok.</p> : null}
      {groups.map(([group, groupRows]) => (
        <SectionCard key={group} title={group}>
          {groupRows.map((row) => {
            const id = rowId(row);
            const inputId = `tr-${blockKey}-${id}`;
            const invalid = invalidSlugs.includes(row);
            const inputProps = {
              id: inputId,
              lang: "en",
              value: values[id] ?? "",
              placeholder: row.slug ? row.source : undefined,
              "aria-invalid": invalid || undefined,
            };
            return (
              <div key={id} className="grid gap-2 md:grid-cols-2 md:gap-4">
                <div>
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-black/55">{row.label} · Türkçe</span>
                  <p lang="tr" className="whitespace-pre-line text-sm text-black/70">
                    {row.source || "—"}
                  </p>
                </div>
                <div>
                  <label htmlFor={inputId} className="mb-1 block text-xs font-medium uppercase tracking-wide text-black/55">
                    {row.label} · İngilizce
                  </label>
                  {row.multiline ? (
                    <TextArea {...inputProps} rows={3} onChange={(e) => set(row, e.target.value)} />
                  ) : (
                    <TextInput {...inputProps} onChange={(e) => set(row, e.target.value)} />
                  )}
                  {invalid ? <span className="mt-1 block text-xs text-red-700">Yalnızca küçük harf, rakam ve tire.</span> : null}
                </div>
              </div>
            );
          })}
        </SectionCard>
      ))}

      <div className="flex flex-wrap items-center gap-3 border-t border-black/10 pt-4">
        <AdminButton onClick={handleSave} disabled={invalidSlugs.length > 0}>
          Kaydet
        </AdminButton>
        {isSaved ? (
          <AdminButton variant="outline" onClick={handleReset}>
            Taslağa Dön
          </AdminButton>
        ) : null}
        <SavedBanner show={saved} error={saveError} onReload={() => window.location.reload()} />
      </div>
    </div>
  );
}
