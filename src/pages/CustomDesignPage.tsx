import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { CncQuoteForm } from "@/components/cnc/CncQuoteForm";
import { categories } from "@/data/categories";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/I18nProvider";
import type { CategorySlug } from "@/types";

type Status = "idle" | "loading" | "success" | "error";

const TABS = ["fikir", "dosya"] as const;
type TabKey = (typeof TABS)[number];

export function CustomDesignPage() {
  const { t } = useI18n();
  const tabLabel: Record<TabKey, string> = { fikir: t.customDesign.tabIdea, dosya: t.customDesign.tabFile };
  const [params, setParams] = useSearchParams();
  const active: TabKey = params.get("sekme") === "dosya" ? "dosya" : "fikir";

  function select(key: TabKey) {
    setParams(key === "fikir" ? {} : { sekme: key }, { replace: true });
  }

  // Arrow keys move between tabs (WAI-ARIA tabs pattern).
  function onTabKey(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = TABS.indexOf(active);
    const next = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
    select(next);
    document.getElementById(`tab-${next}`)?.focus();
  }

  return (
    <Section containerSize="sm">
      <div className="mx-auto max-w-xl">
        <p className="text-xs uppercase tracking-wide text-body/50">{t.customDesign.eyebrow}</p>
        <h1 className="mt-1">{t.customDesign.title}</h1>
        <p className="mt-3 text-body/70">{t.customDesign.intro}</p>

        <div role="tablist" aria-label={t.customDesign.tabs} className="mt-8 flex gap-1 border-b border-line">
          {TABS.map((key) => (
            <button
              key={key}
              id={`tab-${key}`}
              role="tab"
              type="button"
              aria-selected={active === key}
              aria-controls={`panel-${key}`}
              tabIndex={active === key ? 0 : -1}
              onClick={() => select(key)}
              onKeyDown={onTabKey}
              className={cn(
                "-mb-px border-b-2 px-4 py-2.5 text-sm transition-colors",
                active === key ? "border-ink font-medium text-ink" : "border-transparent text-body/60 hover:text-ink",
              )}
            >
              {tabLabel[key]}
            </button>
          ))}
        </div>

        <div id={`panel-${active}`} role="tabpanel" aria-labelledby={`tab-${active}`} className="mt-8">
          {active === "fikir" ? <IdeaForm /> : <CncQuoteForm />}
        </div>
      </div>
    </Section>
  );
}

/** The original free-text design request. */
function IdeaForm() {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: "", email: "", category: categories[0].slug, message: "" });
  const [status, setStatus] = useState<Status>("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    const result = await api.sendMessage(
      { kind: "DESIGN", name: form.name, email: form.email, message: form.message, categorySlug: form.category },
      t.api,
    );
    setStatus(result.ok ? "success" : "error");
    setFeedback(result.message);
    if (result.ok) setForm({ name: "", email: "", category: categories[0].slug, message: "" });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm">{t.forms.name}</label>
        <input
          id="name"
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          disabled={status === "loading"}
          className="w-full rounded-input border border-line px-4 py-3 text-sm outline-none focus:border-ink disabled:opacity-60"
        />
      </div>
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm">{t.forms.email}</label>
        <input
          id="email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          disabled={status === "loading"}
          className="w-full rounded-input border border-line px-4 py-3 text-sm outline-none focus:border-ink disabled:opacity-60"
        />
      </div>
      <div>
        <label htmlFor="category" className="mb-1.5 block text-sm">{t.customDesign.category}</label>
        <select
          id="category"
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as CategorySlug }))}
          disabled={status === "loading"}
          className="w-full rounded-input border border-line bg-white px-4 py-3 text-sm outline-none focus:border-ink disabled:opacity-60"
        >
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>{c.title}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="message" className="mb-1.5 block text-sm">{t.customDesign.request}</label>
        <textarea
          id="message"
          required
          rows={5}
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          disabled={status === "loading"}
          placeholder={t.customDesign.requestPlaceholder}
          className="w-full rounded-input border border-line px-4 py-3 text-sm outline-none focus:border-ink disabled:opacity-60"
        />
      </div>

      <Button type="submit" size="lg" isLoading={status === "loading"} className="w-full">
        {t.customDesign.submit}
      </Button>

      {feedback ? (
        <p role="status" className={cn("text-sm", status === "success" ? "text-success" : "text-danger")}>
          {feedback}
        </p>
      ) : null}
    </form>
  );
}
