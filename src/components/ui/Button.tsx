import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

interface CommonProps {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
  isLoading?: boolean;
}

interface ButtonAsButton extends CommonProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  href?: undefined;
}

interface ButtonAsLink extends CommonProps {
  href: string;
  type?: undefined;
}

type ButtonProps = ButtonAsButton | ButtonAsLink;

// The hover colour fills in from the left behind the label (the ::before layer) rather than snapping.
const base =
  "relative isolate inline-flex items-center justify-center gap-2 overflow-hidden rounded-pill font-body font-medium uppercase tracking-[0.14em] transition-[color,background-color,border-color,transform] duration-500 ease-[var(--ease-premium)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink before:absolute before:inset-0 before:-z-10 before:origin-left before:scale-x-0 before:rounded-[inherit] before:transition-transform before:duration-500 before:ease-[var(--ease-premium)] hover:before:scale-x-100";

const variantClass: Record<Variant, string> = {
  primary: "bg-btn-bg text-btn-text border border-btn-bg hover:border-btn-bg-hover hover:text-btn-text-hover before:bg-btn-bg-hover",
  secondary: "bg-white text-ink border border-ink/15 hover:text-white hover:border-ink before:bg-ink",
  outline: "bg-transparent text-current border border-current hover:text-paper before:bg-ink hover:border-ink",
  ghost: "bg-transparent text-current hover:opacity-70 before:hidden",
};

const sizeClass: Record<Size, string> = {
  sm: "px-5 py-2.5 text-[11px]",
  md: "px-7 py-3.5 text-xs",
  lg: "px-9 py-4 text-[13px]",
};

/** Pill-shaped CTA button (100px radius matches the reference theme's --btnRadius). */
export function Button(props: ButtonProps) {
  const { variant = "primary", size = "md", children, className, isLoading, ...rest } = props;
  const classes = cn(base, variantClass[variant], sizeClass[size], className);

  if ("href" in props && props.href) {
    const { href } = props;
    return (
      <Link to={href} className={classes}>
        {children}
      </Link>
    );
  }

  const buttonRest = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button className={classes} {...buttonRest} disabled={isLoading || buttonRest.disabled}>
      {isLoading ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </button>
  );
}
