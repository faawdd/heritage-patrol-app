<template>
	<view class="page">
		<view class="header">
			<text class="header-title">我的采集记录</text>
			<text class="header-count">共 {{ total }} 条</text>
		</view>

		<scroll-view scroll-y class="list-scroll" @scrolltolower="loadMore" lower-threshold="100">
			<view v-if="loading && !records.length" class="loading-wrap">
				<text class="loading-text">加载中…</text>
			</view>

			<view v-for="item in records" :key="item.id" class="card">
				<view class="card-left">
					<image v-if="item.cover_url" :src="item.cover_url" mode="aspectFill" class="thumb" />
					<view v-else class="thumb-placeholder">
						<text class="thumb-icon">🏛</text>
					</view>
				</view>
				<view class="card-body">
					<view class="card-row">
						<text class="card-name">{{ item.name }}</text>
						<view class="level-badge">{{ item.protection_level }}</view>
					</view>
					<text class="card-code">编号：{{ item.survey_code }}</text>
					<text class="card-meta">{{ item.era }} · {{ item.category }}</text>
					<text class="card-addr">{{ item.address || '（地址未填）' }}</text>
					<view class="card-footer">
						<text class="card-time">{{ item.collected_at }}</text>
						<text class="card-photos">📷 {{ item.photo_count }} 张</text>
					</view>
					<view class="card-actions">
						<button class="btn-export" @click="exportDocx(item)">导出 DOCX</button>
					</view>
				</view>
			</view>

			<view v-if="!loading && !records.length" class="empty-tip">
				<text class="empty-icon">🗂</text>
				<text class="empty-text">暂无采集记录</text>
				<button class="btn-go-collect" @click="goCollect">去采集</button>
			</view>

			<view v-if="loading && records.length" class="load-more-tip">
				<text>加载中…</text>
			</view>
			<view v-if="!hasMore && records.length" class="load-more-tip">
				<text>— 已显示全部 —</text>
			</view>
		</scroll-view>

		<!-- 右下角快捷按钮 -->
		<view class="fab" @click="goCollect">
			<text class="fab-icon">＋</text>
		</view>
	</view>
</template>

<script>
	import config from '../../common/js/config.js';
	import { getToken } from '../../common/js/auth.js';

	const API = config.API_BASE_URL;
	const PAGE_SIZE = 10;

	export default {
		data() {
			return {
				records: [],
				total: 0,
				page: 1,
				hasMore: true,
				loading: false,
			};
		},

		onLoad() {
			if (!getToken()) {
				uni.reLaunch({ url: '/pages/index/index' });
				return;
			}
			this.fetchRecords(1);
		},

		onPullDownRefresh() {
			this.fetchRecords(1, true).finally(() => uni.stopPullDownRefresh());
		},

		methods: {
			fetchRecords(page = 1, replace = false) {
				if (this.loading) return Promise.resolve();
				this.loading = true;
				return new Promise((resolve) => {
					uni.request({
						url: `${API}/api/collect/my-records`,
						data: { page, page_size: PAGE_SIZE },
						header: { Authorization: `Bearer ${getToken()}` },
						success: (res) => {
							if (res.statusCode === 200) {
								const items = res.data.items || [];
								const pagination = res.data.pagination || {};
								this.total = pagination.total || 0;
								this.hasMore = page < (pagination.total_pages || 1);
								this.page = page;
								if (replace) {
									this.records = items;
								} else {
									this.records = page === 1 ? items : [...this.records, ...items];
								}
							}
						},
						fail: () => {
							uni.showToast({ title: '加载失败，请稍后重试', icon: 'none' });
						},
						complete: () => {
							this.loading = false;
							resolve();
						},
					});
				});
			},

			loadMore() {
				if (!this.loading && this.hasMore) {
					this.fetchRecords(this.page + 1);
				}
			},

			goCollect() {
				uni.navigateTo({ url: '/pages/collect/collect' });
			},

			exportDocx(item) {
				if (!item || !item.id) return;
				uni.showLoading({ title: '导出中…', mask: true });
				uni.downloadFile({
					url: `${API}/api/collect/export-docx/${item.id}`,
					header: { Authorization: `Bearer ${getToken()}` },
					success: (res) => {
						if (res.statusCode !== 200 || !res.tempFilePath) {
							uni.showToast({ title: '导出失败，请重试', icon: 'none' });
							return;
						}
						uni.openDocument({
							filePath: res.tempFilePath,
							fileType: 'docx',
							showMenu: true,
							fail: () => {
								uni.showToast({ title: '文件已下载，请在文件管理中查看', icon: 'none' });
							},
						});
					},
					fail: () => {
						uni.showToast({ title: '网络异常，导出失败', icon: 'none' });
					},
					complete: () => {
						uni.hideLoading();
					},
				});
			},
		},
	};
</script>

<style scoped>
.page {
	background: #f0f4f8;
	min-height: 100vh;
	position: relative;
	padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
	padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
	box-sizing: border-box;
}

