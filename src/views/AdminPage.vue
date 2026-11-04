<template>
	<div class="app-page">
		<div class="app-content">
			<div class="u-page">
				<AppHeader :title="t('admin.title')" :subtitle="t('admin.headerSubtitle')">
					<van-tabs v-model:active="currentTab" class="adm-seg mt-2">
						<van-tab name="heritages" :title="t('admin.tabHeritages')" />
						<van-tab name="projects" :title="t('admin.tabProjects')" />
						<van-tab name="tools" :title="t('admin.tabTools')" />
					</van-tabs>
				</AppHeader>

				<div class="u-body pb-5">
					<!-- 文物点数据 -->
					<template v-if="currentTab === 'heritages'">
						<div class="u-card mb-2.5 flex flex-col gap-2.5 p-3">
							<div class="flex h-11 items-center gap-1.5 border border-line bg-fill px-3">
								<AppIcon name="search" :size="36" color="var(--c-text-4)" />
								<van-field
									v-model.trim="heritageSearchKeyword"
									class="adm-search-field min-w-0 flex-1 !h-11 !bg-transparent !px-0 !py-0 text-[0.9375rem] text-ink"
									type="search"
									:placeholder="t('admin.searchHeritagePlaceholder')"
									enterkeyhint="search"
									:border="false"
									input-align="left"
									@keyup.enter="applyHeritageFilters"
								/>
							</div>
							<div class="flex gap-2">
								<AppSelect
									class="min-w-0 min-h-11 flex-1 self-stretch border border-line bg-surface px-3"
									:options="heritageCategoryLabels"
									:model-value="heritageCategoryIndex"
									:placeholder="t('admin.allCategoriesOption')"
									:title="t('admin.allCategoriesOption')"
									@change="onHeritageCategoryChange"
								/>
								<van-button size="small" native-type="button" @click="resetHeritageFilters">{{ t('admin.resetFilters') }}</van-button>
								<van-button type="primary" size="small" native-type="button" @click="applyHeritageFilters">{{ t('common.search') }}</van-button>
							</div>
						</div>

						<div class="my-1 flex items-baseline justify-between gap-2">
							<span class="text-[1.0625rem] font-bold text-ink whitespace-nowrap">{{ t('admin.allHeritages') }}</span>
							<span class="text-[0.8125rem] text-ink-3 text-right">{{ showHeritageFilterSummary ? t('admin.filterResultSummary', { count: heritageTotal, page: heritagePage }) : t('admin.recordCount', { count: heritageDisplayCount }) }}</span>
						</div>

						<div v-for="item in heritages" :key="item.id" class="u-card mb-2.5 flex flex-col gap-1 p-3.5 active:scale-[0.99] active:opacity-90" @click="openHeritageDetail(item)">
							<div class="flex items-center justify-between gap-2">
								<span class="text-[1.0625rem] font-extrabold leading-[1.4] text-ink break-all">{{ item.name }}</span>
								<AppIcon name="chevron-right" :size="36" color="var(--c-text-4)" />
							</div>
							<div class="my-0.5 mb-1 flex flex-wrap gap-1.5">
								<span v-if="item.category" class="u-badge info">{{ item.category }}</span>
								<span v-if="item.level" class="u-badge warn">{{ item.level }}</span>
							</div>
							<div class="flex gap-2.5 text-sm leading-6"><span class="w-[3.75rem] shrink-0 text-ink-3">四普编号</span><span class="inline-flex w-fit min-w-0 flex-[0_1_auto] items-center break-all border border-line bg-fill px-2 py-0.5 font-mono tabular-nums tracking-[0.02em] text-ink-2">{{ item.sip_code || t('common.notAvailable') }}</span></div>
							<div class="flex gap-2.5 text-sm leading-6"><span class="w-[3.75rem] shrink-0 text-ink-3">地址</span><span class="min-w-0 flex-1 break-all text-ink-2">{{ item.address || t('common.notAvailable') }}</span></div>
							<div v-if="item.longitude && item.latitude" class="flex gap-2.5 text-sm leading-6"><span class="w-[3.75rem] shrink-0 text-ink-3">坐标</span><span class="min-w-0 flex-1 break-all font-mono tabular-nums text-ink-2">{{ item.longitude }}, {{ item.latitude }}</span></div>
						</div>
						<div v-if="!heritages.length" class="u-card u-empty">{{ t('admin.noHeritageMatched') }}</div>

						<div v-if="heritageTotalPages > 1" class="mt-1 flex items-center justify-between gap-2">
							<van-button size="small" native-type="button" :disabled="heritagePage <= 1" @click="changeHeritagePage(-1)">{{ t('admin.prevPage') }}</van-button>
							<span class="text-sm text-ink-3">{{ t('admin.pageInfo', { page: heritagePage, total: heritageTotalPages }) }}</span>
							<van-button size="small" native-type="button" :disabled="heritagePage >= heritageTotalPages" @click="changeHeritagePage(1)">{{ t('admin.nextPage') }}</van-button>
						</div>
					</template>

					<!-- 项目管理 -->
					<template v-if="currentTab === 'projects'">
						<div v-if="projectSummary" class="u-card grid grid-cols-4 divide-x divide-fill px-1.5 py-3">
							<div class="flex flex-col items-center"><span class="text-xl font-extrabold tabular-nums text-primary">{{ projectSummary.total || 0 }}</span><span class="text-xs text-ink-3">全部项目</span></div>
							<div class="flex flex-col items-center"><span class="text-xl font-extrabold tabular-nums text-primary">{{ projectSummary.in_progress || 0 }}</span><span class="text-xs text-ink-3">在办</span></div>
							<div class="flex flex-col items-center"><span class="text-xl font-extrabold tabular-nums text-success">{{ projectSummary.archived || 0 }}</span><span class="text-xs text-ink-3">已归档</span></div>
							<div class="flex flex-col items-center"><span class="text-xl font-extrabold tabular-nums text-warning">{{ projectSummary.overlap || 0 }}</span><span class="text-xs text-ink-3">涉及文物</span></div>
						</div>

						<div class="u-card mb-2.5 flex flex-col gap-2.5 p-3">
							<div class="flex h-11 items-center gap-1.5 border border-line bg-fill px-3">
								<AppIcon name="search" :size="36" color="var(--c-text-4)" />
								<van-field
									v-model.trim="projectKeyword"
									class="adm-search-field min-w-0 flex-1 !h-11 !bg-transparent !px-0 !py-0 text-[0.9375rem] text-ink"
									type="search"
									:placeholder="t('admin.searchProjectPlaceholder')"
									enterkeyhint="search"
									:border="false"
									input-align="left"
									@keyup.enter="loadProjects()"
								/>
							</div>
							<div class="flex gap-2">
								<AppSelect
									class="min-w-0 min-h-11 flex-1 self-stretch border border-line bg-surface px-3"
									:options="projectStatusLabels"
									:model-value="projectStatusIndex"
									:placeholder="t('admin.allStatusOption')"
									:title="t('admin.allStatusOption')"
									@change="onProjectStatusChange"
								/>
								<van-button type="primary" size="small" native-type="button" @click="loadProjects()">{{ t('common.search') }}</van-button>
							</div>
						</div>

						<div class="my-1 flex items-baseline justify-between gap-2">
							<span class="text-[1.0625rem] font-bold text-ink whitespace-nowrap">{{ t('admin.projectsTitle') }}</span>
							<span class="text-sm font-semibold text-primary whitespace-nowrap" @click="openProjectListOnline">{{ t('admin.openProjectListOnline') }} ›</span>
						</div>

						<div v-for="item in projects" :key="item.id" class="u-card mb-2.5 flex flex-col gap-1 p-3.5">
							<span class="text-[1.0625rem] font-extrabold leading-[1.4] text-ink break-all">{{ item.project_name }}</span>
							<div class="my-0.5 mb-1 flex flex-wrap gap-1.5">
								<span :class="['u-badge', item.is_archived ? 'ok' : 'info']">{{ item.status_label }}</span>
								<span v-if="item.is_overlap_artifact" class="u-badge bad">{{ t('admin.projectOverlapBadge', { count: item.overlap_count }) }}</span>
								<span v-else-if="item.spatial_check_at" class="u-badge ok">{{ t('admin.projectNoOverlap') }}</span>
								<span v-else class="u-badge warn">{{ t('admin.projectNotChecked') }}</span>
							</div>
							<div class="flex gap-2.5 text-sm leading-6"><span class="w-[3.75rem] shrink-0 text-ink-3">建设单位</span><span class="min-w-0 flex-1 break-all text-ink-2">{{ item.company_name || t('common.notFilled') }}</span></div>
							<div class="flex gap-2.5 text-sm leading-6"><span class="w-[3.75rem] shrink-0 text-ink-3">来函日期</span><span class="min-w-0 flex-1 break-all text-ink-2">{{ item.incoming_doc_date || '-' }}</span></div>
							<div class="flex gap-2.5 text-sm leading-6"><span class="w-[3.75rem] shrink-0 text-ink-3">收文日期</span><span class="min-w-0 flex-1 break-all text-ink-2">{{ item.receive_date || '-' }}</span></div>
							<div v-if="item.is_overlap_artifact" class="flex gap-2.5 text-sm leading-6"><span class="w-[3.75rem] shrink-0 text-ink-3">涉及文物</span><span class="min-w-0 flex-1 break-all text-ink-2">{{ overlapNames(item) }}</span></div>
							<div v-if="item.final_reply_to_company" class="flex gap-2.5 text-sm leading-6"><span class="w-[3.75rem] shrink-0 text-ink-3">复函号</span><span class="min-w-0 flex-1 break-all text-ink-2">{{ item.final_reply_to_company }}</span></div>
							<div class="mt-1.5 flex items-center justify-between gap-2 border-t border-fill pt-2.5">
								<span class="text-xs text-ink-4">{{ item.updated_at ? t('admin.projectUpdatedAt', { value: item.updated_at }) : '' }}</span>
								<van-button type="primary" size="small" native-type="button" @click="openProjectOnline(item)">{{ t('admin.openProjectOnline') }}</van-button>
							</div>
						</div>
						<div v-if="!projects.length" class="u-card u-empty">{{ t('admin.noProjectMatched') }}</div>
					</template>

					<!-- 工具入口 -->
					<template v-if="currentTab === 'tools'">
						<div class="my-1 flex items-baseline justify-between gap-2"><span class="text-[1.0625rem] font-bold text-ink whitespace-nowrap">{{ t('admin.fieldTools') }}</span></div>
						<div class="u-card mb-2.5 p-3">
							<div class="flex items-center gap-3">
								<div class="flex h-11 w-11 shrink-0 items-center justify-center bg-primary-light"><AppIcon name="map" :size="44" color="var(--c-primary)" :stroke="1.9" /></div>
								<div class="flex min-w-0 flex-1 flex-col gap-0.5">
									<span class="text-base font-bold text-ink">{{ t('admin.collectTitle') }}</span>
									<span class="text-[0.8125rem] leading-6 text-ink-3">{{ t('admin.collectDesc') }}</span>
								</div>
							</div>
							<div class="mt-3 grid grid-cols-2 gap-2">
								<van-button size="small" native-type="button" @click="goMyRecords">{{ t('admin.myCollectRecords') }}</van-button>
								<van-button type="primary" size="small" native-type="button" @click="goCollect">{{ t('admin.startCollect') }}</van-button>
							</div>
						</div>

						<div class="my-1 flex items-baseline justify-between gap-2"><span class="text-[1.0625rem] font-bold text-ink whitespace-nowrap">{{ t('admin.onlineTools') }}</span></div>
						<div class="u-card mb-2.5 p-3 active:scale-[0.99] active:opacity-90" @click="openInspectionManagement">
							<div class="flex items-center gap-3">
								<div class="flex h-11 w-11 shrink-0 items-center justify-center bg-primary-light"><AppIcon name="clock" :size="44" color="var(--c-primary)" :stroke="1.9" /></div>
								<div class="flex min-w-0 flex-1 flex-col gap-0.5">
									<span class="text-base font-bold text-ink">{{ t('admin.patrolManageTitle') }}</span>
									<span class="text-[0.8125rem] leading-6 text-ink-3">{{ t('admin.patrolManageDesc') }}</span>
								</div>
								<AppIcon name="chevron-right" :size="36" color="var(--c-text-4)" />
							</div>
						</div>
						<div class="u-card mb-2.5 p-3 active:scale-[0.99] active:opacity-90" @click="openKmlTool">
							<div class="flex items-center gap-3">
								<div class="flex h-11 w-11 shrink-0 items-center justify-center bg-primary-light"><AppIcon name="grid" :size="44" color="var(--c-primary)" :stroke="1.9" /></div>
								<div class="flex min-w-0 flex-1 flex-col gap-0.5">
									<span class="text-base font-bold text-ink">{{ t('admin.kmlTitle') }}</span>
									<span class="text-[0.8125rem] leading-6 text-ink-3">{{ t('admin.kmlDesc') }}</span>
								</div>
								<AppIcon name="chevron-right" :size="36" color="var(--c-text-4)" />
							</div>
						</div>
						<div class="u-card mb-2.5 p-3 active:scale-[0.99] active:opacity-90" @click="openDjangoCollectTool">
							<div class="flex items-center gap-3">
								<div class="flex h-11 w-11 shrink-0 items-center justify-center bg-primary-light"><AppIcon name="records" :size="44" color="var(--c-primary)" :stroke="1.9" /></div>
								<div class="flex min-w-0 flex-1 flex-col gap-0.5">
									<span class="text-base font-bold text-ink">{{ t('admin.collectManageTitle') }}</span>
									<span class="text-[0.8125rem] leading-6 text-ink-3">{{ t('admin.collectManageDesc') }}</span>
								</div>
								<AppIcon name="chevron-right" :size="36" color="var(--c-text-4)" />
							</div>
						</div>
						<div class="u-card mb-2.5 p-3 active:scale-[0.99] active:opacity-90" @click="openProjectListOnline">
							<div class="flex items-center gap-3">
								<div class="flex h-11 w-11 shrink-0 items-center justify-center bg-primary-light"><AppIcon name="file" :size="44" color="var(--c-primary)" :stroke="1.9" /></div>
								<div class="flex min-w-0 flex-1 flex-col gap-0.5">
									<span class="text-base font-bold text-ink">{{ t('admin.projectOnlineTitle') }}</span>
									<span class="text-[0.8125rem] leading-6 text-ink-3">{{ t('admin.projectOnlineDesc') }}</span>
								</div>
								<AppIcon name="chevron-right" :size="36" color="var(--c-text-4)" />
							</div>
						</div>
						<span class="mx-1 mt-1.5 block text-xs leading-[1.6] text-center text-ink-4">{{ t('admin.onlineTip') }}</span>
					</template>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
	import AppHeader from '@/components/AppHeader.vue';
	import AppIcon from '@/components/AppIcon.vue';
	import AppSelect from '@/components/AppSelect.vue';
	import { openApiEntry } from '@/lib/webview.js';
	import config from '@/lib/config.js';
	import { getUser, isAdminUser } from '@/lib/auth.js';
	import { apiRequest } from '@/lib/request.js';
	import { toast, showLoading, hideLoading } from '@/lib/ui.js';
	import { navigateTo, switchTab } from '@/lib/nav.js';
	import { t } from '@/lib/i18n.js';

	export default {
		components: { AppHeader, AppIcon, AppSelect },
		data() {
			return {
				currentTab: 'heritages',
				heritages: [],
				heritagePage: 1,
				heritagePageSize: 10,
				heritageTotal: 0,
				heritageTotalPages: 1,
				heritageSearchKeyword: '',
				heritageCategory: '',
				heritageCategoryOptions: [
					{ value: 'GJZ', label: '古建筑' },
					{ value: 'GMZ', label: '古墓葬' },
					{ value: 'GYZ', label: '古文化遗址' },
					{ value: 'SKT', label: '石窟寺及石刻' },
					{ value: 'JDJW', label: '近现代重要史迹及代表性建筑' },
					{ value: 'QT', label: '其他' },
				],
				projects: [],
				projectSummary: null,
				projectKeyword: '',
				projectStatus: '',
				projectStatusOptions: [],
				projectListWebUrl: '',
			};
		},
		computed: {
			projectStatusSelectOptions() {
				return [{ value: '', label: this.t('admin.allStatusOption') }, ...this.projectStatusOptions];
			},
			projectStatusLabels() {
				return this.projectStatusSelectOptions.map(item => item.label);
			},
			projectStatusIndex() {
				const index = this.projectStatusSelectOptions.findIndex(item => item.value === this.projectStatus);
				return index < 0 ? 0 : index;
			},
			heritageCategorySelectOptions() {
				const allLabel = this.t('admin.allCategoriesOption');
				const optionList = this.heritageCategoryOptions.map(item => ({
					value: item.value,
					label: item.label,
				}));
				return [{ value: '', label: allLabel }, ...optionList];
			},
			heritageCategoryLabels() {
				return this.heritageCategorySelectOptions.map(item => item.label);
			},
			heritageCategoryIndex() {
				const index = this.heritageCategorySelectOptions.findIndex(item => item.value === this.heritageCategory);
				return index < 0 ? 0 : index;
			},
			showHeritageFilterSummary() {
				return !!this.heritageSearchKeyword.trim() || !!this.heritageCategory;
			},
			heritageDisplayCount() {
				return this.heritageTotal;
			},
		},
		activated() {
			const user = getUser();
			if (!isAdminUser(user)) {
				toast(this.t('admin.noAdminPermission'), { icon: 'none' });
				switchTab('/tabs/home');
				return;
			}
			const tab = this.$route && this.$route.query && this.$route.query.tab;
			if (['heritages', 'projects', 'tools'].includes(tab)) {
				this.currentTab = tab;
			}
			this.loadData();
		},
		methods: {
			t,
			request(url, method = 'GET', data = null) {
				return apiRequest({ url, method, data });
			},
			async loadData() {
				showLoading(this.t('common.loading'));
				try {
					await Promise.all([this.loadHeritages(false), this.loadProjects(false)]);
				} catch (error) {
					toast(this.t('admin.adminDataLoadFailed'), { icon: 'none' });
				} finally {
					hideLoading();
				}
			},
			async loadHeritages(withLoading = true) {
				if (withLoading) {
					showLoading(this.t('admin.loadingHeritages'));
				}
				try {
					const payload = {
						page: this.heritagePage,
						page_size: this.heritagePageSize,
					};
					if (this.heritageSearchKeyword.trim()) {
						payload.q = this.heritageSearchKeyword.trim();
					}
					if (this.heritageCategory) {
						payload.category = this.heritageCategory;
					}
					const heritageRes = await this.request(`${config.API_BASE_URL}/api/admin/heritages`, 'GET', {
						...payload,
					});
					this.heritages = (heritageRes.data && heritageRes.data.items) || [];
					const pagination = (heritageRes.data && heritageRes.data.pagination) || {};
					this.heritageTotal = pagination.total || 0;
					this.heritageTotalPages = pagination.total_pages || 1;
				} finally {
					if (withLoading) {
						hideLoading();
					}
				}
			},
			async loadProjects(withLoading = true) {
				if (withLoading) {
					showLoading(this.t('admin.loadingProjects'));
				}
				try {
					const params = {};
					if (this.projectKeyword) {
						params.q = this.projectKeyword;
					}
					if (this.projectStatus) {
						params.status = this.projectStatus;
					}
					const projectRes = await this.request(`${config.API_BASE_URL}/api/admin/land-projects`, 'GET', params);
					const body = projectRes.data || {};
					if (projectRes.statusCode !== 200) {
						throw new Error(body.detail || 'load projects failed');
					}
					this.projects = body.items || [];
					this.projectSummary = body.summary || null;
					this.projectListWebUrl = body.web_url || '';
					if (Array.isArray(body.status_options)) {
						this.projectStatusOptions = body.status_options.map(item => ({ value: item.value, label: item.label }));
					}
				} finally {
					if (withLoading) {
						hideLoading();
					}
				}
			},
			async changeHeritagePage(delta) {
				const nextPage = this.heritagePage + delta;
				if (nextPage < 1 || nextPage > this.heritageTotalPages) {
					return;
				}
				this.heritagePage = nextPage;
				await this.loadHeritages();
			},
			onHeritageCategoryChange(event) {
				const selected = this.heritageCategorySelectOptions[event.detail.value];
				this.heritageCategory = selected ? selected.value : '';
			},
			async applyHeritageFilters() {
				this.heritagePage = 1;
				await this.loadHeritages();
			},
			async resetHeritageFilters() {
				this.heritageSearchKeyword = '';
				this.heritageCategory = '';
				this.heritagePage = 1;
				await this.loadHeritages();
			},
			openHeritageDetail(item) {
				const name = encodeURIComponent(item.name || '');
				navigateTo(`/heritage/detail?id=${item.id}&name=${name}`);
			},
			onProjectStatusChange(event) {
				const selected = this.projectStatusSelectOptions[event.detail.value];
				this.projectStatus = selected ? selected.value : '';
				this.loadProjects();
			},
			overlapNames(item) {
				return (item.overlapped_relics || [])
					.map(row => (row.level ? `${row.name}（${row.level}）` : row.name))
					.filter(Boolean)
					.join('、') || '-';
			},
			openProjectListOnline() {
				// 入口令牌有时效，打开前重新获取项目列表入口地址
				return openApiEntry('/api/admin/land-projects', { pick: (data) => (data && data.web_url) || this.projectListWebUrl });
			},
			openProjectOnline(item) {
				return openApiEntry(`/api/admin/land-projects/${item.id}/web-entry`);
			},
			openEntryTool(path) {
				return openApiEntry(path);
			},
			openKmlTool() {
				// 先进入启动页获取当前定位，再在应用内浏览器打开 KML 叠加检查
				navigateTo('/kml');
			},
			openDjangoCollectTool() {
				return this.openEntryTool('/api/admin/collect-entry');
			},
			openInspectionManagement() {
				return this.openEntryTool('/api/admin/inspection-management-entry');
			},
			goCollect() {
				navigateTo('/collect');
			},
			goMyRecords() {
				navigateTo('/collect/records');
			},
		},
	};
</script>

<style scoped>
@reference "../theme/tailwind.css";

.adm-seg {
	--van-tabs-nav-background: var(--c-surface);
	--van-tab-text-color: var(--c-text-2);
	--van-tab-active-text-color: var(--c-primary);
	--van-tabs-bottom-bar-color: var(--c-primary);
	border-radius: 0;
	overflow: hidden;
}

.adm-search-field :deep(.van-cell) {
	min-height: 100%;
	padding: 0;
	background: transparent;
}

.adm-search-field :deep(.van-field__control) {
	font-size: 0.9375rem;
	color: var(--c-text);
}
</style>
