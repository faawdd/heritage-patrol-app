<template>
	<view :class="['bottom-nav', navItems.length > 4 ? 'bottom-nav-compact' : '']">
		<view
			v-for="item in navItems"
			:key="item.key"
			:class="['nav-item', current === item.key ? 'active' : '']"
			@click="go(item.url, item.key)"
		>
			<view class="nav-icon-shell">
				<view :class="['nav-icon', `nav-icon-${item.key}`]"></view>
			</view>
			<text class="nav-text">{{ item.name }}</text>
		</view>
	</view>
</template>

<script>
	import { getUser } from '../common/js/auth.js';
	import { t as translate } from '../common/js/i18n.js';

	export default {
		name: 'BottomNav',
		props: {
			current: {
				type: String,
				default: 'home',
			},
			userInfo: {
				type: Object,
				default: null,
			},
		},
		data() {
			return {
				user: this.userInfo || getUser() || {},
			};
		},
		watch: {
			userInfo: {
				deep: true,
				handler(value) {
					if (value) {
						this.user = value;
					}
				},
			},
		},
		computed: {
			isAdmin() {
				if (!this.user) {
					return false;
				}
				return !!this.user.is_admin || this.user.role === '管理员' || this.user.role === '超级管理员';
			},
			navItems() {
				const items = [
					{ key: 'home', name: this.t('bottomNav.home'), url: '/pages/home/home' },
					{ key: 'patrol', name: this.t('bottomNav.patrol'), url: '/pages/patrol/patrol' },
					{ key: 'records', name: this.t('bottomNav.records'), url: '/pages/records/records' },
				];
				if (this.isAdmin) {
					items.push({ key: 'admin', name: this.t('bottomNav.admin'), url: '/pages/admin/admin' });
				}
				items.push({ key: 'my', name: this.t('bottomNav.my'), url: '/pages/my/my' });
				return items;
			},
		},
		methods: {
			t(key, params) {
				return translate(key, 'zh', params);
			},
			go(url, key) {
				if (this.current === key) {
					return;
				}
				uni.reLaunch({ url });
			},
		},
	};
</script>

<style>
	.bottom-nav {
		--nav-item-height: 108rpx;
		--nav-item-padding-x: 6rpx;
		--nav-item-padding-y: 8rpx;
		--nav-icon-size: 40rpx;
		--nav-icon-shell-size: 44rpx;
		--nav-text-size: 22rpx;
		--nav-text-line-height: 1.25;
		--nav-text-block-height: 38rpx;
		--nav-stroke: 3rpx;
		--nav-bar-height: 136rpx;
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		height: calc(var(--nav-bar-height) + env(safe-area-inset-bottom));
		height: calc(var(--nav-bar-height) + constant(safe-area-inset-bottom));
		padding: 10rpx 18rpx calc(10rpx + env(safe-area-inset-bottom));
		padding: 10rpx 18rpx calc(10rpx + constant(safe-area-inset-bottom));
		background: rgba(255, 255, 255, 0.98);
		border-top: 1rpx solid rgba(51, 65, 85, 0.1);
		display: flex;
		align-items: stretch;
		justify-content: space-between;
		backdrop-filter: b4rpx;
		--nav-text-size: 22rpx;
		--nav-text-line-height: 1.25;
		--nav-text-block-height: 38rpx;
		--nav-bar-height: 136rpx;
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		height: calc(var(--nav-bar-height) + env(safe-area-inset-bottom));
		padding: 10rpx 18rpx calc(10rpx + env(safe-area-inset-bottom));
		background: rgba(255, 255, 255, 0.98);
		border-top: 1rpx solid rgba(51, 65, 85, 0.1);
		display: flex;
		align-items: stretch;
		justify-content: space-between;
		backdrop-filter: blur(18rpx);
		box-shadow: 0 -10rpx 30rpx rgba(15, 23, 42, 0.06);
		z-index: 999;
		box-sizing: border-box;
	}
	.bottom-nav-compact {
		--nav-text-size: 20rpx;
	}
	.bottom-nav-compact .nav-item {
		padding: var(--nav-item-padding-y) var(--nav-item-padding-x);
	}
	.nav-item {
		flex: 1 1 0;
		min-height: var(--nav-item-height);
		padding: var(--nav-item-padding-y) var(--nav-item-padding-x);
		border-radius: 20rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2rpx;
		transition: all 180ms ease;
		min-width: 0;
		box-sizing: border-box;
		overflow: visible;
	}
	.nav-item.active {
		background: linear-gradient(180deg, rgba(9, 92, 219, 0.14) 0%, rgba(9, 92, 219, 0.08) 100%);
	}
	.nav-icon-shell {
		width: var(--nav-icon-size);
		height: var(--nav-icon-size);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	.nav-icon {
		width: 100%;
		height: 100%;
		background-color: var(--text-secondary);
		transition: all 180ms ease;
		mask-repeat: no-repeat;
		mask-position: center;
		mask-size: contain;
	}
	.nav-icon-home {
		mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='currentColor' d='M12 2L2 12h3v8h14v-8h3L12 2zm0 2.24L17.76 9H6.24L12 4.24zM17 18H7v-6h10v6z'/%3E%3C/svg%3E");
	}
	.nav-icon-patrol {
		mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='currentColor' d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/%3E%3C/svg%3E");
	}
	.nav-icon-records {
		mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='currentColor' d='M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z'/%3E%3C/svg%3E");
	}
	.nav-icon-admin {
		mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='currentColor' d='M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z'/%3E%3C/svg%3E");
	}
	.nav-icon-my {
		mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='currentColor' d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E");
	}
	.nav-text {
		display: -webkit-box;
		width: 100%;
		height: var(--nav-text-block-height);
		font-size: var(--nav-text-size);
		color: var(--text-secondary);
		transition: all 180ms ease;
		line-height: var(--nav-text-line-height);
		white-space: normal;
		word-break: keep-all;
		overflow-wrap: anywhere;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		text-align: center;
		padding: 0 4rpx;
		box-sizing: border-box;
	}
	.nav-item.active .nav-icon,
	.nav-item.active .nav-text {
		color: var(--accent);
	}
	.nav-item.active .nav-icon {
		background-color: var(--accent);
	}
	@media screen and (min-width: 768px) {
		.bottom-nav {
			--nav-item-height: 112rpx;
			--nav-icon-size: 42rpx;
			--nav-text-size: 20rpx;
			--nav-text-block-height: 34rpx;
			--nav-bar-height: 140rpx;
		}
		.bottom-nav-compact {
			--nav-text-size: 18rpx;
		}
	}
	@media screen and (max-width: 375px) {
		.bottom-nav {
			--nav-item-height: 98rpx;
			--nav-icon-size: 40rpx;
			--nav-text-size: 19rpx;
			--nav-text-block-height: 34rpx;
			--nav-item-padding-y: 6rpx;
			--nav-item-padding-x: 2rpx;
			--nav-bar-height: 128rpx;
		}
		.bottom-nav-compact {
			--nav-text-size: 18rpx;
		}
	}
	.nav-item.active .nav-icon {
		animation: navPulse 900ms ease-out;
	}
	.nav-item.active .nav-text {
		font-weight: 700;
	}
	@keyframes navPulse {
		0% {
			transform: scale(0.9);
			opacity: 0.6;
		}
		50% {
			transform: scale(1.15);
			opacity: 1;
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}
</style>