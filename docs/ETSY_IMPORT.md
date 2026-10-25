# Etsy listing image provider

The product-row workflow now has an official Etsy API adapter: fetch a single
listing gallery, preview via authenticated same-origin URLs, select images,
import full-size originals to private storage, then apply the existing separate
commercial-publication review and single-product attachment. A ZIP/browser upload
round trip is not required. Whole-shop crawling is not implemented.

## Authoritative API contract checked during implementation

- https://developers.etsy.com/documentation/essentials/requests/
- https://developers.etsy.com/documentation/essentials/authentication/
- https://developers.etsy.com/documentation/essentials/rate-limits/
- https://www.etsy.com/openapi/generated/oas/3.0.0.json

The current `x-api-key` format is **keystring:shared_secret** (not keystring alone).
GET /v3/application/listings/{listing_id} and .../{listing_id}/images use API-key
security in the published specification; this adapter handles active public
listings only. It does not implement OAuth, private/draft listing access, Etsy
account login, CAPTCHA handling, or HTML scraping.

API access does not grant media rights or override Etsy's application approval
and terms. The legal API terms page could not be retrieved in this environment
(HTTP 403). An operator must review https://www.etsy.com/legal/api/ and confirm the
app's intended retrieval/storage/export use is permitted before enabling. The
ETSY_TERMS_REVIEWED setting is an operator confirmation, not proof supplied by code.
The 1–6h private-retention limit is a technical bound, not a claim of legal compliance.

## Local VS Code setup

Use Node 24 LTS (minimum 22.19) and the server's locked dependencies. In the ignored
server/.env (or secure server-side hosting settings), configure:

- RESEARCH_ENABLED=true
- ETSY_IMPORT_ENABLED=true
- ETSY_API_KEY: the Keystring and Shared Secret joined by one colon, with no spaces.
- ETSY_TERMS_REVIEWED=true only after the operator has completed the review above.
- ETSY_ALLOWED_SHOP_IDS: comma-separated numeric IDs of specifically authorized shops.
- ETSY_IMPORT_RETENTION_HOURS: 1 to 6 (default 6), subject to the permitted use.

Never use VITE_* variables for credentials or enter credentials in Git, the admin
browser UI, URLs, chat or screenshots. Keep the existing .env and database settings;
do not overwrite them from .env.example. Install server dependencies and restart
the API after changing configuration; reload the admin page to refresh status.
No new database migration is required by this provider.

A status of configured means required local switches/key exist, not that Etsy has
approved the application. The first listing request performs real authorization.
An Etsy app still showing Pending Personal Approval may be denied; code cannot
approve it. Without an allowlisted shop, the listing response reports its public
numeric shop ID in the error; add it only after verifying that shop is authorized.
Never broaden the allowlist just to make a failed request succeed.

## UI

Ürünler → Etsy / Galeriden görsel ekle:

1. Enter a single https://www.etsy.com/listing/... URL (localized /tr/listing/... works).
2. Confirm permission to view and privately acquire that source's images.
3. Choose Etsy’den yeni görselleri getir, select up to 12 images, then import them.
4. Imported originals become selected local gallery images automatically.
5. Record and confirm permanent commercial-publication permission, then save directly
   to that product. A separate original-media copy is published only at that step.

Existing private galleries and manual uploads remain available if Etsy is disabled.
All provider endpoints require ADMIN; POST operations retain Origin and CSRF checks.
No client-supplied download URL is trusted.

## Network and credential boundary

Metadata goes only to https://api.etsy.com/v3/application/ with the combined key.
Images go only to https://i.etsystatic.com and NEVER receive the key. Redirects,
credential-bearing URLs, alternate hosts and ports are rejected. TLS verification
is retained. Undici EnvHttpProxyAgent respects inherited HTTP(S)_PROXY/NO_PROXY;
Node's default CA certificates (including configured extra trust) are retained.
An outbound policy must permit api.etsy.com and i.etsystatic.com.

Responses are streamed with byte limits before decoding. Images must match JPEG,
PNG or WebP signatures, declared MIME and bounded dimensions. Body/exception text
from Etsy is not relayed, preventing credential leakage through upstream errors.
Requests time out after 8s, streams are capped at 1 MiB JSON / 512 KiB thumbnails /
5 MiB originals. API calls are serialized at about 3.3 QPS and upstream 429 honors
Retry-After without automatic retries. Per-key quotas remain Etsy's authority.

Previews are actor-bound random 5-minute in-memory tickets (max 100). They are not
public bearer URLs. Changing source URL invalidates the UI's prior selection.
A process restart invalidates previews; re-fetch rather than treating them as
persistent jobs. One API instance or sticky routing is needed for these tickets.
There are at most 8 preview operations, 2 imports, and 4 outbound requests at once;
the same ticket cannot be imported concurrently.

Imports are synchronous bounded operations for one listing (up to 12 images / 50
MiB); unlike ZIP exports they are not restartable jobs. The network phase checks a
45-second budget between 8-second requests. Fetching failures occur before private
persistence. If a later storage write fails, the partial private batch is revoked;
the public product remains unchanged. Imported hashes are deduplicated. Originals
expire after the configured short retention; the existing enabled worker removes
expired private files. Commercially authorized public copies are independent.

## Verification and limits

Source-contract fixtures exercise the real controller/service/DB/storage paths
with the remote transport mocked. Network-boundary tests inspect headers, proxy
routing, redirects, body limits and redaction. UI tests cover permission gating,
preview, selection/import, URL changes and access errors. These checks do NOT
prove a live Etsy app/key works. No live listing was downloaded because no real
Etsy credential was available in this cloud instance. No approval, merge or
production deployment is implied by this PR.

Final validation: frontend production build and 172 tests passed; server typecheck
and 203 tests passed using the documented SWC WASM mode. Lint passed with existing
repository warnings. The provider adds no migration. These are controlled remote
contract tests, not a live Etsy credential or production-deployment verification.
