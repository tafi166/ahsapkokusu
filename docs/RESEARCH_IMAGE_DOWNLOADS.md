# Private image gallery and ZIP downloads

This feature extends Product Research Studio (base: feat/product-research-studio).
It does not activate Etsy, scrape shop pages, bypass CAPTCHA, or publish media.

## What works

ADMIN users open Araştırma Stüdyosu → Görsel İndir, enter a source reference,
record ownership/authorization and an optional permission end date, and explicitly
confirm permission to upload and download. These are USER DECLARATIONS, not
independently verified rights or commercial publication licenses.

The Etsy link checker parses supported shop/listing URLs locally. It reports that
remote acquisition is unavailable because an approved, terms-compliant provider
has not been connected. No network request is made to the source URL. A future
provider must separately establish platform access and permitted retention/export.

Users can upload authorized original JPEG/PNG/WebP files from Android's file picker,
group them by product name, preview, select and prepare a ZIP. Files with duplicate
content in a gallery are not stored twice. Original bytes are retained; file type
and dimensions are inspected (not an image-repair or full-decoding service).

ZIPs contain product-named directories, safe generated file names and kaynaklar.json
with original names, source references, hashes, timestamps and permission declarations.
No CSV formulas or user-controlled archive paths are emitted. Commercial permission
is explicitly not granted by this workflow.

## Privacy and persistence

All routes are under /api/admin/research/images, protected by the existing ADMIN
role/session guard; writes require Origin and CSRF. Research must be enabled.
Files live outside the public media tree at UPLOAD_DIR/research-images, mode 0600.
Previews and downloads use authenticated no-store responses and re-check permission
on every request. These files never enter Media, Product, /api/site or the sitemap.
No credentials or images are stored in browser localStorage.

The private download link is an ordinary attachment response, usable with Android
browsers. It expires with the DB job and is not a public bearer URL. Gallery IDs
are kept in query parameters so reload restores the view.

## Jobs, limits and cleanup

- 5 MB/file, also bounded by MEDIA_MAX_BYTES; JPEG/PNG/WebP only.
- Maximum 40 megapixels and 16000px per dimension; 50 files/gallery.
- Maximum 50 selected files and 50 MB of source bytes/ZIP.
- Global 1 GiB image-storage quota, 500 galleries, 50 unexpired ZIP jobs.
- Images expire after 7 days, ZIPs after 24 hours. Permission can expire earlier.
- Permission revocation immediately blocks new uploads, previews and downloads,
  including already prepared ZIPs; it does not revoke copies already downloaded.

The database-backed queue runs on an enabled API process, independent of the tab.
A conditional DB claim selects a single worker for each queued job. Each worker
handles one ZIP at a time. Compression has a 60-second timeout. Cancelling changes
the job immediately; a running build is discarded after its bounded operation ends.
A RUNNING job interrupted for over 10 minutes is marked failed, with a retry action.
QUEUED jobs survive process restarts. No Redis or public download bucket is required.

Cleanup runs while the enabled API process is running; stopped/disabled instances
must resume before expired disk files are physically removed. Expiry checks prevent
access even before cleanup. Database and private storage need coordinated backups.
The PostgreSQL storage-quota advisory lock serializes upload admission.

## Browser-managed rollout after approval

Review this PR separately from the underlying Studio PR. In an approved staging
release, apply all committed Prisma migrations and install locked server packages.
Use persistent UPLOAD_DIR storage outside the web root and RESEARCH_ENABLED=true.
Set the host's request body limit to match the 5 MB upload limit. No new Etsy or AI
secret is needed for the local-file workflow. Codex handles server operations;
the owner does not need an Android terminal. No merge or deployment is automatic.

## Validation

Eight API integration tests exercise permissions/CSRF, original-byte persistence,
deduplication, real ZIP content and manifest, safe archive names, revoked/expired
permissions, validation, cancellation, cleanup and honest unavailable-provider state.
Four UI tests cover declaration gating, unavailable Etsy import, selection/queueing,
revocation and original-file upload. Full frontend/server results are in the PR.

Touch-enabled Chromium also exercised login, declaration, file upload, decoded
preview, selection, queue completion, reload and actual attachment download.
The downloaded ZIP was opened and its image bytes matched the original. Revocation
removed the download action. No document overflow at 375/768/1280px. This was browser
emulation rather than a physical Android device. No live Etsy shop was scraped.

Final validation: production frontend build and server typecheck passed; 163
frontend and 182 server tests passed (server uses the documented SWC WASM mode).
All nine committed migrations were applied to the isolated development/test
PostgreSQL only. Lint passed with existing repository warnings. No production
migration, publication or merge was performed.
