<template>
	<div class="app-header" :class="{ tall }">
		<div class="app-header-bar">
			<van-button v-if="back" native-type="button" class="app-header-back" aria-label="返回" @click="goBack">
				<AppIcon name="chevron-right" :size="48" color="#FFFFFF" :stroke="2.6" class="flip" />
			</van-button>
			<div class="app-header-text">
				<span class="app-header-title">{{ title }}</span>
				<span v-if="subtitle" class="app-header-sub">{{ subtitle }}</span>
			</div>
			<div class="app-header-right">
				<slot name="right" />
			</div>
		</div>
		<slot />
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

<style>
	.app-header {
		position: relative;
		padding: calc(env(safe-area-inset-top, 0px) + 8px) 16px 14px;
		background: linear-gradient(150deg, #2A6BC2 0%, #1E5AA8 45%, #0F2F5C 100%);
		color: #FFFFFF;
		overflow: hidden;
	}

	.app-header::after {
		content: '';
		position: absolute;
		right: -60px;
		top: -40px;
		width: 210px;
		height: 210px;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0) 70%);
		pointer-events: none;
	}

	.app-header.tall {
		padding-bottom: 56px;
	}

	.app-header-bar {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		min-height: 44px;
		gap: 8px;
	}

	.app-header-back {
		width: 40px;
		height: 40px;
		margin-left: -8px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: none;
		padding: 0;
	}

	.app-header-back .flip {
		transform: rotate(180deg);
	}

	.app-header-text {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.app-header-title {
		font-size: 20px;
		font-weight: 800;
		letter-spacing: 0.5px;
		line-height: 1.3;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.app-header-sub {
		margin-top: 2px;
		font-size: 13px;
		color: rgba(255, 255, 255, 0.82);
	}

	.app-header-right {
		display: flex;
		align-items: center;
	}

	.app-header > :not(.app-header-bar) {
		position: relative;
		z-index: 1;
	}
</style>
