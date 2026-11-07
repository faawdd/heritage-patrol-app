<template>
	<div class="app-page">
		<div ref="adminContent" class="app-content admin-content">
			<div class="u-page admin-page">
				<AppHeader class="admin-header" :title="t('admin.title')" :subtitle="t('admin.headerSubtitle')">
					<van-tabs v-model:active="currentTab" class="adm-seg mt-2">
						<van-tab name="heritages" :title="t('admin.tabHeritages')" />
						<van-tab name="projects" :title="t('admin.tabProjects')" />
						<van-tab name="tools" :title="t('admin.tabTools')" />
					</van-tabs>
				</AppHeader>

				<div class="u-body admin-body pb-5" :class="{ 'heritage-body': currentTab === 'heritages', 'projects-body': currentTab === 'projects' }">
					<!-- 文物点数据 -->
					<template v-if="currentTab === 'heritages'">
						<div class="heritage-layout">
						<div class="u-card heritage-search mb-2 flex flex-col gap-2 p-2.5">
							<div class="flex min-w-0 items-center gap-1.5 border border-line bg-fill px-2">
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
								<van-button type="primary" size="small" native-type="button" @click="applyHeritageFilters">{{ t('common.search') }}</van-button>
								<van-button
									size="small"
									native-type="button"
									:aria-expanded="heritageFiltersOpen"
									@click="heritageFiltersOpen = !heritageFiltersOpen"
								>
									<span class="flex items-center gap-1">筛选<AppIcon name="chevron-down" :size="28" :class="heritageFiltersOpen ? 'rotate-180' : ''" /></span>
								</van-button>
							</div>
							<div v-if="heritageFiltersOpen" class="flex gap-2">
								<AppSelect
									class="min-w-0 min-h-11 flex-1 self-stretch border border-line bg-surface px-3"
									:options="heritageCategoryLabels"
									:model-value="heritageCategoryIndex"
									:placeholder="t('admin.allCategoriesOption')"
									:title="t('admin.allCategoriesOption')"
									@change="onHeritageCategoryChange"
								/>
								<van-button size="small" native-type="button" @click="resetHeritageFilters">{{ t('admin.resetFilters') }}</van-button>
								<van-button type="primary" size="small" native-type="button" @click="applyHeritageFilters">应用</van-button>
							</div>
						</div>

						<div class="my-1 flex shrink-0 items-baseline justify-between gap-2">
							<span class="text-[1.0625rem] font-bold text-ink whitespace-nowrap">{{ t('admin.allHeritages') }}</span>
							<span class="text-[0.8125rem] text-ink-3 text-right">{{ showHeritageFilterSummary ? t('admin.filterResultSummary', { count: heritageTotal, page: heritagePage }) : t('admin.recordCount', { count: heritageDisplayCount }) }}</span>
						</div>

						<div ref="heritageList" class="heritage-list">
							<div v-for="item in heritages" :key="item.id" class="heritage-row u-card flex items-center gap-2 px-3 py-2 active:opacity-90" @click="openHeritageDetail(item)">
								<span class="heritage-code">{{ item.sip_code || t('common.notAvailable') }}</span>
								<span class="heritage-name">{{ item.name }}</span>
								<span class="heritage-category">{{ item.category || t('common.notAvailable') }}</span>
								<span v-if="item.level" class="level-badge heritage-level" :class="heritageLevelAccent(item.level)" :title="item.level" :aria-label="item.level">{{ heritageLevelShortLabel(item.level) }}</span>
								<AppIcon name="chevron-right" :size="32" color="var(--c-text-4)" />
							</div>
							<div v-if="!heritages.length" class="u-card u-empty"><EmptyState :message="t('admin.noHeritageMatched')" hint="试试调整搜索或筛选条件。" /></div>
						</div>

						<div v-if="heritageTotalPages > 1" class="heritage-pagination mt-1 flex shrink-0 items-center justify-between gap-2">
							<van-button size="small" native-type="button" :disabled="heritagePage <= 1" @click="changeHeritagePage(-1)">{{ t('admin.prevPage') }}</van-button>
							<span class="text-sm text-ink-3">{{ t('admin.pageInfo', { page: heritagePage, total: heritageTotalPages }) }}</span>
							<van-button size="small" native-type="button" :disabled="heritagePage >= heritageTotalPages" @click="changeHeritagePage(1)">{{ t('admin.nextPage') }}</van-button>
						</div>
						</div>
					</template>

					<!-- 项目管理 -->
					<template v-if="currentTab === 'projects'">
						<div class="projects-layout">
						<div v-if="projectSummary" class="u-card grid grid-cols-4 divide-x divide-fill px-1.5 py-3">
							<div class="flex flex-col items-center"><span class="text-xl font-extrabold tabular-nums text-primary">{{ projectSummary.total || 0 }}</span><span class="text-xs text-ink-3">全部项目</span></div>
							<div class="flex flex-col items-center"><span class="text-xl font-extrabold tabular-nums text-primary">{{ projectSummary.in_progress || 0 }}</span><span class="text-xs text-ink-3">在办</span></div>
							<div class="flex flex-col items-center"><span class="text-xl font-extrabold tabular-nums text-success">{{ projectSummary.archived || 0 }}</span><span class="text-xs text-ink-3">已归档</span></div>
							<div class="flex flex-col items-center"><span class="text-xl font-extrabold tabular-nums text-warning">{{ projectSummary.overlap || 0 }}</span><span class="text-xs text-ink-3">涉及文物</span></div>
						</div>

						<div class="u-card project-search mb-2 flex flex-col gap-2 p-2.5">
							<div class="flex min-w-0 items-center gap-1.5 border border-line bg-fill px-2">
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
								<van-button type="primary" size="small" native-type="button" @click="loadProjects()">{{ t('common.search') }}</van-button>
								<van-button size="small" native-type="button" :aria-expanded="projectFiltersOpen" @click="toggleProjectFilters">
									<span class="flex items-center gap-1">筛选<AppIcon name="chevron-down" :size="28" :class="projectFiltersOpen ? 'rotate-180' : ''" /></span>
								</van-button>
							</div>
							<div v-if="projectFiltersOpen" class="flex gap-2">
								<AppSelect
									class="min-w-0 min-h-11 flex-1 self-stretch border border-line bg-surface px-3"
									:options="projectStatusLabels"
									:model-value="projectStatusIndex"
									:placeholder="t('admin.allStatusOption')"
									:title="t('admin.allStatusOption')"
									@change="onProjectStatusChange"
								/>
								<van-button type="primary" size="small" native-type="button" @click="loadProjects()">应用</van-button>
							</div>
						</div>

						<div ref="projectList" class="project-list">
						<section v-for="group in projectGroups" :key="group.key" class="project-group">
							<div class="my-1 flex shrink-0 items-center justify-between gap-2">
								<span class="text-base font-bold text-ink">{{ group.title }} <span class="text-xs font-normal text-ink-3">({{ group.items.length }})</span></span>
								<van-button v-if="group.key === 'completed'" size="small" native-type="button" :aria-expanded="showCompletedProjects" @click="showCompletedProjects = !showCompletedProjects">
									{{ showCompletedProjects ? '收起' : '展开' }}
								</van-button>
							</div>
							<template v-if="group.key !== 'completed' || showCompletedProjects">
							<div v-for="item in group.items" :key="item.id" class="u-card mb-2 flex flex-col gap-1 p-3">
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
							<div v-if="!group.items.length" class="u-card u-empty"><EmptyState :message="group.key === 'completed' ? '暂无已完成流程项目' : t('admin.noProjectMatched')" /></div>
							</template>
						</section>
						</div>
						<van-button class="project-online-link" size="small" native-type="button" @click="openProjectListOnline">{{ t('admin.openProjectListOnline') }} ›</van-button>
						</div>
					</template>

					<!-- 工具入口 -->
					<template v-if="currentTab === 'tools'">
						<div class="my-1 flex items-baseline justify-between gap-2"><span class="text-[1.0625rem] font-bold text-ink whitespace-nowrap">{{ t('admin.fieldTools') }}</span></div>
						<div class="tools-grid">
							<button class="tool-card u-card" type="button" @click="goMyRecords"><span class="tool-icon"><AppIcon name="records" :size="48" color="var(--c-primary)" /></span><strong>{{ t('admin.myCollectRecords') }}</strong><small>{{ t('admin.collectTitle') }}</small></button>
							<button class="tool-card u-card" type="button" @click="goCollect"><span class="tool-icon"><AppIcon name="map" :size="48" color="var(--c-primary)" /></span><strong>{{ t('admin.startCollect') }}</strong><small>{{ t('admin.collectDesc') }}</small></button>
							<button class="tool-card u-card" type="button" @click="openInspectionManagement"><span class="tool-icon"><AppIcon name="clock" :size="48" color="var(--c-primary)" /></span><strong>{{ t('admin.patrolManageTitle') }}</strong><small>{{ t('admin.patrolManageDesc') }}</small></button>
							<button class="tool-card u-card" type="button" @click="openKmlTool"><span class="tool-icon"><AppIcon name="grid" :size="48" color="var(--c-primary)" /></span><strong>{{ t('admin.kmlTitle') }}</strong><small>{{ t('admin.kmlDesc') }}</small></button>
							<button class="tool-card u-card" type="button" @click="openDjangoCollectTool"><span class="tool-icon"><AppIcon name="records" :size="48" color="var(--c-primary)" /></span><strong>{{ t('admin.collectManageTitle') }}</strong><small>{{ t('admin.collectManageDesc') }}</small></button>
							<button class="tool-card u-card" type="button" @click="openProjectListOnline"><span class="tool-icon"><AppIcon name="file" :size="48" color="var(--c-primary)" /></span><strong>{{ t('admin.projectOnlineTitle') }}</strong><small>{{ t('admin.projectOnlineDesc') }}</small></button>
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
	import EmptyState from '@/components/EmptyState.vue';
	import AppSelect from '@/components/AppSelect.vue';
	import { heritageLevelAccent, heritageLevelShortLabel } from '@/lib/heritage-level.js';
	import { openApiEntry } from '@/lib/webview.js';
	import config from '@/lib/config.js';
	import { getUser, isAdminUser } from '@/lib/auth.js';
	import { apiRequest } from '@/lib/request.js';
	import { toast, showLoading, hideLoading } from '@/lib/ui.js';
	import { navigateTo, switchTab } from '@/lib/nav.js';
	import { t } from '@/lib/i18n.js';

	export default {
		components: { AppHeader, AppIcon, AppSelect, EmptyState },
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
				heritageFiltersOpen: false,
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
				projectFiltersOpen: false,
				showCompletedProjects: false,
				projectStatus: '',
				projectStatusOptions: [],
				projectListWebUrl: '',
				heritageResizeObserver: null,
				heritageResizeHandler: null,
			};
		},
		computed: {
			projectGroups() {
				const groups = [
					{ key: 'active', title: '流程中', items: this.projects.filter(item => !item.is_archived) },
				];
				const completed = this.projects.filter(item => item.is_archived);
				if (completed.length) groups.push({ key: 'completed', title: '已完成流程', items: completed });
				return groups;
			},
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
		watch: {
			currentTab() {
				if (this.currentTab !== 'heritages') {
					this.stopObservingHeritageLayout();
					return;
				}
				this.$nextTick(() => {
					this.observeHeritageLayout();
					this.updateHeritagePageSize();
				});
			},
			heritageFiltersOpen() {
				this.$nextTick(() => this.updateHeritagePageSize());
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
			this.$nextTick(async () => {
				this.observeHeritageLayout();
				await this.updateHeritagePageSize(false);
				this.loadData();
			});
		},
		deactivated() {
			this.stopObservingHeritageLayout();
		},
		methods: {
			heritageLevelAccent,
			heritageLevelShortLabel,
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
			observeHeritageLayout() {
				this.heritageResizeObserver?.disconnect();
				if (this.heritageResizeHandler) window.removeEventListener('resize', this.heritageResizeHandler);
				this.heritageResizeHandler = () => this.updateHeritagePageSize();
				window.addEventListener('resize', this.heritageResizeHandler);
				if (typeof ResizeObserver === 'function' && this.$refs.heritageList) {
					this.heritageResizeObserver = new ResizeObserver(() => this.updateHeritagePageSize());
					this.heritageResizeObserver.observe(this.$refs.heritageList);
				}
			},
			stopObservingHeritageLayout() {
				this.heritageResizeObserver?.disconnect();
				this.heritageResizeObserver = null;
				if (this.heritageResizeHandler) {
					window.removeEventListener('resize', this.heritageResizeHandler);
					this.heritageResizeHandler = null;
				}
			},
			async updateHeritagePageSize(reload = true) {
				const list = this.$refs.heritageList;
				if (!list || this.currentTab !== 'heritages') return;
				const sampleRow = list.querySelector('.heritage-row');
				const rowHeight = sampleRow ? sampleRow.getBoundingClientRect().height : 44;
				const rowGap = Number.parseFloat(getComputedStyle(list).rowGap) || 0;
				const nextSize = Math.max(1, Math.min(20, Math.floor((list.clientHeight + rowGap) / (rowHeight + rowGap))));
				if (nextSize === this.heritagePageSize) return;
				this.heritagePageSize = nextSize;
				this.heritagePage = 1;
				if (!reload) return;
				try {
					await this.loadHeritages(false);
				} catch (error) {
					console.error('Unable to resize heritage page', error);
					toast(this.t('admin.adminDataLoadFailed'), { icon: 'none' });
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
				this.heritageFiltersOpen = false;
			},
			async resetHeritageFilters() {
				this.heritageSearchKeyword = '';
				this.heritageCategory = '';
				this.heritagePage = 1;
				await this.loadHeritages();
				this.heritageFiltersOpen = false;
			},
			openHeritageDetail(item) {
				const name = encodeURIComponent(item.name || '');
				navigateTo(`/heritage/detail?id=${item.id}&name=${name}`);
			},
			onProjectStatusChange(event) {
				const selected = this.projectStatusSelectOptions[event.detail.value];
				this.projectStatus = selected ? selected.value : '';
			},
			toggleProjectFilters() {
				this.projectFiltersOpen = !this.projectFiltersOpen;
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

.admin-content { overflow: hidden; }
.admin-page { display: flex; flex-direction: column; height: 100%; min-height: 0; overflow: hidden; }
.admin-header { position: relative; top: auto; flex-shrink: 0; }
.admin-body { display: flex; flex: 1; flex-direction: column; min-height: 0; overflow: auto; }
.heritage-body, .projects-body { overflow: hidden; }
.heritage-layout, .projects-layout { display: flex; flex: 1; flex-direction: column; width: 100%; min-height: 0; }
.heritage-search, .project-search { flex-shrink: 0; }
.heritage-list { display: flex; flex: 1; flex-direction: column; gap: 0.25rem; min-height: 0; overflow: hidden; }
.heritage-list .heritage-row { flex: 0 0 2.75rem; min-height: 2.5rem; margin-bottom: 0; }
.heritage-level { flex-shrink: 0; max-width: 5.5rem; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; display: block; }
@media (max-width: 360px) {
	.heritage-level, .heritage-category { max-width: 3.5rem; }
}
.heritage-list .u-empty { flex: 1; }
.heritage-pagination { min-height: 2.25rem; }
.projects-layout { height: 100%; }
.projects-layout > .u-card:first-child { flex-shrink: 0; }
.project-list { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior-y: contain; }
.project-group { margin-bottom: 0.5rem; }
.project-online-link { align-self: flex-end; flex-shrink: 0; margin-top: 0.25rem; }
.tools-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
.tool-card { display: flex; min-width: 0; min-height: 8.5rem; flex-direction: column; align-items: flex-start; gap: 0.35rem; padding: 0.75rem; text-align: left; }
.tool-icon { display: flex; width: 2.75rem; height: 2.75rem; align-items: center; justify-content: center; background: var(--c-primary-light); }
.tool-card strong { color: var(--c-text); font-size: 0.875rem; line-height: 1.3; }
.tool-card small { overflow: hidden; color: var(--c-text-3); font-size: 0.6875rem; line-height: 1.4; text-overflow: ellipsis; }

.adm-search-field :deep(.van-cell) {
	min-height: 100%;
	padding: 0;
	background: transparent;
}

.adm-search-field :deep(.van-field__control) {
	font-size: 0.9375rem;
	color: var(--c-text);
}

.heritage-row {
	min-width: 0;
}

.heritage-code {
	flex: 0 1 5.5rem;
	min-width: 0;
	overflow: hidden;
	color: var(--c-text-3);
	font-family: ui-monospace, monospace;
	font-size: 0.6875rem;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.heritage-name {
	min-width: 3em;
	flex: 1;
	overflow: hidden;
	color: var(--c-text);
	font-size: 0.875rem;
	font-weight: 600;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.heritage-category {
	max-width: 6rem;
	flex-shrink: 0;
	overflow: hidden;
	border: 1px solid var(--c-primary-light);
	background: var(--c-primary-light);
	padding: 0.125rem 0.375rem;
	color: var(--c-primary);
	font-size: 0.6875rem;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
