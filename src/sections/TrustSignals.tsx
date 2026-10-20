import { motion } from "framer-motion";
import { Hammer, Truck, CreditCard, Star } from "lucide-react";
import { homeContent } from "@/config/content";
import { trustSignals } from "@/data/trustSignals";
import { Section } from "@/components/ui/Section";
import { staggerContainer, fadeUp, viewportOnce } from "@/lib/motion";
import type { TrustSignal } from "@/types";

const iconMap: Record<TrustSignal["icon"], typeof Hammer> = {
  craft: Hammer,
  shipping: Truck,
  payments: CreditCard,
  reviews: Star,
};

export function TrustSignals() {
  return (
    <Section>
      <h2 className="mb-10 text-center">{homeContent.trustSignals.title}</h2>
      <motion.ul
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={staggerContainer(0.1)}
        className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4"
      >
        {trustSignals.map((signal) => {
          const Icon = iconMap[signal.icon];
          return (
            <motion.li key={signal.id} variants={fadeUp} className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-line">
                <Icon size={22} aria-hidden="true" />
              </div>
              <h3 className="text-base">{signal.title}</h3>
              <p className="mt-2 text-sm text-body/70">{signal.description}</p>
            </motion.li>
          );
        })}
      </motion.ul>
    </Section>
  );
}
