# Ahşap Kokusu development

- Work in this connected repository and existing checkout; do not create a new project or worktree without a request.
- The owner uses Codex on an Android tablet. Provide browser-based workflows; never require local commands.
- Develop on dedicated feature branches. Never push directly to main/master, merge, or deploy without explicit approval.
- Keep changes reviewable through pull requests. State when PR creation or verification is blocked.
- Preserve existing storefront, branding, sessions and CSRF protections. No secrets in Git, logs, chat or browser bundles.
- Research is private and ADMIN-only. Never expose private research URLs or records in public site snapshots, catalog or sitemap. The approved product-image workflow may copy selected files to separate public Media records only after an ADMIN records a reviewed, permanent commercial-publication permission; preserve private provenance.
- External platform access must follow current terms and permissions. No scraping bypasses. Viewing, storage, AI transfer, export and commercial use require separate consideration.
- Research must not write to the existing full-catalog replacement endpoint. Unpublished drafts require private storage.
- Use the brand tokens in src/config/tokens.ts and src/styles/globals.css; preserve their parity.
- Frontend validation: npm run build, npm run lint, npm test. Server: npm run typecheck and npm test from server/ with a dedicated *_test database. Run required migrations on that test database only. Never disable artifact verification to unblock setup.
- Report passed, failed and blocked checks separately. Do not claim a public deployment or tablet visual check without evidence.
