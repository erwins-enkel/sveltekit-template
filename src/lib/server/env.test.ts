import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

describe('parseEnv', () => {
	it('accepts a valid environment', () => {
		const env = parseEnv({
			DATABASE_URL: 'postgres://user:pass@host/db',
			APP_URL: 'https://example.com',
			SESSION_SECRET: 'a'.repeat(32)
		});
		expect(env.DATABASE_URL).toBe('postgres://user:pass@host/db');
		expect(env.APP_URL).toBe('https://example.com');
	});

	it('treats empty optionals as unset', () => {
		const env = parseEnv({ DATABASE_URL: 'postgres://host/db', APP_URL: '', SESSION_SECRET: '' });
		expect(env.APP_URL).toBeUndefined();
		expect(env.SESSION_SECRET).toBeUndefined();
	});

	it('throws when DATABASE_URL is missing', () => {
		expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
	});

	it('throws when SESSION_SECRET is too short', () => {
		expect(() => parseEnv({ DATABASE_URL: 'postgres://host/db', SESSION_SECRET: 'short' })).toThrow(
			/SESSION_SECRET/
		);
	});
});
