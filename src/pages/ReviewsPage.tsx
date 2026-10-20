import { Section } from "@/components/ui/Section";
import { StarRating } from "@/components/ui/StarRating";
import { testimonials } from "@/data/testimonials";

export function ReviewsPage() {
  return (
    <Section>
      <h1 className="mb-10">Yorumlar</h1>
      <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        {testimonials.map((t) => (
          <li key={t.id} className="rounded-card border border-line p-6">
            <StarRating rating={t.rating} className="mb-4" />
            <p className="text-body/80">“{t.quote}”</p>
            <p className="mt-4 text-sm text-body/50">
              {t.authorInitial} — {t.role}
            </p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
