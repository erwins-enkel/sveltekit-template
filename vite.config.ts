import { sentrySvelteKit } from '@sentry/sveltekit';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// Source-map upload to Sentry only runs when a build-time auth token is set
// (real deploys). Local dev and CI build without it, so they stay clean and
// don't need the Sentry CLI binary. Set SENTRY_AUTH_TOKEN/ORG/PROJECT to enable.
const sentryPlugins = process.env.SENTRY_AUTH_TOKEN
	? [
			sentrySvelteKit({
				sourceMapsUploadOptions: {
					org: process.env.SENTRY_ORG,
					project: process.env.SENTRY_PROJECT,
					authToken: process.env.SENTRY_AUTH_TOKEN
				}
			})
		]
	: [];

export default defineConfig({
	// `sentrySvelteKit()` must come before `sveltekit()`.
	plugins: [...sentryPlugins, tailwindcss(), sveltekit()]
});
