import * as Sentry from '@sentry/sveltekit';
import { PUBLIC_SENTRY_DSN } from '$app/env/public';

/**
 * Server-side Sentry init. SvelteKit loads this file automatically, before
 * application code.
 *
 * `PUBLIC_SENTRY_DSN` is optional: when it's unset (fresh clone, CI) the SDK
 * initializes as a no-op, so nothing is sent and the build stays green.
 */
Sentry.init({
	dsn: PUBLIC_SENTRY_DSN,
	environment: import.meta.env.MODE,
	// 100% locally, sample down in production.
	tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
	// Don't send PII (IP, cookies, headers) by default. Flip on if you need it.
	dataCollection: { userInfo: false, cookies: false, httpHeaders: false }
});
