import "@/styles/globals.css";
import { setServerOverrides } from "@/lib/adminStore";
import { fetchSiteSnapshot } from "@/lib/siteData";

async function start() {
  const site = await fetchSiteSnapshot();
  if (site) setServerOverrides(site);
  // Imported only now: the data modules read the overrides when they are first evaluated.
  const { renderApp } = await import("@/bootstrap");
  renderApp();
}

void start();
