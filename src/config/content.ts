/**
 * Homepage copy — original placeholder content for the parametric-wood-art
 * brand pivot. Swap freely; this is the single place page copy lives.
 *
 * Both exports below are overridable from the admin panel (`/admin` → Ana
 * Sayfa) — see `lib/adminStore.ts`.
 */
import { applyOverride, loadOverrides, mergeShallowNested } from "@/lib/adminStore";
import { defaultAnnouncementMessages, defaultHomeContent, type HomeContent } from "@/config/contentDefaults";
import { contentTranslations, localizeHomeContent, localizeStrings } from "@/i18n/content";

export type { HomeContent };

export const announcementMessages: string[] = localizeStrings(
  applyOverride(defaultAnnouncementMessages, loadOverrides().announcementMessages),
  contentTranslations().announcementMessages,
);

// Shallow-merged per section (not full-replace) — see `mergeShallowNested`'s
// doc comment: an override saved before a section gained a field (as
// `hero` did with `images`) must not erase that field on later loads.
export const homeContent: HomeContent = localizeHomeContent(mergeShallowNested(defaultHomeContent, loadOverrides().homeContent));
