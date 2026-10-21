# Deployment

The project is two parts on one origin: the storefront (a static Vite build in
`dist/`) and the API (`server/`, Node + PostgreSQL). A web server serves the
build and forwards `/api`, `/sitemap.xml` and `/robots.txt` to the API — see
[`deploy/nginx.conf.example`](../deploy/nginx.conf.example). Keeping one origin
is what lets the admin session cookie stay first-party with `SameSite=Strict`.

## Before the first deploy

1. **PostgreSQL**: a managed or self-hosted database (embedded-postgres is for
   development only). Create a database and a user with a strong password.
2. **`server/.env`** (never committed; start from `.env.example`):

   | Setting | Production value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | the production database URL (secret) |
   | `SITE_URL` | `https://your-domain` (required to be https) |
   | `ALLOWED_ORIGINS` | `https://your-domain` |
   | `COOKIE_SECURE` | `true` (the server refuses to start otherwise) |
   | `UPLOAD_DIR` | an absolute path outside the web root, e.g. `/srv/parametrika/uploads` |
   | `TRUST_PROXY` | `loopback` if the web server is on the same machine, else its address/subnet |
   | `SESSION_IDLE_MINUTES` / `SESSION_ABSOLUTE_HOURS` | `120` / `12` unless you decide otherwise |
   | `AUTH_RATE_LIMIT_PER_MIN`, `PUBLIC_FORM_RATE_LIMIT_PER_MIN`, `QUOTE_DAILY_LIMIT` | defaults are a starting point |

3. **Build and migrate**

   ```bash
   npm ci && npm run build                  # storefront → dist/
   cd server && npm ci && npm run build      # API → server/dist/
   npm run db:deploy                         # apply migrations (never `db:migrate` in production)
   npm run db:seed                           # optional: demo catalog, marked isSample
   npm run admin:create                      # first administrator (interactive)
   ```

4. **Run the API** as a service (systemd or similar) with `node dist/main.js` from
   `server/`, restarting on failure. Run **one instance**: rate limits are kept in
   memory per process.

5. **Web server**: adapt `deploy/nginx.conf.example` and copy
   `deploy/parametrika-security-headers.conf` to `/etc/nginx/snippets/` — TLS,
   `root` pointing at `dist/`, `client_max_body_size 6m`. The headers live in a
   snippet because nginx drops inherited `add_header` lines in any `location`
   that sets its own. Check the Content-Security-Policy in a real browser
   (console) after changes; it hasn't been verified against a live deployment.

## Backups

Back up both the database and `UPLOAD_DIR` (uploaded product photos and CNC
drawings); one without the other leaves broken references.

## Still prototype-level

- **Payments**: none. Checkout records test orders (`T-` numbers, `isTest`).
- **E-mail**: nothing is sent — no order confirmations, quote notifications or
  password-reset mails. Staff see orders and quotes in the admin panel.
- **Customer accounts**: none; only staff accounts exist.
- **Contact, free-text design and newsletter forms** are mocks that say so.
- **Business rules not yet defined**: shipping cost, real pricing rules for
  options, confirmed CNC limits (`src/config/cncQuote.ts`), English content.
- **Unused uploads** (photos replaced in the admin panel) are not cleaned up.
