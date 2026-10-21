import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/I18nProvider";

type Status = "idle" | "loading" | "success" | "error";

export function NewsletterForm({ placeholder, ctaLabel, className, buttonVariant = "primary" }: {
  placeholder: string;
  ctaLabel: string;
  className?: string;
  buttonVariant?: "primary" | "secondary";
}) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    const result = await api.subscribeToNewsletter(email);
    setStatus(result.ok ? "success" : "error");
    setMessage(result.message);
    if (result.ok) setEmail("");
  }

  return (
    <form onSubmit={handleSubmit} className={cn("w-full", className)} noValidate>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="newsletter-email" className="sr-only">
          {t.a11y.newsletterEmail}
        </label>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          disabled={status === "loading"}
          className="flex-1 rounded-input border border-line bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-ink disabled:opacity-60"
        />
        <Button type="submit" variant={buttonVariant} isLoading={status === "loading"} className="shrink-0">
          {ctaLabel}
        </Button>
      </div>
      {message ? (
        <p
          role="status"
          className={cn("mt-3 text-sm", status === "success" ? "text-success" : "text-danger")}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
