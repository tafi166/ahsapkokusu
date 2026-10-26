# LaserCut Milestone A implementation report

Implemented on `feat/lasercut-pricing-studio`, based on existing `master` at
`2643ba2`. The initial `main` checkout contained only a README; repository discovery
located the existing application on master. No new application, authentication
system, ORM or production database was introduced.

## Repository and architecture

React 19 / TypeScript / Vite / Router, NestJS REST, Prisma/PostgreSQL, Zod,
HttpOnly sessions with ADMIN authorization and CSRF, Prisma.Decimal money,
Vitest/Testing Library/supertest. Existing brand tokens and admin controls are reused.
Detailed findings: [discovery](LASERCUT_DISCOVERY.md).

The server owns geometry analysis, motion simulation, decimal costing and quotation
snapshots. The browser renders numeric polylines only. Configuration is versioned;
quotation revisions create new records. Source files remain private in PostgreSQL.

## Delivered

- ADMIN-only `/admin/laser` navigation and APIs, using existing guards and sessions.
- Browser creation/editing of machine, material and operation preset profiles.
- SVG paths/shapes/curves/transforms/units/local references; validated core DXF
  lines/arcs/circles/polylines/bulges/block inserts and units.
- Scale confirmation, bounded parsing, unsupported-content warnings, duplicate
  candidates, contour statistics, touch pan/zoom/fit and operation colors.
- Theoretical and acceleration-aware simulation, operation ordering, separate
  cutting/engraving/travel/delays and human labor, explicit confidence criteria.
- Area/whole-sheet costing, batch setup allocation, margin versus markup,
  discount/minimum-charge floors, configurable VAT and decimal rounding.
- Saved/reopened immutable quotes, revision/duplication and drawing-free print/PDF.
- Manual LightBurn Preview reference and immutable actual production observations.
- Desktop three-column workspace and tablet/mobile persistent quotation summary.

## Database and changed files

One additive migration: `20261025193000_laser_studio`. Six models:
LaserMachineProfile, LaserMaterial, LaserCutPreset, LaserDesignFile, LaserQuote,
LaserProductionRun. Foreign keys, ownership, timestamps, version checks, indexes,
constraints and immutable-record triggers are included. Existing AuditLog is reused.
No production values are seeded. Migration was applied only to isolated `_test` DB.

Created: `server/src/laser/` (adapters, geometry, time, pricing, schemas, controller,
service, disabled LightBurn interface); `src/pages/admin/laser/` (typed API, forms,
workspace, preview, summaries and history); `server/test/laser-*.ts` fixtures/tests;
`src/tests/laser.test.tsx`; migration and documentation.
Modified: Prisma schema, Nest app registration, AdminPage integration, README,
server package/lock files. Added pinned small MIT svgpath and dxf-parser dependencies;
legacy release cadence, scope and safeguards are documented in the operator guide.
No storefront, catalog/cart logic, auth implementation or design-token changes.

## Verification

Passed:

- Frontend `npm run build` (TypeScript + Vite production build).
- Frontend `npm run lint`: no errors or new module warnings; 14 existing warnings.
- Frontend full suite: **172 tests / 16 files**.
- Server `npm run typecheck`, full suite: **248 tests / 17 files**, `npm run build`.
- Following final focused refinements: **61 laser server tests** and **5 laser UI tests**,
  plus repeated relevant builds/typechecking/lint.
- Clean migration from an empty isolated test schema and `git diff --check`.

The existing jsdom suite emits canvas-not-implemented notices; assertions pass.
Existing Vitest configuration emits a future config-loader notice. Neither blocked
checks. No checks require a physical laser.

Browser QA uses Chromium with touch enabled, at tablet 1024×1366, desktop 1720×1100,
and mobile 390×844. The test creates profiles via forms, uploads a 100mm square,
checks 400mm perimeter, changes quantity/margin/VAT, saves and reopens a finalized
quote after reload, records actual time, prints PDF, duplicates a revision and checks
horizontal overflow. Browser evidence is in `docs/laser-qa/` when included.
This is browser emulation, not a claim of physical Android-tablet testing.

## Acceptance and practical limits

Acceptance criteria 1–10 and 12 are covered by implementation, API/calculation/UI tests
and the browser workflow. Criterion 11 is verified with emulated tablet/touch layout;
physical-device testing remains outstanding. Criterion 13 is covered by the existing
storefront, catalog, cart/order and admin regression suites.

This is a useful Milestone A release, not a complete CAD/CAM planner. DXF SPLINE/3D,
raster, SVG CSS/clipping/text/fonts, true nesting, multi-file quotes, calibrated
correction-factor approval/rollback and physical LightBurn connectivity remain
incomplete. Approximate fill requires explicit acceptance. Unsupported or ambiguous
geometry cannot be finalized. The complete support/error/rounding model is documented
in [the operator and setup guide](LASERCUT_STUDIO.md).

The official LightBurn API was inspected; no documented Preview duration endpoint was
found. The connector stays disabled. No real laser, LightBurn installation or actual
cutting-time accuracy was tested.

## Setup and next milestone

Use the existing hosting pipeline: install lockfiles, back up PostgreSQL, apply
`npm --prefix server run db:deploy`, build frontend/server and restart after review.
The tablet operator then signs in at `/admin/laser` and enters real machine/material/
preset values through forms. No local editor or laser connection is required.

Recommended next milestone: representative production samples, approved/versioned
robust calibration, scanline clipping and more precise path/layout modeling.
No merge, live migration or deployment is included in this delivery.

Final Chromium smoke run passed on 2026-10-26 with zero browser exceptions.
All workflow and viewport checks listed above passed. Captured evidence:
[tablet](laser-qa/tablet.png), [desktop](laser-qa/desktop.png),
[mobile](laser-qa/mobile.png). PDF export was generated from synthetic test data.
