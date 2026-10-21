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
  primary: "bg-paper text-body",
  secondary: "bg-paper-soft text-body",
  tertiary: "bg-ink text-white",
} as const;

export function Section({ children, className, containerSize = "lg", scheme = "primary", id, pageTop = false }: SectionProps) {
  return (
    <section
      id={id}
      className={cn(pageTop ? "pb-14 pt-6 md:pb-20 md:pt-8 lg:pb-24" : "py-14 md:py-20 lg:py-24", schemeClass[scheme], className)}
    >
      <Container size={containerSize}>{children}</Container>
    </section>
  );
}
