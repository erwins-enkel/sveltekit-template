import * as v from 'valibot';
import { env as privateEnv } from '$env/dynamic/private';

/**
 * Validated server environment. Parsed once at module load so a misconfigured
 * deploy fails fast and loudly instead of surfacing as a confusing runtime
 * error later. Add new required server vars to the schema below.
 *
 * Public (client-visible) vars belong in `$env/dynamic/public`, not here.
 */
const EnvSchema = v.object({
	DATABASE_URL: v.pipe(v.string(), v.nonEmpty('DATABASE_URL is required')),
	APP_URL: v.optional(v.pipe(v.string(), v.url('APP_URL must be a valid URL'))),
	SESSION_SECRET: v.optional(
		v.pipe(v.string(), v.minLength(32, 'SESSION_SECRET must be at least 32 characters'))
	)
});

export type Env = v.InferOutput<typeof EnvSchema>;

/**
 * Validate a raw env source against the schema. Throws an aggregated error
 * listing every problem. Exported so it can be unit-tested without touching
 * the real process environment.
 */
export function parseEnv(source: Record<string, string | undefined>): Env {
	const result = v.safeParse(EnvSchema, {
		DATABASE_URL: source.DATABASE_URL,
		// Treat empty strings (placeholder `.env` entries) as "unset".
		APP_URL: source.APP_URL || undefined,
		SESSION_SECRET: source.SESSION_SECRET || undefined
	});

	if (!result.success) {
		const issues = result.issues
			.map((issue) => `  - ${v.getDotPath(issue) ?? '(root)'}: ${issue.message}`)
			.join('\n');
		throw new Error(`Invalid environment configuration:\n${issues}`);
	}

	return result.output;
}

export const env = parseEnv(privateEnv);
