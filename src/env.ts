import { defineEnvVars } from '@sveltejs/kit/env';
import * as v from 'valibot';

/**
 * Treat empty strings (placeholder `.env` entries) as "unset", otherwise validate with `schema`.
 */
const optional = <T>(schema: v.GenericSchema<string, T>) =>
	v.pipe(
		v.optional(v.string()),
		v.transform((value) => value || undefined),
		v.optional(schema)
	);

/**
 * Environment contract. SvelteKit validates these when the app starts, so a misconfigured deploy
 * fails fast and loudly instead of surfacing as a confusing runtime error later. Add new vars here
 * and import them from `$app/env/private` (server-only) or `$app/env/public` (`public: true`).
 */
export const variables = defineEnvVars({
	DATABASE_URL: {
		schema: v.pipe(v.string('DATABASE_URL is required'), v.nonEmpty('DATABASE_URL is required'))
	},
	APP_URL: {
		schema: optional(v.pipe(v.string(), v.url('APP_URL must be a valid URL')))
	},
	SESSION_SECRET: {
		schema: optional(
			v.pipe(v.string(), v.minLength(32, 'SESSION_SECRET must be at least 32 characters'))
		)
	},
	PUBLIC_SENTRY_DSN: {
		public: true,
		schema: optional(v.string())
	}
});
