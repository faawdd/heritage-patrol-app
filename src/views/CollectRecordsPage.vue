<template>
	<ion-page>
		<ion-content>
			<ion-refresher slot="fixed" @ionRefresh="onRefresh($event)"><ion-refresher-content /></ion-refresher>
			<div class="page">
				<AppHeader title="我的采集记录" :subtitle="`共 ${total} 条采集登记`" back />

				<div class="list-scroll">
					<div v-if="loading && !records.length" class="loading-wrap">
						<span class="loading-text">加载中…</span>
					</div>

					<div v-for="item in records" :key="item.id" class="card">
						<div class="card-left">
							<img v-if="item.cover_url" :src="item.cover_url" class="thumb" />
							<div v-else class="thumb-placeholder">
								<AppIcon name="landmark" :size="56" color="#94A3B8" />
							</div>
						</div>
						<div class="card-body">
							<div class="card-row">
								<span class="card-name">{{ item.name }}</span>
								<div class="level-badge">{{ item.protection_level }}</div>
							</div>
							<span class="card-code">编号：{{ item.survey_code }}</span>
							<span class="card-meta">{{ item.era }} · {{ item.category }}</span>
							<span class="card-addr">{{ item.address || '（地址未填）' }}</span>
							<div class="card-footer">
								<span class="card-photos">{{ item.collected_at ? `${item.collected_at} · ` : '' }}照片 {{ item.photo_count || 0 }} 张</span>
								<button type="button" class="btn-export" @click="exportDocx(item)">导出登记表</button>
							</div>
						</div>
					</div>

					<div v-if="!loading && !records.length" class="empty-tip">
						<AppIcon name="records" :size="80" color="#CBD5E1" />
						<span class="empty-text">暂无采集记录</span>
						<button type="button" class="btn-go-collect" @click="goCollect">去采集</button>
					</div>

					<div v-if="loading && records.length" class="load-more-tip"><span>加载中…</span></div>
					<div v-if="!hasMore && records.length" class="load-more-tip"><span>— 已显示全部 —</span></div>
				</div>
			</div>

			<ion-infinite-scroll threshold="100px" :disabled="!hasMore" @ionInfinite="onInfinite($event)">
				<ion-infinite-scroll-content />
			</ion-infinite-scroll>

			<div class="fab" @click="goCollect">
				<span class="fab-icon">＋</span>
			</div>
		</ion-content>
	</ion-page>
</template>

<script>
	import AppHeader from '@/components/AppHeader.vue';
	import AppIcon from '@/components/AppIcon.vue';
	import {
		IonPage, IonContent,
		IonRefresher, IonRefresherContent, IonInfiniteScroll, IonInfiniteScrollContent,
	} from '@ionic/vue';
	import config from '@/lib/config.js';
	import { getAuthHeader } from '@/lib/auth.js';
	import { request } from '@/lib/request.js';
	import { toast, showLoading, hideLoading } from '@/lib/ui.js';
	import { navigateTo } from '@/lib/nav.js';
	import { downloadAndOpen } from '@/lib/native.js';

	const API = config.API_BASE_URL;
	const PAGE_SIZE = 10;

	export default {
		components: {
			IonPage, IonContent, AppHeader, AppIcon,
			IonRefresher, IonRefresherContent, IonInfiniteScroll, IonInfiniteScrollContent,
		},
		data() {
			return {
				records: [],
				total: 0,
				page: 1,
				hasMore: true,
				loading: false,
			};
		},

		ionViewWillEnter() {
			this.fetchRecords(1, true);
		},

		methods: {
			async onRefresh(event) {
				await this.fetchRecords(1, true);
				event.target.complete();
			},

			async onInfinite(event) {
				await this.loadMore();
				event.target.complete();
			},

			async fetchRecords(page = 1, replace = false) {
				if (this.loading) return;
				this.loading = true;
				try {
					const res = await request({
						url: `${API}/api/collect/my-records`,
						data: { page, page_size: PAGE_SIZE },
						header: getAuthHeader(),
					});
					if (res.statusCode === 200) {
						const items = res.data.items || [];
						const pagination = res.data.pagination || {};
						this.total = pagination.total ?? res.data.total ?? (replace || page === 1 ? items.length : this.records.length + items.length);
						this.hasMore = page < (pagination.total_pages || 1);
						this.page = page;
						this.records = replace || page === 1 ? items : [...this.records, ...items];
					}
				} catch (_) {
					toast('加载失败，请稍后重试', { icon: 'none' });
				} finally {
					this.loading = false;
				}
			},

			async loadMore() {
				if (!this.loading && this.hasMore) {
					await this.fetchRecords(this.page + 1);
				}
			},

			goCollect() {
				navigateTo('/collect');
			},

			async exportDocx(item) {
				if (!item || !item.id) return;
				showLoading('导出中…');
				try {
					await downloadAndOpen(`${API}/api/collect/export-docx/${item.id}`, {
						fileName: `${item.survey_code || item.id}.docx`,
						mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
					});
				} catch (err) {
					if (err && err.statusCode) {
						toast('导出失败，请重试', { icon: 'none' });
					} else {
						toast('网络异常，导出失败', { icon: 'none' });
					}
				} finally {
					hideLoading();
				}
			},
		},
	};
