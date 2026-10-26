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
    <div className={cn("max-w-xl", className)}>
      {eyebrow ? <p className="eyebrow mb-4 text-body/60">{eyebrow}</p> : null}
      <h2 className="text-ink">{title}</h2>
      {subtitle ? <p className="mt-4 text-body/70">{subtitle}</p> : null}
    </div>
  );
}
