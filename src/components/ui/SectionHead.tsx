import { cn } from "@/lib/cn";

interface SectionHeadProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
}

/**
 * Consistent section heading (eyebrow + title + subtitle) used across the
 * storefront so every section shares the same typography hierarchy and
 * spacing instead of each one reinventing it.
 */
export function SectionHead({ eyebrow, title, subtitle, className }: SectionHeadProps) {
  return (
    <div className={cn("max-w-lg", className)}>
      {eyebrow ? (
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-body/50">{eyebrow}</p>
      ) : null}
      <h2 className="mb-3 text-2xl font-heading text-ink tracking-tight sm:text-3xl">{title}</h2>
      {subtitle ? <p className="text-body/70">{subtitle}</p> : null}
    </div>
  );
}
