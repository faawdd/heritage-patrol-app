<template>
	<div class="relative overflow-hidden border-b border-line bg-surface px-4 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] text-ink" :class="tall ? 'pb-14' : 'pb-3.5'">
		<div class="relative z-[1] flex min-h-11 items-center gap-2">
			<van-button v-if="back" native-type="button" class="!m-0 !-ml-2 !flex !h-11 !w-11 !shrink-0 !items-center !justify-center !border-0 !bg-transparent !p-0" aria-label="返回" @click="goBack">
				<AppIcon name="chevron-right" :size="48" color="var(--c-text)" :stroke="2.6" class="rotate-180" />
			</van-button>
			<div class="flex min-w-0 flex-1 flex-col">
				<span class="overflow-hidden text-ellipsis whitespace-nowrap text-[1.0625rem] font-semibold leading-[1.3] tracking-[0.0125rem]">{{ title }}</span>
				<span v-if="subtitle" class="mt-0.5 text-xs text-ink-3">{{ subtitle }}</span>
			</div>
			<div class="flex items-center">
				<slot name="right" />
			</div>
		</div>
		<div class="relative z-[1]"><slot /></div>
	</div>
</template>

<script>
	// 渐变色自定义头部随页面内容滚动。
	import AppIcon from './AppIcon.vue';
	import { navigateBack } from '@/lib/nav.js';

	export default {
		name: 'AppHeader',
		components: { AppIcon },
		props: {
			title: { type: String, default: '' },
			subtitle: { type: String, default: '' },
			back: { type: Boolean, default: false },
			tall: { type: Boolean, default: false },
		},
		methods: {
			goBack() {
				navigateBack('/tabs/home');
			},
		},
	};
</script>

