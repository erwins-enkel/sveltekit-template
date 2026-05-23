import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

// Ensure env vars expected by `$env/dynamic/private` are present before Vite
// loads any user modules.
process.env.DATABASE_URL ??= 'postgres://localhost/test';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.ts'],
		environment: 'node',
		globals: false,
		setupFiles: ['./vitest.setup.ts']
	}
});
