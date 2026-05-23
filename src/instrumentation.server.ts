import * as Sentry from '@sentry/sveltekit';
import { env } from '$env/dynamic/public';

/**
 * Server-side Sentry init. SvelteKit loads this file early because
 * `kit.experimental.instrumentation.server` is enabled in svelte.config.js.
 *
 * `PUBLIC_SENTRY_DSN` is optional: when it's unset (fresh clone, CI) the SDK
 * initializes as a no-op, so nothing is sent and the build stays green.
 */
Sentry.init({
	dsn: env.PUBLIC_SENTRY_DSN,
	environment: import.meta.env.MODE,
	// 100% locally, sample down in production.
	tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
	enableLogs: true
});
