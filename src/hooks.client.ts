import * as Sentry from '@sentry/sveltekit';
import { handleErrorWithSentry } from '@sentry/sveltekit';
import { env } from '$env/dynamic/public';

/**
 * Client-side Sentry init. Kept minimal — no Session Replay. Enable
 * `replayIntegration()` here if you later want it.
 *
 * `PUBLIC_SENTRY_DSN` is optional: unset means the SDK no-ops.
 */
Sentry.init({
	dsn: env.PUBLIC_SENTRY_DSN,
	environment: import.meta.env.MODE,
	tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
	// Don't send PII (IP, headers) by default. Flip on if you need it.
	sendDefaultPii: false,
	enableLogs: true
});

export const handleError = handleErrorWithSentry();
