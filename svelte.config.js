import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},

	kit: {
		// Node 22 runtime on Vercel. Change `regions` for your deployment.
		adapter: adapter({
			runtime: 'nodejs22.x',
			regions: ['fra1']
		}),
		alias: {
			'$lib/*': 'src/lib/*'
		}
	}
};

export default config;
