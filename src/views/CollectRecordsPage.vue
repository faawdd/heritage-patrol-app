<template>
	<div class="app-page">
		<div class="app-content">
			<van-pull-refresh v-model="refreshing" @refresh="onRefresh">
			<div class="relative box-border min-h-full bg-page">
				<AppHeader title="我的采集记录" :subtitle="`共 ${total} 条采集登记`" back />

				<van-list v-model:loading="loadingMore" v-model:error="listError" :finished="!hasMore" :disabled="refreshing" error-text="加载失败，点击重试" @load="onInfinite" class="box-border px-3.5 py-3 pb-[calc(84px+env(safe-area-inset-bottom))]">
					<div v-if="loading && !records.length" class="py-8 text-center">
						<span class="text-sm text-ink-3">加载中…</span>
					</div>

					<div v-for="item in records" :key="item.id" class="mb-2.5 flex gap-3 bg-surface p-3 shadow-card">
						<div class="w-[4.5rem] shrink-0">
							<img v-if="item.cover_url" :src="item.cover_url" class="block h-[4.5rem] w-[4.5rem] object-cover" />
							<div v-else class="flex h-[4.5rem] w-[4.5rem] items-center justify-center bg-fill">
								<AppIcon name="landmark" :size="56" color="var(--c-text-4)" />
							</div>
						</div>
						<div class="flex min-w-0 flex-1 flex-col gap-0.5 p-0">
							<div class="flex items-start justify-between gap-1.5">
								<span class="min-w-0 flex-1 text-base font-extrabold leading-[1.35] text-ink">{{ item.name }}</span>
								<div v-if="item.protection_level" class="level-badge max-w-1/2 shrink-0 break-words" :class="heritageLevelAccent(item.protection_level)">{{ item.protection_level }}</div>
							</div>
							<span class="text-[0.8125rem] tabular-nums text-ink-3">编号：{{ item.survey_code }}</span>
							<span class="text-[0.8125rem] text-ink-2">{{ item.era }} · {{ item.category }}</span>
							<span class="overflow-hidden text-ellipsis whitespace-nowrap text-[0.8125rem] text-ink-3">{{ item.address || '（地址未填）' }}</span>
							<div class="mt-1.5 flex items-center justify-between gap-2">
								<span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-ink-3">{{ item.collected_at ? `${item.collected_at} · ` : '' }}照片 {{ item.photo_count || 0 }} 张</span>
								<van-button type="primary" plain native-type="button" class="shrink-0" @click="exportDocx(item)">导出登记表</van-button>
							</div>
						</div>
					</div>

					<EmptyState v-if="!loading && !records.length && !listError" message="暂无采集记录" hint="开始现场采集后，记录将显示在这里。">
						<van-button type="primary" native-type="button" @click="goCollect">去采集</van-button>
					</EmptyState>

					<div v-if="loading && records.length" class="p-2.5 text-center text-[0.8125rem] text-ink-4"><span>加载中…</span></div>
					<div v-if="!hasMore && records.length" class="p-2.5 text-center text-[0.8125rem] text-ink-4"><span>— 已显示全部 —</span></div>
				</van-list>
			</div>

			<div class="fixed right-5 bottom-[calc(24px+env(safe-area-inset-bottom))] z-10 flex h-[3.375rem] w-[3.375rem] items-center justify-center bg-gradient-primary shadow-card" @click="goCollect">
				<span class="-mt-0.5 text-[1.875rem] leading-none text-on-primary">＋</span>
			</div>
		</van-pull-refresh>
		</div>
	</div>
</template>

<script>
	import AppHeader from '@/components/AppHeader.vue';
	import AppIcon from '@/components/AppIcon.vue';
	import EmptyState from '@/components/EmptyState.vue';
	import { heritageLevelAccent } from '@/lib/heritage-level.js';
	import config from '@/lib/config.js';
	import { getAuthHeader } from '@/lib/auth.js';
	import { request } from '@/lib/request.js';
	import { toast, showLoading, hideLoading } from '@/lib/ui.js';
	import { navigateTo } from '@/lib/nav.js';
	import { downloadAndOpen } from '@/lib/native.js';

	const API = config.API_BASE_URL;
	const PAGE_SIZE = 10;

	export default {
		components: { AppHeader, AppIcon, EmptyState },
		data() {
			return {
				refreshing: false,
				records: [],
				total: 0,
				page: 0,
				hasMore: true,
				loading: false,
				loadingMore: false,
				listError: false,
			};
		},

		methods: {
			heritageLevelAccent,
			async onRefresh() {
				try {
					await this.fetchRecords(1, true);
				} finally {
					this.refreshing = false;
				}
			},

			async onInfinite() {
				try {
					await this.loadMore();
				} finally {
					this.loadingMore = false;
				}
			},

			async fetchRecords(page = 1, replace = false) {
				if (this.loading) return;
				this.loading = true;
				this.listError = false;
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
					} else {
						throw new Error('加载失败，请稍后重试');
					}
				} catch (_) {
					this.listError = true;
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
@reference "../theme/tailwind.css";
</style>
