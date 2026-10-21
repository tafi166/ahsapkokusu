import { useState, type FormEvent } from "react";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { brand } from "@/config/brand";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/I18nProvider";

type Status = "idle" | "loading" | "success" | "error";

export function ContactPage() {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<Status>("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    const result = await api.submitContactForm(form, t.api);
    setStatus(result.ok ? "success" : "error");
    setFeedback(result.message);
    if (result.ok) setForm({ name: "", email: "", message: "" });
  }

  return (
    <Section containerSize="sm">
      <div className="mx-auto max-w-xl">
        <h1>{t.contact.title}</h1>
        <p className="mt-3 text-body/70">
          {t.contact.introBefore}{" "}
          <a href={`mailto:${brand.contact.email}`} className="underline">
            {brand.contact.email}
          </a>
          {t.contact.introAfter}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm">
              {t.forms.name}
            </label>
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
            <label htmlFor="email" className="mb-1.5 block text-sm">
              {t.forms.email}
            </label>
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
            <label htmlFor="message" className="mb-1.5 block text-sm">
              {t.contact.message}
            </label>
            <textarea
              id="message"
              required
              rows={5}
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              disabled={status === "loading"}
              className="w-full rounded-input border border-line px-4 py-3 text-sm outline-none focus:border-ink disabled:opacity-60"
            />
          </div>

          <Button type="submit" size="lg" isLoading={status === "loading"} className="w-full">
            {t.contact.submit}
          </Button>

          {feedback ? (
            <p role="status" className={cn("text-sm", status === "success" ? "text-success" : "text-danger")}>
              {feedback}
            </p>
          ) : null}
        </form>
      </div>
    </Section>
  );
}
