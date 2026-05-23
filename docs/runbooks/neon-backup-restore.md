# Neon backup + restore verification runbook

Operational procedure for verifying that we can actually recover this
project's Neon Postgres database from Neon's built-in instant-restore
history and from snapshot branches.

We do **not** manage the underlying snapshots — Neon does. Our job is to
verify, on a recurring schedule, that a restore yields the data we expect.

## Overview

The Vercel/Neon Marketplace integration gives us two recovery primitives:

1. **Point-in-time recovery (PITR) via time-travel branches.**
   Neon retains change history for a configurable window. We can spawn a
   new branch from _any_ timestamp inside that window, get its connection
   string in seconds, and point our app (or a verification script) at it.

2. **Snapshot branches.**
   Either ad-hoc ("Create branch" from the dashboard) or scheduled via
   Neon's `backup_schedule` API (`hourly` / `daily` / `weekly` / `monthly` /
   `yearly`). Each snapshot keeps a copy of the data for a separate
   retention window of our choosing.

The Marketplace integration surfaces both in the Neon dashboard under the
project linked to our Vercel project.

### History-window defaults — read this before assuming

Neon's plan limits as of 2026:

| Plan     | Instant-restore window | Notes                                         |
| -------- | ---------------------- | --------------------------------------------- |
| Free     | up to 24 hours         | 1 GB of history included; longer is unusable. |
| Launch   | up to 7 days           | Billed $0.20/GB-month of history.             |
| Scale    | up to 30 days          | Billed $0.20/GB-month of history.             |
| Business | up to 30 days          | Billed $0.20/GB-month of history.             |

The project-level setting is `history_retention_seconds`. The Neon default
for a new project is **7 days (604800 s)** but it is clamped to the plan
maximum. Check the actual value before assuming you have a 7-day window:

```bash
curl "https://console.neon.tech/api/v2/projects/$NEON_PROJECT_ID" \
  -H "Authorization: Bearer $NEON_API_KEY" \
  | jq '.project.history_retention_seconds'
```

Scheduled snapshot branches are **not on by default** — they have to be
explicitly enabled per branch via the `backup_schedule` endpoint. Check
yours with:

```bash
curl "https://console.neon.tech/api/v2/projects/$NEON_PROJECT_ID/branches/$NEON_BRANCH_ID/backup_schedule" \
  -H "Authorization: Bearer $NEON_API_KEY" | jq
```

If the response is empty, you are relying solely on the instant-restore
window — fine for short-term mistakes, useless for "where was the data
last Tuesday."

## Recovery scenarios (RTO / RPO targets)

Adapt these targets to your project's risk tolerance.

### Scenario 1 — Accidental data deletion

Example: someone runs `DELETE FROM <table> WHERE created_at < ...` with a
bad predicate.

