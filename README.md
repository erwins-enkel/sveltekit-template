# sveltekit-template

Opinionated SvelteKit 5 starter for internal web apps on Vercel + Neon. Distils
the conventions of a project that took ~30 PRs to converge on this shape, so
new projects get the same foundation on day one.

## What this template gives you

- **Stack:** SvelteKit 5 + TypeScript + Svelte runes, Tailwind 4 + shadcn-svelte,
  Drizzle ORM with the Neon HTTP driver, `@sveltejs/adapter-vercel` targeting
  Node 22 in region `fra1`.
- **Tooling:** Bun for local install + scripts, ESLint 9 + Prettier 3 + Husky 9 with lint-staged 16, Vitest with v8 coverage.
- **Observability:** `@sentry/sveltekit` wired on server + client — a no-op
  until you set `PUBLIC_SENTRY_DSN`, so it never gets in the way locally.
- **Validation:** Valibot, already enforcing a fail-fast env contract in
  `src/lib/server/env.ts`. Reuse it for form input and API payloads.
- **Error page:** a default `src/routes/+error.svelte` so thrown errors render
  a real page instead of the framework fallback.
- **CI:** `.github/workflows/ci.yml` runs lint → typecheck → test → build on
  every PR and push to `main`, with concurrency cancellation.
