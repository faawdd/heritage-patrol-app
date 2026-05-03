<template>
	<view class="page">
		<view class="notice">
			<text class="kicker">{{ t('kml.heroLabel') }}</text>
			<text class="title">{{ t('kml.title') }}</text>
			<text class="desc">{{ t('kml.subtitle') }}</text>
		</view>
		<web-view :src="url"></web-view>
		<BottomNav current="admin" />
	</view>
</template>

<script>
	import config from '../../common/js/config.js';
	import createPageI18n from '../../common/js/pageI18n.js';
	import BottomNav from '../../components/BottomNav.vue';

	export default {
		mixins: [createPageI18n('kml')],
		components: {
			BottomNav,
		},
		data() {
			return {
				url: `${config.WEB_BASE_URL}/admin/kml-overlay-check/`,
			};
		},
		onLoad(options) {
			if (options && options.url) {
				this.url = decodeURIComponent(options.url);
			}
		}
	}
</script>

<style>
	.page {
		min-height: 100vh;
		padding-bottom: calc(184rpx + env(safe-area-inset-bottom));
		padding-bottom: calc(184rpx + constant(safe-area-inset-bottom));
		background: var(--bg-primary);
	}
	.notice {
		min-height: var(--topbar-min-height);
		width: 100%;
		box-sizing: border-box;
		padding: var(--card-padding);
		background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
		color: #fff;
		box-shadow: var(--shadow-strong);
	}
	.kicker {
		display: block;
		font-size: 20rpx;
		letter-spacing: 3rpx;
		text-transform: uppercase;
		opacity: 0.72;
		margin-bottom: 10rpx;
	}
	.title {
		display: block;
		font-size: var(--title-xl);
		font-weight: 700;
		margin-bottom: 10rpx;
	}
	.desc {
		display: block;
		font-size: 14px;
		line-height: 1.6;
		opacity: 0.9;
	}
</style>
