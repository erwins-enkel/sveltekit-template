<script lang="ts">
	import { Button } from '$lib/components/ui/button';
</script>

<main class="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 p-8">
	<header class="space-y-2">
		<h1 class="text-3xl font-semibold tracking-tight">SvelteKit Template</h1>
		<p class="text-muted-foreground text-sm">
			SvelteKit 5 + Tailwind 4 + shadcn-svelte + Drizzle + Neon, with CI, release-please,
			Dependabot, and operational runbooks wired up.
		</p>
	</header>

	<section class="space-y-3">
		<p class="text-sm">
			Edit <code class="bg-muted rounded px-1.5 py-0.5">src/routes/+page.svelte</code> to get started.
		</p>
		<div class="flex gap-2">
			<Button href="https://svelte.dev/docs/kit" variant="default">SvelteKit docs</Button>
			<Button href="https://shadcn-svelte.com" variant="outline">shadcn-svelte</Button>
		</div>
	</section>
</main>
