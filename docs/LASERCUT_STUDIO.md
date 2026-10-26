# LaserCut Pricing Studio — operator and engineering guide

Entry: `/admin/laser`, **Üretim · LaserCut Studio** in the existing administrator
navigation. ADMIN only; EDITOR accounts cannot access the APIs. Turkish interface,
TRY default, existing USD currency also supported without conversion.

## Using the studio from a tablet

1. Open **Makineler** and create the CO₂ profile. Enter the actual workspace,
   axis speeds and accelerations; leave optical power blank if unknown. Controller
   defaults to “Bilinmiyor”. No real machine parameters or supplier prices are seeded.
2. Open **Malzemeler**. Enter thickness, sheet dimensions, acquisition cost excluding
   recoverable VAT, usable-area percentage, additional waste, and kerf spacing.
   Confirm material compatibility only after checking its composition and suitability.
3. Open **Reçeteler**. Select machine, material/thickness and operation, enter tested
   speed/power/passes. “Test edildi” is a declaration of testing, not time calibration.
4. Open **Hesaplama**, upload UTF-8 SVG or ASCII DXF (512 KiB maximum), select the
   profiles and assign every imported layer/group to an operation and preset, or ignore.
5. Inspect the normalized drawing, warnings, dimensions and contours. Use zoom,
   pointer/touch drag and **Sığdır**. If scale is ambiguous, enter confirmed **mm / dosya
   birimi**, then reassign operations on the new analyzed design. A viewBox alone is
   never accepted as physical scale. For an unscaled document coordinate of 100 that
   should be 100 mm, use 1 mm/unit; for inches, use 25.4 mm/unit.
6. Enter quantity, labor, expenses, pricing mode, discount and applicable VAT. Values
   recalculate on the server after 650 ms. **Yeniden hesapla** also retries explicitly.
   Stale totals cannot be saved while new inputs are pending.
7. Save a draft, or finalize when review blockers are cleared. A finalized quotation
   still contains **estimated** runtime. Both actions recompute on the server.
8. In **Teklifler**, reopen the stored snapshot. **Çoğalt / yeni sürüm düzenle** creates
   a revision using current configuration values; it never edits the old calculation.
   **Yazdır / PDF** invokes the browser print workflow with a drawing-free summary.
9. Record measured whole-batch machine seconds, optional LightBurn Preview seconds,
   UTC production date, notes and quality. Quantity must match the quotation; create
   another quotation for a different batch. Observations are immutable.

## Architecture and data

Frontend files: `src/pages/admin/laser/`; integration: `AdminPage.tsx`.
Server module files: `server/src/laser/`; integration: `app.module.ts`.

- `ingestion.ts`: size/type checks and adapter dispatch.
- `svg.ts`, `dxf.ts`, `geometry.ts`: bounded parsing, millimeter normalization,
  tessellation and warnings. No UI dependency.
- `time.ts`: independent motion planner and operation time breakdown.
- `pricing.ts`: independent decimal commercial engine, no vector parser dependency.
- `schemas.ts`: strict Zod contracts; shared transport types are type-only imports.
- `laser.service.ts`: transactional versioned configs, authoritative calculation,
  immutable snapshots, actual records and existing AuditLog integration.
- `lightburn.ts`: optional project exchange interface; **no network implementation**.

Additive Prisma models: LaserMachineProfile, LaserMaterial, LaserCutPreset,
LaserDesignFile, LaserQuote, LaserProductionRun. All have UUIDs, timestamps,
ownership metadata and relevant foreign keys. Config payloads are strictly validated
JSON with explicit physical units and decimal-string money, following existing JSON
configuration patterns. One material record represents one thickness and sheet size.
There is one design and one line/quantity per quotation in this release.

Quote JSON stores the input, complete normalized geometry, machine/material/preset
versions and values, cost policy, output and engine version `laser-1.0.0`. Presets
are machine/material-bound. Config updates use optimistic version checks. Snapshot
reads/writes use repeatable-read transactions; calculation is repeated during save.
The database rejects updates/deletes of saved quotes and production observations.
Revisions link to their parent. Audit events are committed in the same transaction.

Source SVG/DXF is bounded private text in PostgreSQL, with a SHA-256 digest. It is not
written to the public Media model, public uploads, catalog, site JSON or sitemap.
There is no raw-source download or URL-proxy endpoint. Rescaling reads the stored
source server-side and creates another immutable analysis record.

## Geometry support and boundaries

SVG supports paths (absolute/relative, cubic/quadratic/smooth Bézier and arcs), lines,
polylines, polygons, rectangles including rounded corners, circles, ellipses, nested
group transforms, root viewBox/preserveAspectRatio, explicit root physical dimensions,
physical length attributes and local `use` references. Layer identity comes from group
label/id, inherited down the group tree. px dimensions use CSS 96 dpi but require
scale confirmation before a final quote. A confirmed mm/unit value overrides root
scale and retains document transforms. Lengths use centerlines, not stroke outlines.

