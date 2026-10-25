# Product-row image attachment

Products now have an ADMIN-only “Etsy / Galeriden görsel ekle” action. Entering an
Etsy URL finds an already stored, authorized private gallery with that exact source
URL. Alternatively select a gallery directly. Selected originals are copied by the
server into public Media and attached to that single saved product. No ZIP download
or browser re-upload is needed. Editor accounts retain the original image uploader.

## Important availability boundary

New image acquisition directly from Etsy is still unavailable. The link checker
never fetches a shop page or circumvents platform controls. The panel states this
before the link field and reports unavailable access for URLs without a stored
gallery. This PR implements the direct product-attachment path, not an Etsy scraper
or a claim that pending API approval has been resolved.

## Explicit publication review

The operator must record evidence/reference details, affirm that they reviewed the
commercial-publication right for this store and confirm a permanent usage right.
A private research/download permission alone does not satisfy this requirement.
The application records the administrator's review; it cannot independently prove
ownership or license validity. Do not use this path for time-limited publication
licenses: the current public-media route has immutable caching.

ResearchProductImageGrant privately retains source URL, original hash/image ID,
public media ID, product ID, review evidence, reviewer and date. These snapshots
survive private-gallery retention. No private research URL or evidence is added to
the public catalog. Only the separate /api/media URLs are published.

Research revocation/expiry blocks new attachments. Already published copies are
independent of the private gallery: later research revocation/cleanup does not
remove them or recall downloaded/cached copies. Manage public-product photos
through the normal product editor when they need removal.

## Safe single-product write

GET /api/admin/research/images/products/:id/state returns the exact database revision
and current image state. POST .../:id/attach checks that revision under a product
row lock, checks source permission under gallery locks, verifies source hashes,
copies media and updates only the target product's image fields/date. Audit and
permission records commit with the update; newly copied files are removed on a
rejected transaction. There is no call to the legacy full-catalog replacement API.

Existing uploaded images are retained; color placeholders are removed. Same-hash
images already in that product are reused. The product limit is 12 images. The old
cover remains unless the administrator explicitly chooses the first selected image
as cover. Other product fields and other products are unchanged.

New unsaved products must first be saved. If local image edits differ from the
server, attachment is blocked rather than discarding those edits. The UI updates
only the local target image fields after the immediate server save, preserving
other pending edits. The existing full-catalog Save All behavior is unchanged;
this is not a global solution to concurrent edits in that legacy endpoint.

## Review and activation

This is stacked on feat/research-image-downloads / PR #2. No automatic merge or
deployment. An approved staging release needs all ten migrations and
RESEARCH_ENABLED=true, existing HTTPS/session settings, PostgreSQL and persistent
UPLOAD_DIR. The owner can review the PR and manage these settings in browser UIs;
no Android terminal is needed. This write makes photos visible on a product that
is already public, so the action is explicitly labelled as an immediate save.

## Validation

Frontend production build and 167 tests passed. Server typecheck, isolated test
migrations and 187 server tests passed with the documented SWC WASM mode. Lint
passed with existing warnings. Tests cover role/CSRF and publication-review gates,
stale revisions, permission revocation, product isolation, byte preservation,
deduplication and rollback of media/files/grants on the 12-image limit.

Touch-enabled Chromium exercised product-row selection, lookup by stored Etsy URL,
publication review and direct attachment. Public copy bytes matched the original;
exactly one product changed and all others were preserved. No document overflow
at 375/768/1280px. This is browser emulation, not a physical Android test. No live
Etsy images were fetched and no production data was changed.
