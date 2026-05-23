# sveltekit-template

Opinionated SvelteKit 5 starter for internal web apps on Vercel + Neon. Distils
the conventions of a project that took ~30 PRs to converge on this shape, so
new projects get the same foundation on day one.

## What this template gives you

- **Stack:** SvelteKit 5 + TypeScript + Svelte runes, Tailwind 4 + shadcn-svelte,
  Drizzle ORM with the Neon HTTP driver, `@sveltejs/adapter-vercel` targeting
  Node 22 in region `fra1`.
- **Tooling:** Bun for local install + scripts, ESLint 9 + Prettier 3 + Husky 9 with lint-staged 16, Vitest with v8 coverage.
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
8. **Wire up your auth provider** in `src/hooks.server.ts` — it currently
   pass-throughs every request.
9. **Populate `scripts/verify-restore.ts`** — the `TABLES` array is empty by
   design; add one entry per table you want the backup-restore drill to verify.

## Tech stack

| Layer           | Choice                                             |
| --------------- | -------------------------------------------------- |
| Runtime         | Node 22 (Vercel)                                   |
| Package manager | Bun (local dev)                                    |
| Framework       | SvelteKit 5 + TypeScript                           |
| Styling         | Tailwind CSS 4.1 + shadcn-svelte                   |
| Database        | Neon Postgres (via Vercel Marketplace integration) |
| ORM             | Drizzle + `@neondatabase/serverless`               |
| Hosting         | Vercel (region `fra1` by default)                  |
| Lint / format   | ESLint 9 + Prettier 3                              |
| Git hooks       | Husky + lint-staged                                |
| Tests           | Vitest                                             |

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

Concurrency cancels superseded runs on the same branch/PR. The Husky
pre-commit hook (`.husky/pre-commit`) runs `lint-staged` + `svelte-check` so
typecheck regressions are caught locally before they hit CI.

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
├── hooks.server.ts          # Pass-through; wire your auth provider here
├── lib/
│   ├── components/ui/       # shadcn-svelte components (Button installed)
│   ├── server/db/
│   │   ├── index.ts         # Drizzle client (Neon HTTP driver)
│   │   └── schema.ts        # Empty — add your tables here
│   └── utils.ts             # cn() helper + shadcn type helpers
└── routes/
    ├── +layout.svelte
    └── +page.svelte         # Placeholder home page
drizzle/                     # Generated migrations land here
docs/runbooks/               # Secret rotation + Neon backup-restore
scripts/verify-restore.ts    # Companion to the Neon runbook
```

## License

MIT — see [LICENSE](LICENSE) (add one if you fork this template publicly).
