import { sentrySvelteKit } from '@sentry/sveltekit/vite';
import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// Source-map upload to Sentry only runs when a build-time auth token is set
// (real deploys). Local dev and CI build without it, so they stay clean and
// don't need the Sentry CLI binary. Set SENTRY_AUTH_TOKEN/ORG/PROJECT to enable.
const sentryPlugins = process.env.SENTRY_AUTH_TOKEN
	? [
			sentrySvelteKit({
				org: process.env.SENTRY_ORG,
				project: process.env.SENTRY_PROJECT,
				authToken: process.env.SENTRY_AUTH_TOKEN
			})
		]
	: [];

export default defineConfig({
	// `sentrySvelteKit()` must come before `sveltekit()`.
	plugins: [
		...sentryPlugins,
		tailwindcss(),
		sveltekit({
			preprocess: vitePreprocess(),

			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Keep `$lib` (removed by default in SvelteKit 3 in favour of `#lib`) — shadcn-svelte's
			// generated components import from it.
			alias: { $lib: 'src/lib' },

			// Node 22 runtime on Vercel. Change `regions` for your deployment.
			adapter: adapter({
				runtime: 'nodejs22.x',
				regions: ['fra1']
			}),

			// Enables Sentry server tracing. `src/instrumentation.server.ts` is
			// picked up automatically.
			tracing: {
				server: true
			}
		})
	]
});
