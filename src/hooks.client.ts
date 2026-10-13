import * as Sentry from '@sentry/sveltekit';
import { handleErrorWithSentry } from '@sentry/sveltekit';
import { PUBLIC_SENTRY_DSN } from '$app/env/public';

/**
 * Client-side Sentry init. Kept minimal — no Session Replay. Enable
 * `replayIntegration()` here if you later want it.
 *
 * `PUBLIC_SENTRY_DSN` is optional: unset means the SDK no-ops.
 */
Sentry.init({
	dsn: PUBLIC_SENTRY_DSN,
	environment: import.meta.env.MODE,
	tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
	// Don't send PII (IP, cookies, headers) by default. Flip on if you need it.
	dataCollection: { userInfo: false, cookies: false, httpHeaders: false }
});

export const handleError = handleErrorWithSentry();
