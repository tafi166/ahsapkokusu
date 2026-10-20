import { useState, type FormEvent } from "react";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { categories } from "@/data/categories";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { CategorySlug } from "@/types";

type Status = "idle" | "loading" | "success" | "error";

export function CustomDesignPage() {
  const [form, setForm] = useState({ name: "", email: "", category: categories[0].slug, message: "" });
  const [status, setStatus] = useState<Status>("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    const result = await api.submitContactForm({ name: form.name, email: form.email, message: form.message });
    setStatus(result.ok ? "success" : "error");
    setFeedback(
      result.ok
        ? "Talebiniz alındı — tasarım ekibimiz 1-2 iş günü içinde sizinle iletişime geçecek."
        : result.message,
    );
    if (result.ok) setForm({ name: "", email: "", category: categories[0].slug, message: "" });
  }

  return (
    <Section containerSize="sm">
      <div className="mx-auto max-w-xl">
        <p className="text-xs uppercase tracking-wide text-body/50">Özel Tasarım</p>
        <h1 className="mt-1">Mekanınıza Özel Tasarım Talep Edin</h1>
        <p className="mt-3 text-body/70">
          Kendi fotoğrafınızdan bir portre, markanıza özel bir logo panosu ya da tamamen size özgü bir
          kompozisyon — isteğinizi bize iletin, birlikte tasarlayalım.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm">Ad Soyad</label>
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
            <label htmlFor="email" className="mb-1.5 block text-sm">E-posta</label>
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
            <label htmlFor="category" className="mb-1.5 block text-sm">İlgilendiğiniz Kategori</label>
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
            <label htmlFor="message" className="mb-1.5 block text-sm">Tasarım Talebiniz</label>
            <textarea
              id="message"
              required
              rows={5}
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              disabled={status === "loading"}
              placeholder="Ölçü, malzeme, ilham aldığınız görsel/fikir..."
              className="w-full rounded-input border border-line px-4 py-3 text-sm outline-none focus:border-ink disabled:opacity-60"
            />
          </div>

          <Button type="submit" size="lg" isLoading={status === "loading"} className="w-full">
            Talebi Gönder
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
