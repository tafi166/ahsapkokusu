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

const base =
  "inline-flex items-center justify-center gap-2 rounded-pill font-body font-medium tracking-wide transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

const variantClass: Record<Variant, string> = {
  primary: "bg-btn-bg text-btn-text hover:bg-btn-bg-hover hover:text-btn-text-hover border border-btn-bg",
  secondary: "bg-white text-ink border border-ink hover:bg-ink hover:text-white",
  outline: "bg-transparent text-current border border-current hover:bg-current/10",
  ghost: "bg-transparent text-current hover:opacity-70",
};

const sizeClass: Record<Size, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-4 text-base",
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
    <button className={classes} disabled={isLoading || buttonRest.disabled} {...buttonRest}>
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