</script>

<style scoped>
.page {
	background: var(--c-bg);
	min-height: 100%;
	position: relative;
	box-sizing: border-box;
}

.list-scroll {
	padding: 12px 14px;
	padding-bottom: calc(84px + env(safe-area-inset-bottom));
	box-sizing: border-box;
}

.card {
	display: flex;
	gap: 12px;
	padding: 12px;
	background: #fff;
	border-radius: var(--r-card);
	margin-bottom: 10px;
	box-shadow: var(--shadow-card);
}
.card-left { width: 72px; flex-shrink: 0; }
.thumb { width: 72px; height: 72px; object-fit: cover; display: block; border-radius: 10px; }
.thumb-placeholder {
	width: 72px; height: 72px; background: #F1F5F9; border-radius: 10px;
	display: flex; align-items: center; justify-content: center;
}
.card-body { flex: 1; min-width: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.card-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 6px; }
.card-name { font-size: 16px; font-weight: 800; color: var(--c-text); flex: 1; min-width: 0; line-height: 1.35; }
.level-badge {
	font-size: 12px; font-weight: 700; color: var(--c-warning); background: var(--c-warning-bg);
	padding: 2px 8px; border-radius: 999px; white-space: nowrap; flex-shrink: 0;
}
.card-code { font-size: 13px; color: var(--c-text-3); font-variant-numeric: tabular-nums; }
.card-meta { font-size: 13px; color: var(--c-text-2); }
.card-addr { font-size: 13px; color: var(--c-text-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-footer { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 6px; }
.card-photos { font-size: 12px; color: var(--c-text-3); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.btn-export {
	flex-shrink: 0; height: 34px; padding: 0 12px; font-size: 14px; font-weight: 700;
	background: var(--c-primary-light); color: var(--c-primary); border: none; border-radius: 9px;
}

.empty-tip { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 48px 0; }
.empty-text { font-size: 15px; color: var(--c-text-3); }
.btn-go-collect {
	height: 44px; padding: 0 32px; font-size: 16px; font-weight: 700;
	background: var(--c-primary); color: #fff; border: none; border-radius: 12px;
}

.loading-wrap { text-align: center; padding: 30px 0; }
.loading-text { font-size: 14px; color: var(--c-text-3); }
.load-more-tip { text-align: center; padding: 10px; font-size: 13px; color: #94A3B8; }

.fab {
	position: fixed; right: 20px; bottom: calc(24px + env(safe-area-inset-bottom));
	width: 54px; height: 54px; border-radius: 50%;
	background: linear-gradient(135deg, #2A6BC2 0%, #1E5AA8 55%, #174B8F 100%);
	box-shadow: var(--shadow-btn);
	display: flex; align-items: center; justify-content: center; z-index: 10;
}
.fab-icon { font-size: 30px; color: #fff; line-height: 1; margin-top: -2px; }
</style>
