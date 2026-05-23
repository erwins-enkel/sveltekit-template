<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
</script>

<!-- Default error boundary. Localize the copy below per project. -->
<main class="grid min-h-svh place-items-center p-6 text-center">
	<div class="space-y-3">
		<p class="text-6xl font-bold tabular-nums">{page.status}</p>
		<h1 class="text-xl font-semibold">
			{page.error?.message ?? 'Something went wrong'}
		</h1>
		<a href={resolve('/')} class="inline-block text-sm underline underline-offset-4">Back to home</a
		>
	</div>
</main>
