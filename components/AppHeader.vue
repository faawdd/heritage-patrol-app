<template>
	<view class="app-header" :class="{ tall }" :style="{ paddingTop: `${statusBar + 12}px` }">
		<view class="app-header-bar">
			<view v-if="back" class="app-header-back" @click="goBack">
				<AppIcon name="chevron-right" :size="48" color="#FFFFFF" :stroke="2.6" class="flip" />
			</view>
			<view class="app-header-text">
				<text class="app-header-title">{{ title }}</text>
				<text v-if="subtitle" class="app-header-sub">{{ subtitle }}</text>
			</view>
			<view class="app-header-right">
				<slot name="right" />
			</view>
		</view>
		<slot />
	</view>
</template>

<script>
	import AppIcon from './AppIcon.vue';

	export default {
		name: 'AppHeader',
		components: { AppIcon },
		props: {
			title: { type: String, default: '' },
			subtitle: { type: String, default: '' },
			back: { type: Boolean, default: false },
			tall: { type: Boolean, default: false },
		},
		data() {
			let statusBar = 0;
			try {
				statusBar = uni.getSystemInfoSync().statusBarHeight || 0;
			} catch (error) {
				statusBar = 0;
			}
			return { statusBar };
		},
		methods: {
			goBack() {
				const pages = getCurrentPages();
				if (pages.length > 1) {
					uni.navigateBack();
				} else {
					uni.reLaunch({ url: '/pages/home/home' });
				}
			},
		},
	};
</script>

<style>
	.app-header {
		position: relative;
		padding: 0 32rpx 36rpx;
		background: linear-gradient(150deg, #2A6BC2 0%, #1E5AA8 45%, #0F2F5C 100%);
		color: #FFFFFF;
		overflow: hidden;
	}

	.app-header::after {
		content: '';
		position: absolute;
		right: -120rpx;
		top: -80rpx;
		width: 420rpx;
		height: 420rpx;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0) 70%);
		pointer-events: none;
	}

	.app-header.tall {
		padding-bottom: 120rpx;
	}

	.app-header-bar {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		min-height: 96rpx;
		gap: 16rpx;
	}

	.app-header-back {
		width: 80rpx;
		height: 80rpx;
		margin-left: -16rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.flip {
		transform: rotate(180deg);
	}

	.app-header-text {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.app-header-title {
		font-size: 44rpx;
		font-weight: 800;
		letter-spacing: 2rpx;
		line-height: 1.3;
	}

	.app-header-sub {
		margin-top: 6rpx;
		font-size: 28rpx;
		color: rgba(255, 255, 255, 0.82);
	}

	.app-header-right {
		display: flex;
		align-items: center;
	}
</style>