- **Releases:** [release-please](https://github.com/googleapis/release-please)
  config that ships a `vX.Y.Z` tag + CHANGELOG entry on every `main` merge,
  driven by Conventional Commits.
- **Dependency updates:** Dependabot with grouped weekly PRs (sveltekit /
  shadcn / drizzle / lint / test) so the inbox stays sane.
- **Operational runbooks:** Neon backup-restore verification (with a parameter-
  isable `db:verify-restore` script) and provider-by-provider secret rotation.
- **Reference shadcn component:** `Button` is pre-installed so you can
  immediately `bunx shadcn-svelte add ...` more components.

## First-day-on-a-new-project checklist

After clicking **Use this template** on GitHub, do this once per derived project:

1. **Rename the package**
   - `package.json` → `name`
   - `release-please-config.json` → `packages["."].package-name`
2. **Set the right Vercel region** in `vercel.json` (`fra1` is the default).
3. **Update `app.html`** — change `lang="en"` if your UI isn't English; set
   `theme-color` to match your brand.
4. **Update this README** — at minimum the H1 and the description.
5. **Enable repo security features** (admin → Settings → Code security):
   - Push protection (block commits containing detected secrets)
   - Secret scanning alerts
   - Dependabot alerts
   - Dependabot security updates
6. **Branch protection on `main`** (admin → Settings → Branches):
   - Require `verify` status check before merging
   - Require 1+ PR review
   - Require branches up to date before merging
   - Disallow direct pushes
7. **Decide which integrations you actually use** and prune accordingly:
   - In `docs/runbooks/secret-rotation.md`, delete every section marked
     "Skip if not used" that doesn't apply.
   - In `.github/dependabot.yml`, delete the grouping rules for libraries you
     never installed (otherwise they're harmless but noisy).
8. **Add auth if you need it** — BetterAuth is the blessed path; see
   [Adding integrations](#adding-integrations) below. `src/hooks.server.ts`
   currently pass-throughs every request (after Sentry).
9. **Set `PUBLIC_SENTRY_DSN`** (Production + Preview) if you want error
   tracking — otherwise Sentry stays a no-op.
10. **Populate `scripts/verify-restore.ts`** — the `TABLES` array is empty by
    design; add one entry per table you want the backup-restore drill to verify.

## Tech stack

| Layer                   | Choice                                             |
| ----------------------- | -------------------------------------------------- |
| Runtime                 | Node 22 (Vercel)                                   |
| Package manager         | Bun (local dev)                                    |
| Framework               | SvelteKit 5 + TypeScript                           |
| Styling                 | Tailwind CSS 4.1 + shadcn-svelte                   |
| Database                | Neon Postgres (via Vercel Marketplace integration) |
| ORM                     | Drizzle + `@neondatabase/serverless`               |
| Validation              | Valibot                                            |
| Observability           | Sentry (`@sentry/sveltekit`, optional)             |
| Hosting                 | Vercel (region `fra1` by default)                  |
| Lint / format           | ESLint 9 + Prettier 3                              |
| Git hooks               | Husky + lint-staged                                |
| Tests                   | Vitest                                             |
| Auth (add when needed)  | BetterAuth + Drizzle adapter                       |
| Email (add when needed) | Resend                                             |

## Local setup

```bash
# 1. Install dependencies
bun install

# 2. Copy the env template, then fill in real values (or run `vercel env pull`)
cp .env.example .env.local

# 3. Apply database migrations (once you have a real DATABASE_URL)
bun run db:migrate

# 4. Start the dev server (http://localhost:5173)
bun run dev
```

## Adding integrations

Sentry is pre-wired; auth and email are documented here as the blessed paths
but **not** scaffolded — add them when a project actually needs them. Check the
current API with the Context7 MCP before pasting; these libraries move fast.

### Error tracking (Sentry — already wired)

Server init lives in `src/instrumentation.server.ts`, client init in
`src/hooks.client.ts`, and `sentryHandle()` wraps `src/hooks.server.ts`. It's a
no-op until a DSN is present. To turn it on:

```bash
# Set the DSN (Production + Preview, and .env.local for dev)
PUBLIC_SENTRY_DSN="https://...@oXXXX.ingest.de.sentry.io/XXXX"
```

To upload source maps on deploy, also set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`,
and `SENTRY_PROJECT` — the Vite plugin only runs when the token is present
(`vite.config.ts`), so local/CI builds stay clean.

### Adding authentication (BetterAuth)

```bash
bun add better-auth
```

```ts
// src/lib/server/auth.ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';

export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailAndPassword: { enabled: true },
	// `sveltekitCookies` must be the LAST plugin.
	plugins: [sveltekitCookies(getRequestEvent)]
});
```

```ts
// src/hooks.server.ts — replace the no-op handleApp with the BetterAuth handler
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';

const handleApp: Handle = ({ event, resolve }) =>
	svelteKitHandler({ event, resolve, auth, building });
```

Then generate + apply the auth tables, and set the secret:

```bash
bunx @better-auth/cli generate   # writes auth tables into your Drizzle schema
bun run db:generate && bun run db:migrate
# .env: BETTER_AUTH_SECRET=$(openssl rand -hex 32), BETTER_AUTH_URL=<app url>
```

### Adding email (Resend)

```bash
bun add resend
```

```ts
// src/lib/server/email.ts
import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function sendEmail(opts: { to: string; subject: string; html: string }) {
	if (!resend) {
		// No key configured — log and no-op so dev/CI don't fail.
		console.warn('RESEND_API_KEY unset; skipping email:', opts.subject);
		return;
	}
	await resend.emails.send({ from: 'you@yourdomain.com', ...opts });
}
```

### Adding i18n (Paraglide)

The template ships single-language by default. If a project goes
multilingual, use [Paraglide JS](https://inlang.com/m/gerre34r/library-inlang-paraglideJs) —
compile-time messages, no runtime catalog loading, tree-shakeable.

```bash
bunx @inlang/paraglide-js@latest init
# Author messages in messages/<locale>.json (snake_case, component-prefixed
# keys); import { m } from '$lib/paraglide/messages' and call m.my_key().
```

**Add a catalog-parity gate.** Paraglide silently falls back to the base
locale for a missing key, so an incomplete translation ships looking fine.
Turn that into a hard failure: a small script that asserts every locale
catalog shares an identical, non-empty key set, wired into CI and
`.husky/pre-push`.

```js
// scripts/check-i18n.mjs — fails if locales diverge or have empty values
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'messages';
const files = readdirSync(DIR).filter((f) => f.endsWith('.json'));
const keysByLocale = new Map(
	files.map((f) => [
		f.replace(/\.json$/, ''),
		new Set(
			Object.entries(JSON.parse(readFileSync(join(DIR, f), 'utf8')))
				.filter(([k]) => k !== '$schema')
				.map(([k]) => k)
		)
	])
);
const union = new Set([...keysByLocale.values()].flatMap((s) => [...s]));
const problems = [...keysByLocale].flatMap(([locale, keys]) =>
	[...union].filter((k) => !keys.has(k)).map((k) => `${locale}.json missing ${k}`)
);
if (problems.length) {
	console.error('i18n parity failed:\n' + problems.join('\n'));
	process.exit(1);
}
console.log(`✓ i18n: ${keysByLocale.size} locales in parity (${union.size} keys)`);
```

Hardcoded strings that bypass the catalog entirely aren't caught here — that
stays on code review. (Pattern lifted from the `tank` project.)

## Commands

| Command                     | Purpose                                                   |
| --------------------------- | --------------------------------------------------------- |
| `bun run dev`               | Start the Vite dev server on port 5173                    |
| `bun run build`             | Production build via `@sveltejs/adapter-vercel`           |
| `bun run preview`           | Preview the production build locally                      |
| `bun run check`             | `svelte-kit sync` + `svelte-check` typecheck              |
| `bun run lint`              | `prettier --check` + `eslint`                             |
| `bun run format`            | Rewrite files with Prettier                               |
| `bun run test`              | Run Vitest once                                           |
| `bun run test:watch`        | Vitest in watch mode                                      |
| `bun run db:generate`       | Generate a new SQL migration from `schema.ts` changes     |
| `bun run db:migrate`        | Apply pending migrations to `DATABASE_URL`                |
| `bun run db:push`           | Push schema changes without a migration (dev convenience) |
| `bun run db:studio`         | Launch Drizzle Studio against `DATABASE_URL`              |
| `bun run db:verify-restore` | Compare two Neon DBs row-by-row (see runbook)             |

See `docs/runbooks/neon-backup-restore.md` for the restore procedure that
`db:verify-restore` underpins.

## CI

`.github/workflows/ci.yml` runs the `verify` job on every PR and push to
`main`. In order:

1. `bun install --frozen-lockfile`
2. `bun run lint` — Prettier + ESLint
3. `bun run check` — `svelte-kit sync` + `svelte-check`
4. `bun run test` — Vitest
5. `bun run build` — `vite build` with a dummy `DATABASE_URL`

Concurrency cancels superseded runs on the same branch/PR. Three Husky hooks
catch failures locally first:

- `.husky/commit-msg` — `commitlint` rejects any message that isn't a valid
  Conventional Commit (release-please depends on the format).
- `.husky/pre-commit` — `lint-staged` + `svelte-check` (fast; no test/build).
- `.husky/pre-push` — the full CI-equivalent gate (lint, check, test, build)
  so a red push never reaches a PR.

**Fallow** runs on every PR (`fallow audit --fail-on-issues`) and fails the
check if the PR introduces new dead code, complexity violations, or unlisted
dependencies. Inherited issues don't block — only the delta matters. Run
locally:

```bash
bunx fallow            # full report
bunx fallow fix        # auto-fix the safe stuff
bunx fallow audit      # same gate as CI
```

Config: [`.fallowrc.json`](./.fallowrc.json). Tune `entry`,
`ignoreDependencies`, and `health.*` thresholds for your project's actual
shape — the defaults assume a typical SvelteKit + Vercel + Drizzle app.

Vercel preview deployments are handled by Vercel's own GitHub integration —
not duplicated here.

## Releases

A merge to `main` triggers
[release-please](https://github.com/googleapis/release-please) via
`.github/workflows/release-please.yml`. It opens (or updates) a release PR
that bumps the version in `.release-please-manifest.json`, regenerates
`CHANGELOG.md`, and tags `vX.Y.Z` when the release PR is merged.

The changelog is grouped by commit type, so **stick to Conventional Commits**:

- `feat: ...` → new feature
- `fix: ...` → bug fix
- `refactor: ...` → behaviour-preserving change
- `perf: ...` → performance improvement
- `chore: ...` → tooling / housekeeping (hidden from CHANGELOG)
- `feat!: ...` or footer `BREAKING CHANGE:` → major bump

## One-time Vercel setup

These steps are not scripted because they require interactive auth and
Marketplace consent.

1. **Link the project**

   ```bash
   bunx vercel link
   ```

2. **Provision Neon via the Vercel Marketplace**

   Vercel dashboard → project → **Storage** → **Browse Marketplace** → **Neon**
   → create a Postgres database in the region matching `vercel.json`.

   The integration injects `DATABASE_URL` (and `DATABASE_URL_UNPOOLED`, plus
   `PG*` variants) into Production and Preview automatically.

3. **Set the remaining env vars** for Production and Preview — one
   `vercel env add` per entry in `.env.example`, or use the Vercel dashboard.

4. **Pull them locally**

   ```bash
   vercel env pull .env.local
   ```

5. **Restrict preview access** (Vercel dashboard → project → **Settings** →
   **Deployment Protection**): enable **Vercel Authentication** (team SSO) or
   **Password Protection** so preview URLs aren't world-readable.

6. **Confirm the region** in `vercel.json` — must match where the Neon DB
   lives.

## Project layout

```
src/
├── app.css                  # Tailwind + shadcn theme variables
├── app.d.ts
├── app.html
├── instrumentation.server.ts # Sentry server init (no-op without a DSN)
├── hooks.server.ts          # sentryHandle + pass-through; add auth here
├── hooks.client.ts          # Sentry client init
├── lib/
│   ├── components/ui/       # shadcn-svelte components (Button installed)
│   ├── server/
│   │   ├── env.ts           # Valibot-validated env (fail-fast at load)
│   │   └── db/
│   │       ├── index.ts     # Drizzle client (Neon HTTP driver)
│   │       └── schema.ts    # Empty — add your tables here
│   └── utils.ts             # cn() helper + shadcn type helpers
└── routes/
    ├── +layout.svelte
    ├── +error.svelte        # Default error page
    └── +page.svelte         # Placeholder home page
drizzle/                     # Generated migrations land here
docs/runbooks/               # Secret rotation + Neon backup-restore
scripts/verify-restore.ts    # Companion to the Neon runbook
```

## License

MIT — see [LICENSE](LICENSE) (add one if you fork this template publicly).
