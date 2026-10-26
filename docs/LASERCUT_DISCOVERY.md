# LaserCut repository assessment and delivery plan

Inspected 2026-10-25. The environment initially checked out `main` (README only).
The existing app is on `origin/master`, commit `2643ba2`. Work is based there on
`feat/lasercut-pricing-studio`; no unmerged Etsy integration is included.

- Frontend: React 19.2, TypeScript 6, Vite 8, Router 7, Tailwind 4.
- Backend: NestJS 11 REST, Express, Prisma 7 with PostgreSQL. Zod 4 contracts.
- Auth: existing HttpOnly sessions, ADMIN/EDITOR roles, Origin + CSRF enforcement,
  global throttling. Add ADMIN-only endpoints using the same guard.
- Admin: `/admin/*`, outside storefront layout; reusable Field, TextInput,
  SectionCard, AdminButton. Brand palette: tokens.ts and globals.css.
- Storage: existing UPLOAD_DIR with separate public media/private customer SVGs.
  Laser source files will be private database text, never public Media records.
- Catalog: Product/Category with Decimal prices and JSON variants/details. No laser
  changes to these models or the full-catalog replacement endpoint.
- Money: Prisma.Decimal and explicit two-decimal rounding; existing research cost
  utilities are separate and remain unchanged.
- Testing: Vitest, Testing Library, supertest against isolated *_test PostgreSQL.
- Deployment: Vite assets plus Nest API, same origin, optional STATIC_DIR hosting;
  migrations and persistent PostgreSQL required. No local production PC assumed.

## Vertical slices

1. Shared contracts and validated, independent SVG/DXF adapters; bounded analysis.
2. Motion and decimal cost engines; deterministic fixtures.
3. Additive Prisma models/migration, ADMIN services, audited writes and snapshots.
4. Turkish responsive workspace, config management, safe preview, save/reopen/
   duplicate/print and actual-time recording.
5. Access/integration/regression tests, build/lint and delivery documentation.

LightBurn connector remains disabled. Manual Preview reference and actual duration
are separate from simulated runtime. No remote machine control will be added.
