# Secret Rotation Runbook

Operational runbook for rotating every credential used by this project. The
audience is an on-call engineer with no prior context — every command is
copy-pasteable.

> **Template note:** delete every section below labelled **Skip if not used**
> that doesn't apply to your project. The remaining sections form the actual
> runbook for your derived project.

All env vars referenced here come from `.env.example`. The runbook covers
planned rotation cadence, incident-driven rotation, and the local-development
implications.

## 1. Inventory

Adapt this table to the secrets your project actually uses. The starter row
covers what every project gets out of the box.

| Secret                                                | Where it's used                              | Lives in                                             | Rotation cadence                                              | Impact if leaked                                                                     |
| ----------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `SESSION_SECRET`                                      | App-cookie signing + token-column encryption | Vercel env                                           | 90 days                                                       | All active sessions invalidated; any encrypted DB columns derived from it unreadable |
| `DATABASE_URL` (+ Neon `POSTGRES_*` / `PG*` siblings) | Postgres connection                          | Auto-injected by Vercel Marketplace Neon integration | Auto-rotated by Neon; manual rotation on suspected compromise | Direct DB access — read everything                                                   |

Add one row for each provider integration your project actually uses. See
the placeholder sections below for the most common ones.

## 2. Rotation procedures

For every procedure: **rotate, deploy, smoke test, revoke the old credential**.
The order matters — revoke last so you have a rollback if the new credential
is wrong.

All commands assume the Vercel CLI is logged in and the project is linked
(`bunx vercel link`).

### 2.1 `SESSION_SECRET`

> **Effect:** all current sessions log out. If you derive any column-level
> encryption keys from this value (e.g. encrypted OAuth tokens stored in
> `users`), those columns become unreadable. Schedule for low-traffic hours.

```bash
# 1. Generate a new value
NEW_SECRET=$(openssl rand -hex 32)

# 2. Replace in Production
vercel env rm SESSION_SECRET production --yes
vercel env add SESSION_SECRET production --value "$NEW_SECRET" --yes

# 3. Repeat for Preview and Development
vercel env rm SESSION_SECRET preview --yes
vercel env add SESSION_SECRET preview --value "$NEW_SECRET" --yes
vercel env rm SESSION_SECRET development --yes
vercel env add SESSION_SECRET development --value "$NEW_SECRET" --yes

# 4. Force a fresh prod deploy
vercel deploy --prod
```

### 2.2 `DATABASE_URL` (Neon, via the Vercel Marketplace integration)

Do **not** rotate manually. Neon owns credential lifecycle and the
Marketplace integration pushes new env vars to Vercel automatically.

**On suspected compromise:**

```text
1. Vercel dashboard → Storage → <Neon database> → Settings → Rotate credentials
2. The integration immediately updates DATABASE_URL, DATABASE_URL_UNPOOLED, and all
   POSTGRES_* / PG* siblings across Production, Preview, and Development.
3. Trigger a new prod deploy to pick them up:
```

```bash
vercel deploy --prod
```

For local development, re-pull:

```bash
vercel env pull .env.local
```

### 2.3 Microsoft Azure AD OAuth — **Skip if not used**

> Applies if you've added `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_TENANT_ID`
> to your `.env.example`.

Microsoft allows two client secrets on a single app registration — use the
overlap to verify before revoking.

```text
1. Azure Portal → App registrations → <your app> → Certificates & secrets
2. Click "New client secret"
3. Description: "<project> YYYY-MM-DD"; Expires: 12 months
4. Copy the Value column (only shown once)
```

```bash
for ENV in production preview development; do
  vercel env rm MS_CLIENT_SECRET "$ENV" --yes
  vercel env add MS_CLIENT_SECRET "$ENV" --value "<paste-from-azure>" --yes
done
vercel deploy --prod
```

**Smoke test:** log out + log back in via `/login` to verify the OAuth
flow. Then delete the previous client secret entry in Azure Portal.

### 2.4 Resend API key — **Skip if not used**

> Applies if you've added `RESEND_API_KEY` to your `.env.example`.

> **No overlap window.** A revoked Resend key stops working immediately —
> create the new key before removing the old one.

```text
1. resend.com → API Keys → Create API Key
2. Name: "<project>-prod-YYYY-MM-DD"; Permission: Sending access
3. Copy the value (only shown once)
```

```bash
for ENV in production preview development; do
  vercel env rm RESEND_API_KEY "$ENV" --yes
  vercel env add RESEND_API_KEY "$ENV" --value "<paste>" --yes
done
vercel deploy --prod
```

**Smoke test:** trigger a code path that sends mail and confirm delivery in
the Resend dashboard logs. Then revoke the old key in Resend.

### 2.5 Sentry DSN / auth token — **Skip if not used**

> Applies if you've set `PUBLIC_SENTRY_DSN` / `SENTRY_AUTH_TOKEN`.

The **DSN** is a public client-side identifier; rotation isn't required for
secrecy but you'll change it when you move to a new Sentry project. The
**auth token** is private and is what you rotate on suspected compromise.

```text
1. Sentry → Settings → Auth Tokens → Create New Token
2. Scopes: org:read, project:releases (adapt to what your CI needs)
3. Copy immediately
```

```bash
for ENV in production preview development; do
  vercel env rm SENTRY_AUTH_TOKEN "$ENV" --yes
  vercel env add SENTRY_AUTH_TOKEN "$ENV" --value "<paste>" --yes
done
vercel deploy --prod
```

Then revoke the old token in Sentry.

## 3. Incident-driven rotation

If a secret has plausibly leaked (committed accidentally, posted in a chat,
ex-contractor with access, malicious dependency):

1. **Rotate immediately** using the procedure above. Do not wait for cadence.
2. **Revoke the old credential at the provider** — removing it from Vercel
   is not enough on its own (the provider would still honour the old value).
3. **Audit usage** since the earliest plausible leak time — check whichever
   of these you use:
   - **Neon:** dashboard → SQL Editor → Postgres logs / connection history.
   - **Azure AD:** Portal → Sign-in logs → filter by the app's client ID.
   - **Resend:** dashboard → Logs (delivery + API activity).
   - **Sentry:** Audit Log under organisation settings.
4. **Document** the incident in `docs/incidents/YYYY-MM-DD-<short-name>.md`:
   timeline, blast radius, what was rotated, follow-up actions.
5. If user data may have been read (`DATABASE_URL` leak), notify affected
   users per your org's data-incident policy.

## 4. Local development

- `vercel env pull .env.local` is the single source of truth for local env.
  Never commit `.env.local` (already in `.gitignore`).
- After any rotation that lands in Vercel, every developer re-pulls:

  ```bash
  vercel env pull .env.local
  ```

- If a teammate's `.env.local` itself leaks, rotate per §3 — their local
  copy becomes worthless once you rotate.

## 5. Maintenance schedule

Add a recurring calendar item for the on-call rotation owner:

- **Quarterly (start of each quarter):** check key expiry dates at every
  provider you use. Rotate any credential within 60 days of expiry.
- **Annual:** review this inventory against `.env.example`. Confirm:
  - no orphaned secrets in Vercel (env vars that no longer correspond to a
    `.env.example` entry),
  - every secret here is owned by exactly one provider account that the
    team still controls,
  - the rotation cadence column still matches the team's risk tolerance.

## 6. Rotation log

Append one line per rotation. Keep this section in chronological order,
oldest first.

| Date      | Secret           | Rotated by | Reason    | Notes                     |
| --------- | ---------------- | ---------- | --------- | ------------------------- |
| _example_ | `SESSION_SECRET` | _name_     | _cadence_ | _all sessions logged out_ |
