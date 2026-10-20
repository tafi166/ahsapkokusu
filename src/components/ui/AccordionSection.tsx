import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Native <details>/<summary> accordion — matches the reference site's
 * product-page accordion (which also uses native <details>), and gets
 * keyboard support and screen-reader semantics for free.
 */
export function AccordionSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group border-b border-line py-4 [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between text-base">
        {title}
        <ChevronDown size={16} className="shrink-0 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="mt-3 text-sm leading-relaxed text-body/75">{children}</div>
    </details>
  );
}
