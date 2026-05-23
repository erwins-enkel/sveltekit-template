# Contributing

Quick guide for anyone (human or agent) opening a PR.

## Code style

- **Prettier** is the source of truth for formatting. Run `bun run format`
  before committing if you don't have the pre-commit hook installed.
- **ESLint** must pass with zero warnings. Do not add inline disables to
  silence rules — fix the underlying issue, or surface a discussion in
  the PR if you genuinely think the rule is wrong here.
- **TypeScript** — `bun run check` must pass. No `// @ts-ignore` without a
  one-line comment explaining _why_.
- **No `console.log`** in committed code.

## Commits

This repo uses **Conventional Commits** because release-please reads them
to generate the CHANGELOG and pick the next version number.

| Prefix      | Meaning                     | Bumps  |
| ----------- | --------------------------- | ------ |
| `feat:`     | New feature                 | minor  |
| `fix:`      | Bug fix                     | patch  |
| `perf:`     | Performance improvement     | patch  |
| `refactor:` | Behaviour-preserving change | patch  |
| `docs:`     | Documentation only          | none   |
| `test:`     | Tests only                  | none   |
| `ci:`       | CI / workflow changes       | none   |
| `chore:`    | Tooling / housekeeping      | hidden |
| `feat!:`    | Breaking change (or footer) | major  |

Keep messages concise. The body is for the _why_; the subject is for the
_what_.

## Branches

- Branch off `main`. Use a short, scoped name like `feat/oauth-callback`
  or `fix/inngest-step-retry`.
- One topic per branch. Two unrelated changes → two branches.

## PRs

- Fill in what changed and why. Link the issue if there is one.
- Keep PRs small. Anything > ~400 changed lines should probably split.
- CI must be green before review. `verify` runs lint → check → test →
  build; reproduce failures locally with the same commands rather than
  re-running CI.
- Reviewer expectation: at least one approval before merge. The repo
  admin should set this as a branch-protection rule on `main`.
- Squash-merge by default — keeps `main` linear and keeps Conventional
  Commit titles intact for release-please.

## Releases

You don't release manually. release-please opens (and keeps updated) a
release PR on every merge to `main`. Merging that PR cuts a `vX.Y.Z` tag
and updates `CHANGELOG.md`.
