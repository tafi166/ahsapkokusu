import { Section } from "@/components/ui/Section";
import { StarRating } from "@/components/ui/StarRating";
import { testimonials } from "@/data/testimonials";
import { useI18n } from "@/i18n/I18nProvider";

export function ReviewsPage() {
  const { t } = useI18n();
  return (
    <Section>
      <h1 className="mb-10">{t.pages.reviewsTitle}</h1>
      <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        {testimonials.map((review) => (
          <li key={review.id} className="rounded-card border border-line p-6">
            <StarRating rating={review.rating} className="mb-4" />
            <p className="text-body/80">“{review.quote}”</p>
            <p className="mt-4 text-sm text-body/50">
              {review.authorInitial} — {review.role}
            </p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
