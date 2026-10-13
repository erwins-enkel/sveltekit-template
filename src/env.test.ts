import { describe, expect, it } from 'vitest';
import * as v from 'valibot';
import { variables } from './env';

const parse = (name: keyof typeof variables, value: string | undefined) =>
	v.safeParse(variables[name].schema as v.GenericSchema<string | undefined, unknown>, value);

describe('env variables', () => {
	it('accepts a valid environment', () => {
		expect(parse('DATABASE_URL', 'postgres://user:pass@host/db').output).toBe(
			'postgres://user:pass@host/db'
		);
		expect(parse('APP_URL', 'https://example.com').output).toBe('https://example.com');
		expect(parse('SESSION_SECRET', 'a'.repeat(32)).success).toBe(true);
	});

	it('treats empty optionals as unset', () => {
		expect(parse('APP_URL', '')).toMatchObject({ success: true, output: undefined });
		expect(parse('SESSION_SECRET', '')).toMatchObject({ success: true, output: undefined });
		expect(parse('PUBLIC_SENTRY_DSN', '')).toMatchObject({ success: true, output: undefined });
	});

	it('rejects a missing or empty DATABASE_URL', () => {
		expect(parse('DATABASE_URL', undefined).success).toBe(false);
		expect(parse('DATABASE_URL', '').success).toBe(false);
	});

	it('rejects a short SESSION_SECRET', () => {
		expect(parse('SESSION_SECRET', 'short').success).toBe(false);
	});
});
