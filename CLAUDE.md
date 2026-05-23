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
  `process.env` directly. Throw at module load if a required var is missing
  — fail fast.
- **No `console.log` in committed code.** Use a real logger if you need
  structured output; remove debug prints before opening the PR.
- **All user-facing strings stay in one language** (decide per project).
  Logs and identifiers stay English regardless.

## Pre-commit + CI contract

The pre-commit hook runs `lint-staged` (Prettier + ESLint on changed files)
followed by a full-project `svelte-check`. CI re-runs lint, check, test,
and build with a dummy `DATABASE_URL`. If a commit fails the pre-commit
hook, **fix the issue and create a new commit** — do not `--no-verify`,
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
