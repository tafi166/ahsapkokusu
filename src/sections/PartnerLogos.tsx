import { useReducedMotion } from "framer-motion";
import { homeContent } from "@/config/content";
import { partnerLogos } from "@/data/trustSignals";
import { Container } from "@/components/ui/Container";

const { partnerLogos: copy } = homeContent;

/** Infinite CSS marquee (pauses entirely for prefers-reduced-motion); the keyframes are in globals.css. */
export function PartnerLogos() {
  const prefersReducedMotion = useReducedMotion();
  const track = [...partnerLogos, ...partnerLogos];

  return (
    <section className="grain border-y border-line py-14">
      <Container size="lg">
        <p className="mb-10 text-center text-xs uppercase tracking-[0.28em] text-body/50">{copy.title}</p>
      </Container>

      <div className="overflow-hidden">
        <div
          className="flex w-max gap-16 whitespace-nowrap hover:[animation-play-state:paused]"
          style={{
            animation: prefersReducedMotion ? "none" : "marquee 28s linear infinite",
          }}
        >
          {track.map((name, i) => (
            <span key={`${name}-${i}`} className="font-heading text-2xl italic text-body/40 transition-colors duration-500 hover:text-ink">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
