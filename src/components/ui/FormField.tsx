import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const inputClass =
  "w-full rounded-input border px-4 py-3 text-sm outline-none focus:border-ink disabled:opacity-60";

export function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="mt-1 text-xs text-body/60">{hint}</p> : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Props shared by every input: error styling and the aria link to the message. */
export function fieldProps(id: string, error?: string) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
    className: cn(inputClass, error ? "border-danger" : "border-line"),
  };
}
