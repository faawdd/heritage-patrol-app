<template>
	<view class="u-page">
		<AppHeader title="关于软件" back />
		<view class="u-body body">
			<view class="u-card brand">
				<view class="logo">
					<AppIcon name="landmark" :size="88" color="#FFFFFF" :stroke="1.8" />
				</view>
				<text class="app-name">鄯善文保巡查</text>
				<text class="app-ver">版本 {{ version }}</text>
			</view>

			<view class="u-card list">
				<view class="row">
					<text class="row-label">作者</text>
					<text class="row-value">北辰</text>
				</view>
				<view class="row" @click="call">
					<text class="row-label">手机</text>
					<text class="row-value link">13899665458</text>
				</view>
				<view class="row">
					<text class="row-label">邮箱</text>
					<text class="row-value">w1443469207@163.com</text>
				</view>
				<view class="row">
					<text class="row-label">说明</text>
					<text class="row-value">本软件仅供内部使用</text>
				</view>
			</view>
			<text class="tip">如有建议或发现问题，欢迎联系反馈</text>
		</view>
	</view>
</template>

<script>
	import AppHeader from '../../components/AppHeader.vue';
	import AppIcon from '../../components/AppIcon.vue';

	export default {
		components: { AppHeader, AppIcon },
		data() {
			return { version: '1.0.0' };
		},
		onLoad() {
			// #ifdef APP-PLUS
			if (typeof plus !== 'undefined' && plus.runtime && plus.runtime.version) {
				this.version = plus.runtime.version;
			}
			// #endif
		},
		methods: {
			call() {
				uni.makePhoneCall({ phoneNumber: '13899665458', fail: () => null });
			},
		},
	};
</script>

<style>
	.body {
		padding-top: 28rpx;
	}

	.brand {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 48rpx 32rpx;
	}

	.logo {
		width: 160rpx;
		height: 160rpx;
		border-radius: 44rpx;
		background: linear-gradient(150deg, #2A6BC2, #0F2F5C);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.app-name {
		margin-top: 24rpx;
		font-size: 44rpx;
		font-weight: 800;
		color: #0F172A;
	}

	.app-ver {
		margin-top: 6rpx;
		font-size: 30rpx;
		color: #64748B;
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24rpx;
		min-height: 104rpx;
		border-bottom: 2rpx solid #EEF2F7;
	}

	.row:last-child {
		border-bottom: none;
	}

	.row-label {
		font-size: 32rpx;
		color: #64748B;
		flex-shrink: 0;
	}

	.row-value {
		font-size: 32rpx;
		color: #0F172A;
		text-align: right;
		word-break: break-all;
	}

	.row-value.link {
		color: #1E5AA8;
		font-weight: 700;
	}

	.tip {
		display: block;
		text-align: center;
		font-size: 28rpx;
		color: #94A3B8;
	}
</style>
