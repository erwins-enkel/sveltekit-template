import { sequence } from '@sveltejs/kit/hooks';
import { sentryHandle, handleErrorWithSentry } from '@sentry/sveltekit';
import type { Handle } from '@sveltejs/kit';

/**
 * App request hook. Runs on every request after `sentryHandle()`. The current
 * implementation is a no-op pass-through that exists so the file is wired in
 * from day one — add request logging, feature flags, etc. here.
 *
 * Auth pattern (BetterAuth is the blessed auth path — see README → "Adding
 * authentication"):
 *
 *   import { auth } from '$lib/server/auth';
 *   import { svelteKitHandler } from 'better-auth/svelte-kit';
 *   import { building } from '$app/environment';
 *   const handleAuth: Handle = async ({ event, resolve }) => {
 *     const session = await auth.api.getSession({ headers: event.request.headers });
 *     event.locals.user = session?.user ?? null;
 *     if (!event.locals.user && !isPublicPath(event.url.pathname)) redirect(302, '/login');
 *     return svelteKitHandler({ event, resolve, auth, building });
 *   };
 */
const handleApp: Handle = async ({ event, resolve }) => {
	return resolve(event);
};

// `sentryHandle()` must run first so it can capture errors from later handlers.
export const handle = sequence(sentryHandle(), handleApp);

export const handleError = handleErrorWithSentry();
