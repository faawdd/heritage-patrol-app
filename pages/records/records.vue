<template>
	<view class="page">
		<view class="hero">
			<view>
				<text class="hero-kicker">{{ t('records.heroLabel') }}</text>
				<text class="hero-title">{{ t('records.title') }}</text>
				<text class="hero-subtitle">{{ t('records.subtitle') }}</text>
			</view>
		</view>

		<view class="summary-card">
			<text class="summary-label">{{ t('records.submittedRecords') }}</text>
			<text class="summary-value">{{ records.length }}</text>
		</view>

		<scroll-view scroll-y class="content-scroll">
			<view v-if="records.length === 0 && !loading" class="empty-card">
				<text class="empty-title">{{ t('records.emptyTitle') }}</text>
				<text class="empty-copy">{{ t('records.emptyCopy') }}</text>
			</view>

			<view v-for="item in records" :key="item.id" class="record-card">
				<view class="record-header">
					<view>
						<text class="record-site">{{ item.site_name }}</text>
						<text class="record-time">{{ item.inspect_time }}</text>
					</view>
					<text :class="['status-chip', item.is_normal ? 'status-normal' : 'status-alert']">
						{{ item.is_normal ? t('records.normal') : t('records.abnormal') }}
					</text>
				</view>
				<text class="record-text">{{ t('records.issueLabel', { detail: item.issue_details || t('common.none') }) }}</text>
				<text class="record-text">{{ t('records.coordLabel', { longitude: formatCoord(item.longitude), latitude: formatCoord(item.latitude) }) }}</text>
				<image v-if="item.photo_url" class="record-image" :src="item.photo_url" mode="aspectFill" @click="previewImage(item.photo_url)"></image>
			</view>
		</scroll-view>

		<BottomNav current="records" />
	</view>
</template>

<script>
	import config from '../../common/js/config.js';
	import { getAuthHeader, getToken } from '../../common/js/auth.js';
	import createPageI18n from '../../common/js/pageI18n.js';
	import BottomNav from '../../components/BottomNav.vue';

	export default {
		mixins: [createPageI18n('records')],
		components: {
			BottomNav,
		},
		data() {
			return {
				loading: false,
				records: [],
			};
		},
		onLoad() {
			if (!getToken()) {
				uni.reLaunch({ url: '/pages/index/index' });
				return;
			}
			this.loadRecords();
		},
		methods: {
			loadRecords() {
				this.loading = true;
				uni.request({
					url: `${config.API_BASE_URL}/api/inspections/mine`,
					method: 'GET',
					header: getAuthHeader(),
					success: (res) => {
						if (res.statusCode === 200 && res.data) {
							this.records = res.data.items || [];
							return;
						}
						uni.showToast({ title: this.t('records.loadFailed'), icon: 'none' });
					},
					fail: () => {
						uni.showToast({ title: this.t('records.loadFailed'), icon: 'none' });
					},
					complete: () => {
						this.loading = false;
					}
				});
			},
			previewImage(url) {
				uni.previewImage({ urls: [url] });
			},
			formatCoord(value) {
				if (value === null || value === undefined || value === '') {
					return '-';
				}
				return Number(value).toFixed(5);
			}
		}
	}
</script>

<style>
	.page {
		min-height: 100vh;
		padding: 24rpx;
		padding-bottom: calc(184rpx + env(safe-area-inset-bottom));
		padding-bottom: calc(184rpx + constant(safe-area-inset-bottom));
		background: var(--bg-primary);
	}
	.hero {
		display: flex;
		justify-content: flex-start;
		align-items: flex-start;
		min-height: var(--topbar-min-height);
		width: 100%;
		box-sizing: border-box;
		padding: var(--card-padding);
		border-radius: var(--radius-card);
		background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
		color: #fff;
		box-shadow: var(--shadow-strong);
		margin-bottom: 22rpx;
	}
	.hero-kicker {
		display: block;
		font-size: 20rpx;
		letter-spacing: 3rpx;
		text-transform: uppercase;
		opacity: 0.72;
		margin-bottom: 10rpx;
	}
	.hero-title {
		display: block;
		font-size: 20px;
		font-weight: 700;
		margin-bottom: 10rpx;
	}
	.hero-subtitle {
		display: block;
		font-size: 14px;
		line-height: 1.6;
		opacity: 0.88;
	}
	.summary-card {
		background: #fff;
		border-radius: 18rpx;
		border: 1rpx solid var(--line-soft);
		padding: var(--card-padding);
		box-shadow: var(--shadow-soft);
		margin-bottom: 20rpx;
	}
	.summary-label {
		display: block;
		font-size: 14px;
		color: var(--text-secondary);
		margin-bottom: 10rpx;
	}
	.summary-value {
		display: block;
		font-size: 28px;
		font-weight: 700;
		color: var(--accent);
	}
	.content-scroll {
		height: calc(100vh - 360rpx);
	}
	.record-card, .empty-card {
		background: #fff;
		border-radius: 18rpx;
		border: 1rpx solid var(--line-soft);
		padding: var(--card-padding);
		margin-bottom: 20rpx;
		box-shadow: var(--shadow-soft);
	}
	.record-header {
		display: flex;
		justify-content: space-between;
		gap: 16rpx;
		margin-bottom: 16rpx;
	}
	.record-site {
		display: block;
		font-size: 18px;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 8rpx;
	}
	.record-time {
		display: block;
		font-size: 14px;
		color: var(--text-secondary);
	}
	.status-chip {
		padding: 8rpx 16rpx;
		border-radius: 999rpx;
		font-size: 22rpx;
		height: fit-content;
	}
	.status-normal {
		background: rgba(9, 92, 219, 0.14);
		color: var(--accent-strong);
	}
	.status-alert {
		background: var(--danger-soft);
		color: var(--danger);
	}
	.record-text, .empty-copy {
		display: block;
		font-size: 14px;
		line-height: 1.7;
		color: var(--text-secondary);
		margin-bottom: 10rpx;
	}
	.empty-title {
		display: block;
		font-size: 18px;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 10rpx;
	}
	.record-image {
		width: 100%;
		height: 360rpx;
		border-radius: 18rpx;
		margin-top: 12rpx;
	}
</style>
