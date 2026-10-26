import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Container } from "@/components/ui/Container";

interface SectionProps {
  children: ReactNode;
  className?: string;
  containerSize?: "lg" | "md" | "sm";
  /** Background color scheme, named after the reference theme's section "schemes". */
  scheme?: "primary" | "secondary" | "tertiary";
  id?: string;
  /** A section opening with a breadcrumb right under the header or a banner: little space above it. */
  pageTop?: boolean;
}

const schemeClass = {
  primary: "grain bg-paper text-body",
  secondary: "grain bg-paper-soft text-body",
  tertiary: "bg-ink text-white",
} as const;

export function Section({ children, className, containerSize = "lg", scheme = "primary", id, pageTop = false }: SectionProps) {
  return (
    <section
      id={id}
      className={cn(pageTop ? "pb-16 pt-6 md:pb-24 md:pt-8 lg:pb-28" : "py-16 md:py-24 lg:py-28", schemeClass[scheme], className)}
    >
      <Container size={containerSize}>{children}</Container>
    </section>
  );
}
