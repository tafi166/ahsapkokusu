# Product Research Studio — private library and cost scenarios

## Scope

ADMIN-only manual research records and collections, notes, optional HTTPS source
links, search, pagination, archive/restore and optimistic concurrency. All admins
share this business library; it is not a per-user vault. Source URLs are references
only: the server never fetches them. The initial manual library has no external dependencies. Optional Etsy listing
retrieval is now documented in ETSY_IMPORT.md; private galleries/ZIP and reviewed
product attachments have separate documentation. AI and automatic publication
remain disabled.

The feature branch is based on `feat/ahsap-kokusu-brand-identity`, not master,
so its branding commits are a prerequisite. Review against that branch; no merge
or deployment is automatic.

## Architecture

`src/pages/admin/research` is reached at `/admin/research` through the existing
admin session gate. Query parameters retain collection/search/page/view state.
Existing admin tabs are unchanged. API: `/api/admin/research/{status,items,collections}`.
The global auth guard enforces ADMIN, Origin and CSRF checks. State stays in
PostgreSQL, never localStorage. Forms are not persisted across navigation;
the UI warns about this and preserves the form after a rejected save.

ResearchItem and ResearchCollection are separate from Product/SiteContent/Media.
ResearchCollectionItem joins them. Version-checked writes and audit records occur
inside a transaction. Records are archived rather than deleted. Actor UUIDs are
retained for audit even if the user is later removed. Private GET responses use
no-store. Research content is rendered as text, not HTML.

## Browser-managed activation (after review)

1. Review the GitHub feature branch and PR. This phase needs no Etsy or AI secrets.
2. Use an approved staging host with the existing NestJS server, PostgreSQL and
   same-origin HTTPS routing. A static Netlify Drop deployment cannot run this API.
3. Through that host's browser dashboard, have the release job apply committed
   Prisma migrations and generate the Prisma client. The project already provides
   the server db:deploy and db:generate scripts; Codex can operate the approved
   environment without requiring the owner to use a terminal.
4. In the server's environment settings set RESEARCH_ENABLED=true. It defaults to
   false; status remains visible to admins when disabled, data endpoints return 404.
5. Sign in as ADMIN, open Araştırma Stüdyosu, create a collection and a manual
   research, then reload and verify persistence. Verify EDITOR cannot access it.
6. Setting RESEARCH_ENABLED=false disables operations without deleting data.

Do not run test database resets against production. Database backups now include
private research notes. No filesystem storage is added in this phase.

## Remaining phases

Official Etsy access and terms verification; private media and purpose-specific
rights records; permission-checked exports; competitor price comparisons; evidence-
based AI analysis with budgets; original concepts; private product drafts. None
is implied to exist in this initial library. Additional credentials must be entered
securely in environment settings, never chat or repository files.

## Manufacturing cost scenarios

The Maliyet & Kârlılık view stores named, version-checked scenarios independently
of public products. All computations run on the server with Decimal arithmetic;
client totals are rejected. Each result records formulaVersion=1. The last 100
scenarios are listed. No live exchange rate, tax engine or AI estimate is used.

Inputs: production quantity; batch material cost plus a material-only waste
markup; batch labor and machine minutes multiplied by hourly rates; batch
finishing and overhead; per-unit packaging and shipping; unit selling price;
percentage commission, fixed fee and desired contribution margin. Enter all
amounts in one currency, excluding tax, and assume one unit per order. A currency
change only changes the unit label, not the numeric amounts.

Unit cost = batch production cost / quantity + packaging + shipping.
Contribution = sale price * (1 - commission fraction) - fixed fee - unit cost.
Target price = (unit cost + fixed fee) / (1 - commission fraction - target margin).
The denominator must be positive. Suggested prices round UP to two decimals;
other displayed money rounds half up. Full precision is retained until display.
Contribution is not company net profit. Machine time must be entered by a human.

## Validation

Prisma generation, server typecheck, all eight migrations on the dedicated test
PostgreSQL, and 174 server tests passed. In this cloud machine native SWC cannot
materialize its binding in the runtime cache. The checked-in optional
SWC_USE_WASM=1 test mode runs the same tests with matching @swc/wasm 1.16.18 and
the same decorator metadata options. Native SWC remains the default elsewhere.
Codex operates this mode; the tablet owner does not need a local terminal.

No production migration, merge or deployment has been performed.

Touch-enabled Chromium checks passed for login, cost scenario save/reload/edit and
375/768/1280px document overflow. This is browser emulation, not a physical Android
device test. Frontend production build and 159 tests passed; lint has existing warnings.
