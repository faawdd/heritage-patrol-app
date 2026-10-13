<template>
	<view class="tabbar">
		<view
			v-for="item in navItems"
			:key="item.key"
			class="tab"
			:class="{ active: current === item.key, main: item.main }"
			@click="go(item)"
		>
			<view v-if="item.main" class="tab-main">
				<AppIcon name="camera" :size="56" color="#FFFFFF" :stroke="2.2" />
			</view>
			<AppIcon v-else :name="item.icon" :size="52" :color="current === item.key ? '#1E5AA8' : '#64748B'" :stroke="current === item.key ? 2.4 : 2" />
			<text class="tab-text">{{ item.name }}</text>
		</view>
	</view>
</template>

<script>
	import AppIcon from './AppIcon.vue';
	import { getUser, isAdminUser } from '../common/js/auth.js';

	export default {
		name: 'BottomNav',
		components: { AppIcon },
		props: {
			current: { type: String, default: 'home' },
			userInfo: { type: Object, default: null },
		},
		computed: {
			user() {
				return this.userInfo || getUser() || {};
			},
			navItems() {
				const items = [
					{ key: 'home', name: '首页', icon: 'home', url: '/pages/home/home' },
					{ key: 'records', name: '记录', icon: 'records', url: '/pages/records/records' },
					{ key: 'patrol', name: '巡查上报', icon: 'camera', url: '/pages/patrol/patrol', main: true },
				];
				if (isAdminUser(this.user)) {
					items.push({ key: 'admin', name: '管理', icon: 'grid', url: '/pages/admin/admin' });
				}
				items.push({ key: 'my', name: '我的', icon: 'user', url: '/pages/my/my' });
				return items;
			},
		},
		methods: {
			go(item) {
				if (this.current === item.key) {
					return;
				}
				uni.reLaunch({ url: item.url });
			},
		},
	};
</script>

<style>
	.tabbar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 900;
		display: flex;
		align-items: flex-end;
		padding: 12rpx 8rpx calc(12rpx + env(safe-area-inset-bottom));
		background: #FFFFFF;
		border-top: 1rpx solid #E2E8F0;
		box-shadow: 0 -8rpx 32rpx rgba(15, 47, 92, 0.08);
	}

	.tab {
		flex: 1;
		min-width: 0;
		height: 128rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6rpx;
	}

	.tab-text {
		font-size: 28rpx;
		color: #64748B;
		line-height: 1.2;
		white-space: nowrap;
	}

	.tab.active .tab-text {
		color: #1E5AA8;
		font-weight: 800;
	}

	.tab.main {
		justify-content: flex-end;
	}

	.tab-main {
		width: 116rpx;
		height: 116rpx;
		margin-top: -56rpx;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #2A6BC2 0%, #1E5AA8 60%, #174B8F 100%);
		border: 8rpx solid #FFFFFF;
		box-shadow: 0 10rpx 28rpx rgba(30, 90, 168, 0.4);
	}

	.tab.main .tab-text {
		color: #1E5AA8;
		font-weight: 800;
	}

	.tab:active {
		opacity: 0.75;
	}
</style>