The small, established MIT `svgpath` 2.6.0 parser handles path grammar, transformations,
shorthand and arc-to-cubic normalization. It is a mature package with an older release,
not a newly maintained CAD kernel. We evaluated its bounded surface and covered it
with fixtures rather than building another SVG path parser. De Casteljau subdivision
runs **after physical transforms**, controlled by polygon/chord gap and a 0.02 mm
(default, configurable 0.005–0.2 mm through API) per-curve flattening budget.
Arc-to-cubic approximation has an additional numerical error (roughly 0.03% for
quarter-circle cubic approximations), so the tolerance is not a certified CAD error
bound. Dimensions come from sampled centerlines.

DXF uses the established MIT `dxf-parser` 1.1.2 with a deliberately restricted adapter.
Its release cadence is old, so it is not trusted to silently determine support: a
separate group-code pass records unhandled entity types, size/expansion limits apply,
and normalized results are validated and tested. Supported: LINE, ARC, CIRCLE,
2D LWPOLYLINE/POLYLINE including bulge arcs, INSERT/BLOCK nesting with base points,
scaling, rotation and translation; common INSUNITS conversions. DXF Y is inverted
for the screen's coordinate system, preserving distances. Unitless/unknown-unit
files require explicit scale confirmation.

Not supported reliably: DXF SPLINE, 3D/OCS, array INSERT, binary DXF; nested SVG
viewports/symbol viewBoxes, clipping/masks, CSS visibility semantics, text/fonts,
raster/embedded images, filters and native `.lbrn`/`.lbrn2`. Unsupported content produces
review-required warnings or a validation error, never a complete-looking final quote.
Script/foreignObject, handlers, external references, DOCTYPE/ENTITY and active URLs
are rejected. The browser draws only server-generated numeric polylines.

Limits: 512 KiB UTF-8 file, 3,000 SVG elements, 1,500 expanded paths, 60,000 sampled
points, depth/expansion caps, bounded DXF group input, upload 10/minute and estimate
60/minute per IP under existing throttling. No external resources are fetched.

Duplicate detection identifies quantized coincident segments, including reversed
segments; it is not a complete curve/partial-overlap or self-intersection solver.
Hole detection is containment-based and labeled candidate, not verified topology.
Open paths are allowed with warnings because scoring and line engraving may be open.
Very small paths and kerf-sized closed details warn of potential loss. Geometry review
warnings block finalization. Unsupported objects cannot be concealed by ignoring a
recognized layer.

## Motion model

Internal units: mm, mm/s, mm/s² and seconds. A theoretical `length / speed × passes`
figure is displayed separately. Straight movement uses triangular/trapezoidal
acceleration profiles. Axis-component limits restrict feed and acceleration.
At a vertex, estimated speed is limited by adjacent feeds and
`cornerSpeed / sin(turnAngle / 2)`; forward/backward passes enforce reachable
velocities. Start and end velocities are zero. This is a configurable heuristic,
not the proprietary LightBurn/controller planner. Zero cornerSpeed conservatively
stops at every sampled vertex, including curves.

Paths may follow original order within operation groups, inner-contour candidates
first, or greedy nearest **start point**. Direction reversal, closed-loop start
optimization and true nesting are not implemented. User-selected operation order
applies first. Active geometry is translated to the workspace origin, allowing X
overscan; source coordinates are not absolute machine positions. Workspace checks
include fill overscan. Each copy is modeled as a separately positioned job returning
to origin; this is explicit and may differ from batch nesting in LightBurn.

Passes include return travel for open paths and start/cooling delays. Preparation
machine delay applies once per operation group per item; human setup is once per
batch. Operation changes and rapid movement are separate. Cut, vector score/line
engraving, fill, rapid movement, configured delays, setup and handling are distinct.

Fill is a conservative bounding-box scan per closed contour, with line spacing,
X overscan, acceleration and Y stepping. Scan time is apportioned between engraving
and overscan travel by distance; nested holes and sparse areas are not subtracted.
This can overestimate and requires explicit acceptance of an unverified approximation.
Raster engraving is not supported. Manual whole-batch machine seconds can replace the
simulated total for costing; the component breakdown remains labeled simulation.
LightBurn Preview seconds are a comparison reference, never actual production time.

Confidence is medium only for scale-confirmed supported geometry and tested presets;
geometry review, untested presets, approximate fill or a manual override lowers it.
There is no “higher”/“calibrated” label without a calibration implementation. Quotation
uncertainty adds only to the machine time used for cost, not to geometry or labor.

## Commercial model

