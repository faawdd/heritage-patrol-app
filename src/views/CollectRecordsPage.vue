<template>
	<ion-page>
		<ion-header>
			<ion-toolbar class="app-toolbar">
				<ion-buttons slot="start"><ion-back-button default-href="/tabs/admin" /></ion-buttons>
				<ion-title>我的采集记录</ion-title>
			</ion-toolbar>
		</ion-header>
		<ion-content>
			<ion-refresher slot="fixed" @ionRefresh="onRefresh($event)"><ion-refresher-content /></ion-refresher>
			<div class="page">
				<div class="header">
					<span class="header-title">我的采集记录</span>
					<span class="header-count">共 {{ total }} 条</span>
				</div>

				<div class="list-scroll">
					<div v-if="loading && !records.length" class="loading-wrap">
						<span class="loading-text">加载中…</span>
					</div>

					<div v-for="item in records" :key="item.id" class="card">
						<div class="card-left">
							<img v-if="item.cover_url" :src="item.cover_url" class="thumb" />
							<div v-else class="thumb-placeholder">
								<span class="thumb-icon">🏛</span>
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
								<span class="card-time">{{ item.collected_at }}</span>
								<span class="card-photos">📷 {{ item.photo_count }} 张</span>
							</div>
							<div class="card-actions">
								<button type="button" class="btn-export" @click="exportDocx(item)">导出 DOCX</button>
							</div>
						</div>
					</div>

					<div v-if="!loading && !records.length" class="empty-tip">
						<span class="empty-icon">🗂</span>
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
	import {
		IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent,
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
			IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent,
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
						this.total = pagination.total || 0;
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
	background: #f0f4f8;
	min-height: 100%;
	position: relative;
	box-sizing: border-box;
}

.header {
	background: #163F77; padding: 16px 16px 12px;
	display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;
}
.header-title { font-size: 17px; font-weight: 700; color: #fff; }
.header-count { font-size: 12px; color: rgba(255,255,255,.7); }

.list-scroll {
	padding: 8px;
	padding-bottom: calc(70px + env(safe-area-inset-bottom));
	box-sizing: border-box;
}

.card {
	display: flex; background: #fff; border-radius: 10px;
	margin-bottom: 10px; overflow: hidden; box-shadow: 0 1px 6px rgba(0,0,0,.08);
}
.card-left { width: 80px; flex-shrink: 0; }
.thumb { width: 80px; height: 80px; object-fit: cover; display: block; }
.thumb-placeholder {
	width: 80px; height: 80px; background: #f1f5f9;
	display: flex; align-items: center; justify-content: center;
}
.thumb-icon { font-size: 30px; }
.card-body { flex: 1; padding: 10px 12px; overflow: hidden; }
.card-row { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 4px; }
.card-name { font-size: 15px; font-weight: 700; color: #1e293b; flex: 1; margin-right: 6px; }
.level-badge {
	font-size: 9px; color: #854d0e; background: #fef3c7;
	padding: 2px 6px; border-radius: 999px; white-space: nowrap; flex-shrink: 0;
}
.card-code { font-size: 11px; color: #64748b; display: block; margin-bottom: 2px; }
.card-meta { font-size: 12px; color: #475569; display: block; margin-bottom: 2px; }
.card-addr { font-size: 11px; color: #94a3b8; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px; }
.card-footer { display: flex; justify-content: space-between; }
.card-time { font-size: 11px; color: #94a3b8; }
.card-photos { font-size: 11px; color: #64748b; }
.card-actions { display: flex; justify-content: flex-end; margin-top: 5px; }
.btn-export {
	font-size: 11px; line-height: 1.2; padding: 5px 9px;
	background: #174B8F; color: #fff; border: none; border-radius: 5px; min-height: 36px;
}

.empty-tip { text-align: center; padding: 40px 0; }
.empty-icon { font-size: 40px; display: block; margin-bottom: 8px; }
.empty-text { font-size: 14px; color: #94a3b8; display: block; margin-bottom: 16px; }
.btn-go-collect {
	background: #1E5AA8; color: #fff; border: none;
	border-radius: 8px; padding: 10px 30px; font-size: 14px;
}

.loading-wrap { text-align: center; padding: 30px 0; }
.loading-text { font-size: 14px; color: #94a3b8; }
.load-more-tip { text-align: center; padding: 10px; font-size: 12px; color: #cbd5e1; }

.fab {
	position: fixed; right: 24px; bottom: calc(40px + env(safe-area-inset-bottom));
	width: 50px; height: 50px; border-radius: 50%;
	background: #1E5AA8; box-shadow: 0 4px 16px rgba(30,90,168,.4);
	display: flex; align-items: center; justify-content: center; z-index: 10;
}
.fab-icon { font-size: 28px; color: #fff; line-height: 1; margin-top: -2px; }

@media screen and (max-width: 360px) {
	.card { flex-direction: column; }
	.card-left, .thumb, .thumb-placeholder { width: 100%; height: 85px; }
	.card-footer { flex-direction: column; gap: 2px; }
	.btn-export { width: 100%; }
}
</style>