- **RPO target:** ≤ 5 minutes of lost writes.
- **RTO target:** ≤ 30 minutes to a restored primary.
- **Procedure:** restore to a time-travel branch from ~5 minutes _before_
  the destructive query, verify with `db:verify-restore`, then either
  promote the branch (Scenario B in [Restore procedure](#restore-procedure))
  or selectively copy back the affected rows.

### Scenario 2 — Schema corruption

Example: a Drizzle migration applied in production drops a column we still
need.

- **RPO target:** the last known-good migration state.
- **RTO target:** ≤ 1 hour, dominated by replaying good migrations.
- **Procedure:** restore to the timestamp just before the bad migration
  ran (visible in `drizzle/meta/_journal.json`), verify with
  `db:verify-restore`, then re-apply only the migrations that should have
  been applied.

### Scenario 3 — Total DB loss

Extremely unlikely with Neon HA, but worth a documented path.

- **RPO target:** ≤ 24 hours (the daily snapshot, once enabled).
- **RTO target:** ≤ 2 hours, dominated by Vercel re-publish + redeploy.
- **Procedure:** pick the most recent valid branch (a daily snapshot or
  the latest PITR point), promote it to primary, let the Vercel/Neon
  integration re-publish env vars, then redeploy production.

## Restore procedure

Two paths. Always start with **A** to validate the restore in isolation
before touching production.

### A. Restore to a branch (preview test)

Click-path:

1. Neon dashboard → **Branches** → **Create branch from time**.
2. Pick the timestamp (or pick an existing snapshot).
3. Name it descriptively, e.g. `restore-YYYY-MM-DD-pre-incident`.
4. Open the new branch → **Connection string** → copy.
5. Either:
   - Paste it into a Vercel **preview** deployment's `DATABASE_URL`
     override and deploy that preview, **or**
   - Set it locally as `DATABASE_URL_B` and run the verification script
     (see [Verification matrix](#verification-matrix)).

The new branch is read-write but isolated. Nothing you do to it touches
the primary.

### B. Restore by replacing the primary branch

**Only after A has verified the branch is good.** This is the destructive
option — the previous primary survives as a branch but the application
will be pointing at the restored data.

1. Neon → **Branches** → pick the restored branch → **Set as primary**.
2. The Vercel/Neon Marketplace integration will automatically re-publish
   `DATABASE_URL` (and the `PG*` variants, and `DATABASE_URL_UNPOOLED`)
   into Vercel's Production environment.
3. Trigger a redeploy of production so the new env vars take effect.
   Either Vercel dashboard → **Deployments** → latest → **Redeploy**, or
   push an empty commit to `main`.
4. Smoke-test against your project's most-trafficked code path.

If you need to fail back to the original primary, the previous primary
is still in the **Branches** list — set it back the same way.

## Verification matrix

A restore is not "good" until every table you care about matches on row
count and a deterministic checksum.

### One-shot script

```bash
export DATABASE_URL_A="postgres://...@.../neondb"   # live primary
export DATABASE_URL_B="postgres://...@.../neondb"   # restored branch
bun run db:verify-restore
```

The script (`scripts/verify-restore.ts`) is read-only. It runs, per
table, a single round-trip per side:

```sql
SELECT
    COUNT(*) AS row_count,
    MD5(string_agg(<column-list-as-text> ORDER BY <pk>)) AS row_md5
FROM <table>
```

Output looks like:

```
Table         A_count B_count A_md5           B_md5           Match
─────────────────────────────────────────────────────────────────────
users         12      12      a1b2c3d4e5f6... a1b2c3d4e5f6... OK
posts         340     340     7c1b2...        7c1b2...        OK
```

Exit code `0` if every row matches; `1` if any doesn't, or on any error.

**Template setup:** the `TABLES` array in `scripts/verify-restore.ts` ships
empty. Add one entry per table you want to verify — see the comments at the
top of that file for the shape and gotchas (cast everything to text,
COALESCE NULLs to `''`, primary key first in `orderBy`).

### Expected mismatches (do not panic)

- If you restored to "5 minutes ago" but the live DB has since accepted
  new writes, A and B will _correctly_ differ. To prove the restore is
  good in this case, run the script with **DATABASE_URL_A pointed at a
  second time-travel branch from the same timestamp** as B. Two
  same-timestamp branches must match exactly.
- Append-heavy tables (event logs, audit trails, drafts/runs in
  workflow-driven apps) change on every execution, so any quiescent gap
  is the right time to run the drill.

### Mutation safety

The script issues only `SELECT` statements. It will not modify either
database. Reviewed for that property — see the `probeTable` function in
`scripts/verify-restore.ts`.

## Drill schedule

**Quarterly**, on a Wednesday at lunch (typically a low-traffic window):

1. Pull `DATABASE_URL_A` from the Vercel production env.
2. Create a fresh PITR branch from "now minus 30 minutes". Copy its
   connection string into `DATABASE_URL_B`.
3. Run `bun run db:verify-restore`. Expect a clean OK across all tables
   (the 30-min window should be quiescent for a midweek lunch).
4. Delete the restore branch from the Neon dashboard.
5. **Always** write up the drill in `docs/incidents/drill-YYYY-MM-DD.md`,
   even on success. Capture: timestamp picked, runtime, anything weird,
   confirmation that the branch was deleted. Pass _and_ fail produce a
   trail.

If a drill fails: open a P1, run Scenario 1 against the same data, and
escalate to whoever owns the Neon/Vercel integration.

## See also

- `scripts/verify-restore.ts` — the verification script itself.
- `src/lib/server/db/schema.ts` — the tables that the script should
  cover (keep the two in sync).
- [Neon docs: instant restore](https://neon.com/docs/introduction/history-window)
- [Neon docs: backup schedule](https://neon.com/docs/guides/backup-restore)
