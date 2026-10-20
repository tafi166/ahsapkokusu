import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface ContainerProps {
  children: ReactNode;
  /** Matches the reference theme's three real container widths (1760/1400/1280px). */
  size?: "lg" | "md" | "sm";
  className?: string;
  as?: "div" | "section";
}

const sizeClass = {
  lg: "container-lg",
  md: "container-md",
  sm: "container-sm",
} as const;

export function Container({ children, size = "lg", className, as = "div" }: ContainerProps) {
  const Tag = as;
  return <Tag className={cn("mx-auto w-full px-4 md:px-8", sizeClass[size], className)}>{children}</Tag>;
}
