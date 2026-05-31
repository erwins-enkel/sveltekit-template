# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in a project derived
from `sveltekit-template`. Read this before proposing or implementing
changes.

## Tech stack (hard constraints)

- **Bun** for local install + script running. The Vercel build itself runs
  on **Node 22** — Bun is dev-only.
- **SvelteKit 5 only**, runes mode forced for project code (see
  `svelte.config.js`). Never write Svelte 4 `<script>`-based reactive
  patterns (`$:`, `export let`, stores-as-state). Use `$state`, `$derived`,
  `$effect`, `$props`, `$bindable`.
- **TypeScript everywhere.** No plain `.js` source files except configs.
- **Tailwind CSS 4.1 only** (`@import 'tailwindcss';` in `app.css`, no
  `tailwind.config.js`). Use `@theme inline` blocks for tokens.
- **shadcn-svelte** for primitive UI. Install via `bunx shadcn-svelte add ...`.
  Don't re-format the generated files — `src/lib/components/ui/**` is
  intentionally excluded from Prettier + ESLint.
- **Drizzle ORM + Neon HTTP driver** for the database. Schema in
  `src/lib/server/db/schema.ts`; migrations generated into `drizzle/`.
- **Valibot** for runtime validation (env, form input, API payloads). It
  already backs `src/lib/server/env.ts`. Don't reach for Zod — pick one, and
  this template picked Valibot.
- **Sentry** (`@sentry/sveltekit`) for error tracking. Init lives in
  `src/instrumentation.server.ts` + `src/hooks.client.ts`; it's a no-op until
  `PUBLIC_SENTRY_DSN` is set. Don't add a second error-tracking SDK.
- **BetterAuth** (`better-auth` + Drizzle adapter) is the standard auth — add
  it when a project needs login (see README → "Adding authentication"). Don't
  introduce Lucia/Auth.js/custom sessions.
- **Resend** is the standard transactional email — add it when a project needs
  to send mail (see README → "Adding email").
- **Vitest** for tests. Co-locate `*.test.ts` next to the source.
- **ESLint 9 + Prettier 3** are required to pass before any commit. The
  Husky pre-commit hook enforces this.
- **Fallow** for dead-code / complexity / duplication audit. CI runs
  `fallow audit` on every PR; locally `bunx fallow` for the full report.
  Config at `.fallowrc.json` — tune `entry` and `ignoreDependencies` to
  your project's actual reachable surface.

## Conventions

- **Conventional Commits, no exceptions.** release-please reads commit
  messages to generate the CHANGELOG and decide version bumps. `feat:`,
  `fix:`, `refactor:`, `perf:`, `chore:` are the headline types. `!` after
  the type or a `BREAKING CHANGE:` footer triggers a major bump.
- **Tabs for indentation, single quotes, no trailing commas, 100-char
  print width** — see `.prettierrc`.
- **Server-only code goes under `src/lib/server/`**. SvelteKit refuses to
  bundle anything under that path into the client. Database access, secret
  reads, and provider SDK calls all live there.
- **Env vars via `$env/dynamic/private`** in server code, never via
  `process.env` directly. Required server vars belong in
  `src/lib/server/env.ts`, which validates them with Valibot at module load
  and throws — fail fast. Add new required vars to that schema.
- **No `console.log` in committed code.** Use a real logger if you need
  structured output; remove debug prints before opening the PR.
- **All user-facing strings stay in one language** (decide per project).
  Logs and identifiers stay English regardless.

### Schema conventions

- No duplicate or near-duplicate tables — if two tables share 80%+ columns, they should be one table with a type/status discriminator, not separate tables.
- No flag columns (`is_active`, `is_deleted`) — use status enums instead. Soft-delete is `status = 'archived'`, not a boolean.
- No `users` + `user_profiles` split unless the profile has genuinely different ownership lifecycle. When in doubt, one `users` table.
- Always add `created_at` (default `now()`) and `updated_at` (default `now()`, onUpdate) to every table. Drizzle provides `timestamp` helpers for this.
- Name foreign key columns `{referenced_table}_id` and their indexes `idx_{table}_{column}`.
- Design schema in markdown first — write table names, columns, and relationships by hand before generating Drizzle code. Have AI review for gaps, not author from scratch.

### Type organization

- DB types come from Drizzle (`.$inferInsert` / `.Select` on tables) — never hand-write DTOs that mirror the schema.
- API and form types live in `src/lib/types/` — one file per domain (e.g. `src/lib/types/user.ts`, `src/lib/types/order.ts`).
- Never inline TypeScript interfaces in route files. Import from `src/lib/types/`.
- If a type is used in exactly one route, it can live in that route's `+page.server.ts` — but the moment a second consumer appears, move it to `src/lib/types/`.

### Validation patterns