Derived machine minute rate = purchase/(life × productive minutes per year) + annual
maintenance/tube/optics reserves per productive minute + (machine kW + auxiliary kW)
× electricity tariff / 60 + allocated fixed overhead per minute. Optical tube power
is never used to infer electrical consumption. Manual rate replaces all derived
components. If its all-labor-inclusive checkbox is selected, separately entered
setup/handling/finishing labor is excluded and an explanation is shown.

Material uses the bounding rectangle **reserved for active production**, optionally
expanded by explicit reserved dimensions, plus a kerf spacing allowance. Rotation is
considered for a simple uniform grid capacity. Usable area and additional waste reduce
capacity. Area mode prices reserved area divided by usable/waste fractions. Whole-sheet
mode charges `ceil(quantity / estimated capacity)` sheets. Neither is verified nesting;
actual defects, grain, fixtures, layout and remnants require operator review.

Setup labor and fixed charges are batch-wide; handling/finishing, packaging and
consumables scale per item. All calculation money uses Prisma.Decimal. Components
are rounded HALF_UP to two decimals once, so the visible breakdown sums to batch cost.
Unit cost is batch cost / quantity, displayed HALF_UP to two decimals.

Margin: cost/(1−target). Markup: cost×(1+target). Discount applies to the recommendation;
minimum order charge and minimum gross margin impose a floor **after discount**.
Final batch price rounds UP to the selected money step, then VAT rounds HALF_UP to
cents. The effective post-discount margin is displayed. Displayed unit price may not
multiply exactly to the batch price due to unit rounding; the batch total is authoritative.

## LightBurn verification and next connector milestone

Official references inspected 2026-10-25:

- https://docs.lightburnsoftware.com/latest/Reference/RestAPI/
- https://github.com/LightBurnSoftware/LightBurn-REST
- https://github.com/LightBurnSoftware/LightBurn-REST/blob/main/docs/openapi.yaml
- https://docs.lightburnsoftware.com/latest/Reference/DeviceSettings/AdditionalSettings/
- https://docs.lightburnsoftware.com/latest/Reference/MaterialLibrary/

Observed repository HEAD: `8c01878f790f694ee33c91497c23fa3054938b82`. Documentation currently
labels itself LightBurn 2.2 Release Candidate. The schema describes pairing/connect,
status, import/open, project, layer/cut settings and material-library operations, using
HMAC-derived bearer authentication and scopes. **No documented Preview estimated-job-
duration endpoint was found.** `/api/status` is not a reliable machine-presence test:
the documented connection state may be false between transfers on some controllers.

The application makes no LightBurn HTTP calls. No machine start, jog, arbitrary URL
proxy, pairing secret or local-IP assumption is included. An eventual production-PC
connector must verify version/capabilities, pair locally with scoped credentials,
store secrets encrypted, connect outbound over authenticated TLS to an authorized
backend, log access, require explicit operator consent for project changes and protect
unsaved work. Keep machine control outside this pricing module. Test with the actual
installed LightBurn release and hardware before enabling project exchange.

## Calibration and remaining work

Actual observations compare against the saved, unbuffered simulation. Absolute error
is abs(actual − simulation); signed percentage is (simulation − actual)/actual × 100.
The observation references the immutable quote's machine, material and preset versions.
No factor is silently learned or applied and historical prices never change.

Milestone B remains incomplete: representative-sample eligibility, robust median/
outlier treatment grouped by machine/material/thickness/operation, administrator
proposal approval, versioned factors and rollback, precise scanline clipping, richer
curve intersections/overlap detection, kerf topology, improved path planning and
verified layout utilization. This release does not claim calibrated production accuracy.

Also deferred: multi-sheet choices per material, multiple quote lines/files, true 2D
nesting, inventory/scheduling/product integration, customer portal and connector.
Lists show the newest 100 quotes/runs; older records remain in PostgreSQL but paginated
history/search should be added before large-volume use. No physical laser or local
LightBurn installation was available for validation.

## Deployment and maintenance

The tablet operator needs only the existing admin browser interface. Deployment is a
repository/hosting operation; no local VS Code or production-PC access is necessary.
Use the existing deployment pipeline after branch review:

1. Install lockfile dependencies at the root and in `server/` (`npm ci`).
2. Back up the existing PostgreSQL database, then apply committed migrations with
   the hosting pipeline's `npm --prefix server run db:deploy`.
3. Generate/check Prisma (`npm --prefix server run typecheck`), build frontend and
   server (`npm run build`, `npm --prefix server run build`), and restart the existing
   API/static deployment. No new database or storage service is required.
4. Existing DATABASE_URL, allowed Origin, secure session cookie and HTTPS settings
   still apply. Keep database backups private because they contain source designs.
5. Sign in as ADMIN and configure actual machine/material/preset records through forms.

No live migration, merge or deployment was performed during development. Automated
migrations and browser records used only the dedicated local `_test` database. Test
accounts are ephemeral environment fixtures, never production seeds or committed secrets.
