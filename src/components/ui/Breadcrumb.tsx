import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-body/60">
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="flex items-center gap-1.5">
          {i > 0 ? <ChevronRight size={14} className="text-body/30" aria-hidden="true" /> : null}
          {item.href ? (
            <Link to={item.href} className="hover:text-ink hover:underline">
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="text-body">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