- Valibot is the only validation library — it complies with Standard Schema, so any replacement must too. Don't mix libraries or introduce Zod, Yup, or Joi.
- `src/lib/server/env.ts` validates environment variables at module load — add new vars to its schema.
- For form validation, create a Valibot schema in `src/lib/types/{domain}.ts` alongside the TypeScript types, and use it with `superForm` or `$form` actions.
- For API payload validation (in `+server.ts` routes), import the same Valibot schemas from `src/lib/types/`. Never validate inline with manual `typeof` checks.

### Routing conventions

- `(public)/` route group: landing page, login, signup, pricing, blog — anything an unauthenticated user sees.
- `(authenticated)/` route group: dashboard, settings, profile — requires `locals.user`. The layout loads auth state; redirect to `/login` if missing.
- `(app)/` route group (optional): main app experience, separate from dashboard if needed.
- `/(public)/api/` prefix: REST endpoints for webhooks, 3rd-party callbacks, and non-SvelteKit consumers. Use `+server.ts` files.
- Server actions (`+page.server.ts` actions) for all form mutations done by the SvelteKit UI. Don't create API routes for form submissions.
- `+page.server.ts` load functions for all data-fetching that requires server context (auth, secrets, DB). Never fetch from the client what the server can provide.

### Auth layout

- Design data ownership into every schema from day one — add `user_id` FKs and auth scope to tables even before login is wired. BetterAuth is the standard auth provider; add it when the project needs login (see README).
- When you add auth, create these routes under `(public)/`: `/login`, `/signup`, `/forgot-password`.
- Create `(authenticated)/+layout.svelte` that checks `locals.user` and redirects to `/login` if missing.
- Don't introduce Lucia, Auth.js, or custom session management.

### Client-server communication

- SvelteKit server actions for form mutations — `<form action="?/create"` pattern, progressive enhancement with `enhance()`.
- `+page.server.ts` load functions for data reads that need server context (auth, DB).
- `+server.ts` API routes only for: webhooks, 3rd-party callbacks, and non-browser consumers (mobile apps, CLI tools).
- Never fetch your own API from the client. Use load functions and actions instead — avoids double-hop latency and keeps auth server-side.

## Folder structure

src/lib/components/ui/ — shadcn-svelte primitives (auto-generated, don't reformat)
src/lib/components/domain/ — feature-specific Svelte components (e.g., UserCard.svelte, OrderList.svelte)
src/lib/server/db/ — Drizzle schema, migrations, DB client
src/lib/server/auth/ — BetterAuth config (add when project needs login)
src/lib/server/env.ts — validated env vars (Valibot)
src/lib/types/ — shared TypeScript + Valibot schemas (DB, API, form types)
src/routes/(public)/ — unauthenticated pages: landing, login, signup
src/routes/(authenticated)/ — requires auth: dashboard, settings, profile
src/routes/(public)/api/ — REST endpoints for webhooks and 3rd-party consumers

## Pre-commit + CI contract

Three Husky hooks, escalating in scope:

- **`commit-msg`** runs `commitlint` (`@commitlint/config-conventional`).
  A message that isn't a valid Conventional Commit is rejected — this is
  what keeps release-please's CHANGELOG and version bumps honest.
- **`pre-commit`** runs `lint-staged` (Prettier + ESLint on changed files)
  followed by a full-project `svelte-check`. Fast — no test/build.
- **`pre-push`** runs the full CI-equivalent gate (lint, check, test,
  build) so failures surface before they cost a CI minute.

CI re-runs lint, check, test, and build with a dummy `DATABASE_URL`. If a
hook fails, **fix the issue and create a new commit** — do not `--no-verify`,
do not `--amend` past a hook failure.

## Common pitfalls

- **`DATABASE_URL` at build time.** The build only validates the URL
  format; it does not connect. Locally and in CI you can pass any
  syntactically-valid Postgres URL. Real values come from Vercel at deploy
  time via the Neon Marketplace integration.
- **Vercel functions run in UTC.** If "today" matters to your business
  logic, declare and use an explicit time zone everywhere. Don't trust the
  system local time.
- **shadcn updates.** When upgrading shadcn primitives, run the official
  CLI (`bunx shadcn-svelte add <component> --overwrite`) — don't hand-edit
  the generated files.

## Documentation expectations

- Update `README.md` when you change a public command, an env var, or a
  setup step.
- Update `docs/runbooks/*` when you change a piece of operational
  procedure (rotation cadence, restore procedure, table list).
- Don't proactively create new `.md` files. Add to existing ones.

## When in doubt

- Prefer the **Context7 MCP** for current SvelteKit / Tailwind / Drizzle /
  Vitest docs over web search. Versions shift faster than training data.
- Run `bun run lint && bun run check && bun run build` before claiming a
  task is complete. CI runs all four (plus `bun run test`); reproducing
  failures locally is cheaper than burning a CI minute per typo.