.header {
	background: #163F77; padding: 32rpx 32rpx 24rpx;
	display: flex; align-items: baseline; gap: 16rpx;
}
.header-title { font-size: 34rpx; font-weight: 700; color: #fff; }
.header-count  { font-size: 24rpx; color: rgba(255,255,255,.7); }

.list-scroll {
	height: calc(100vh - 140rpx);
	padding: 16rpx;
	padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
	padding-bottom: calc(140rpx + constant(safe-area-inset-bottom));
	box-sizing: border-box;
}

/* 卡片 */
.card {
	display: flex; background: #fff; border-radius: 20rpx;
	margin-bottom: 20rpx; overflow: hidden; box-shadow: 0 1px 6px rgba(0,0,0,.08);
}
.card-left { width: 160rpx; flex-shrink: 0; }
.thumb { width: 160rpx; height: 160rpx; }
.thumb-placeholder {
	width: 160rpx; height: 160rpx; background: #f1f5f9;
	display: flex; align-items: center; justify-content: center;
}
.thumb-icon { font-size: 60rpx; }
.card-body { flex: 1; padding: 20rpx 24rpx; overflow: hidden; }
.card-row  { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8rpx; }
.card-name { font-size: 30rpx; font-weight: 700; color: #1e293b; flex: 1; margin-right: 12rpx; }
.level-badge {
	font-size: 18rpx; color: #854d0e; background: #fef3c7;
	padding: 4rpx 12rpx; border-radius: 999rpx; white-space: nowrap; flex-shrink: 0;
}
.card-code  { font-size: 22rpx; color: #64748b; display: block; margin-bottom: 4rpx; }
.card-meta  { font-size: 24rpx; color: #475569; display: block; margin-bottom: 4rpx; }
.card-addr  { font-size: 22rpx; color: #94a3b8; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 8rpx; }
.card-footer { display: flex; justify-content: space-between; }
.card-time   { font-size: 22rpx; color: #94a3b8; }
.card-photos { font-size: 22rpx; color: #64748b; }
.card-actions { display: flex; justify-content: flex-end; margin-top: 10rpx; }
.btn-export {
	font-size: 22rpx;
	line-height: 1.2;
	padding: 10rpx 18rpx;
	background: #1d4ed8;
	color: #fff;
	border: none;
	border-radius: 10rpx;
	min-height: 72rpx;
}

/* 空态 */
.empty-tip { text-align: center; padding: 80rpx 0; }
.empty-icon { font-size: 80rpx; display: block; margin-bottom: 16rpx; }
.empty-text { font-size: 28rpx; color: #94a3b8; display: block; margin-bottom: 32rpx; }
.btn-go-collect {
	background: #2563eb; color: #fff; border: none;
	border-radius: 16rpx; padding: 20rpx 60rpx; font-size: 28rpx;
}

/* 加载更多 */
.loading-wrap  { text-align: center; padding: 60rpx 0; }
.loading-text  { font-size: 28rpx; color: #94a3b8; }
.load-more-tip { text-align: center; padding: 20rpx; font-size: 24rpx; color: #cbd5e1; }

/* FAB */
.fab {
	position: fixed; right: 48rpx; bottom: 80rpx;
	width: 100rpx; height: 100rpx; border-radius: 50%;
	background: #2563eb; box-shadow: 0 4px 16px rgba(37,99,235,.4);
	display: flex; align-items: center; justify-content: center;
}
.fab-icon { font-size: 56rpx; color: #fff; line-height: 1; margin-top: -4rpx; }

@media screen and (max-width: 430px) {
	.header {
		padding: 24rpx 20rpx 20rpx;
		flex-wrap: wrap;
		gap: 8rpx 12rpx;
	}
	.header-title {
		font-size: 30rpx;
	}
	.header-count {
		font-size: 22rpx;
	}
	.list-scroll {
		height: calc(100vh - 128rpx);
		padding: 12rpx;
		padding-bottom: calc(148rpx + env(safe-area-inset-bottom));
		padding-bottom: calc(148rpx + constant(safe-area-inset-bottom));
	}
	.card {
		border-radius: 16rpx;
	}
	.card-left,
	.thumb,
	.thumb-placeholder {
		width: 132rpx;
		height: 132rpx;
	}
	.thumb-icon {
		font-size: 48rpx;
	}
	.card-body {
		padding: 14rpx 16rpx;
	}
	.card-name {
		font-size: 28rpx;
	}
	.card-meta,
	.card-code,
	.card-addr,
	.card-time,
	.card-photos {
		font-size: 21rpx;
	}
	.level-badge {
		font-size: 16rpx;
	}
	.fab {
		right: 24rpx;
		bottom: calc(32rpx + env(safe-area-inset-bottom));
		bottom: calc(32rpx + constant(safe-area-inset-bottom));
		width: 92rpx;
		height: 92rpx;
	}
	.fab-icon {
		font-size: 50rpx;
	}
}

@media screen and (max-width: 360px) {
	.card {
		flex-direction: column;
	}
	.card-left,
	.thumb,
	.thumb-placeholder {
		width: 100%;
		height: 170rpx;
	}
	.card-footer {
		flex-direction: column;
		gap: 4rpx;
	}
	.btn-export {
		width: 100%;
	}
}
</style>
