import type { Handle } from '@sveltejs/kit';

/**
 * Server-side request hook. Runs on every request before the route handler.
 *
 * Add your auth provider, request logging, feature flags, etc. here. The
 * current implementation is a no-op pass-through that exists so the file
 * is wired into SvelteKit from day one.
 *
 * Example pattern (per-user auth):
 *
 *   export const handle: Handle = async ({ event, resolve }) => {
 *     event.locals.user = await readSession(event.cookies);
 *     if (!event.locals.user && !isPublicPath(event.url.pathname)) {
 *       redirect(302, '/login');
 *     }
 *     return resolve(event);
 *   };
 */
export const handle: Handle = async ({ event, resolve }) => {
	return resolve(event);
};
