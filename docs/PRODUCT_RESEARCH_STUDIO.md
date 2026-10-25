# Product Research Studio — initial private library

## Scope

ADMIN-only manual research records and collections, notes, optional HTTPS source
links, search, pagination, archive/restore and optimistic concurrency. All admins
share this business library; it is not a per-user vault. Source URLs are references
only: the server never fetches them. There are no Etsy calls, AI calls, image
imports, ZIP exports or product publication in this phase.

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
rights records; permission-checked exports; cost and price comparisons; evidence-
based AI analysis with budgets; original concepts; private product drafts. None
is implied to exist in this initial library. Additional credentials must be entered
securely in environment settings, never chat or repository files.

## Validation at implementation time

Frontend production build and 157 tests passed. The new research migration SQL
was executed inside a rolled-back transaction on a separate PostgreSQL test
instance. Full Prisma generation, server typecheck and API integration tests
remain blocked by HTTP 403 from binaries.prisma.sh; integrity verification was
not disabled. Six API integration scenarios are committed but not yet executed.
GitHub API requests also receive Forbidden, so automatic PR creation may need
restored API access. No production migrations or deployments were run.
