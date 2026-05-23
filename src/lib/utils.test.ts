import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
	it('merges class lists', () => {
		expect(cn('a', 'b')).toBe('a b');
	});

	it('deduplicates conflicting tailwind classes', () => {
		expect(cn('p-2', 'p-4')).toBe('p-4');
	});

	it('drops falsy values', () => {
		const skip = false as boolean;
		expect(cn('a', skip && 'b', undefined, 'c')).toBe('a c');
	});
});
