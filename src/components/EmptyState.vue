<template>
	<div class="empty-state">
		<svg class="empty-illustration" viewBox="0 0 120 84" fill="none" aria-hidden="true">
			<circle cx="60" cy="40" r="36" class="empty-halo" />
			<g stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M25 67h70M33 59h54M38 31l22-14 22 14v4H38zM42 35v24m12-24v24m12-24v24m12-24v24" />
				<path d="M24 24h7m-3.5-3.5v7M87 15h5m-2.5-2.5v5" class="empty-detail" />
			</g>
		</svg>
		<span class="empty-message">{{ message }}</span>
		<span v-if="hint" class="empty-hint">{{ hint }}</span>
		<slot />
	</div>
</template>

<script setup>
defineProps({
	message: { type: String, required: true },
	hint: { type: String, default: '' },
});
</script>

<style scoped>
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 1.5rem 1rem; text-align: center; }
.empty-illustration { width: 7.5rem; height: 5.25rem; color: var(--c-text-3); }
.empty-halo { fill: var(--c-primary-light); }
.empty-detail { color: var(--c-warning); }
.empty-message { color: var(--c-text-2); font-size: 0.9375rem; font-weight: 600; }
.empty-hint { color: var(--c-text-3); font-size: 0.8125rem; line-height: 1.5; }
</style>
