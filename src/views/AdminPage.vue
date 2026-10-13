<template>
	<ion-page>
		<ion-content>
			<div class="u-page">
				<AppHeader :title="t('admin.title')" :subtitle="t('admin.headerSubtitle')" />

				<div class="adm-seg-wrap">
					<ion-segment class="adm-seg" :value="currentTab" mode="ios" @ionChange="onSegmentChange">
						<ion-segment-button value="heritages"><ion-label>{{ t('admin.tabHeritages') }}</ion-label></ion-segment-button>
						<ion-segment-button value="projects"><ion-label>{{ t('admin.tabProjects') }}</ion-label></ion-segment-button>
						<ion-segment-button value="tools"><ion-label>{{ t('admin.tabTools') }}</ion-label></ion-segment-button>
					</ion-segment>
				</div>

				<div class="u-body adm-body">
					<!-- 文物点数据 -->
					<template v-if="currentTab === 'heritages'">
						<div class="u-card adm-filter">
							<div class="adm-search">
								<AppIcon name="search" :size="36" color="#94A3B8" />
								<input
									v-model.trim="heritageSearchKeyword"
									class="adm-search-input"
									type="search"
									:placeholder="t('admin.searchHeritagePlaceholder')"
									enterkeyhint="search"
									@keyup.enter="applyHeritageFilters"
								/>
							</div>
							<div class="adm-filter-row">
								<select class="adm-select" :value="heritageCategoryIndex" @change="onHeritageCategoryChange({ detail: { value: Number($event.target.value) } })">
									<option v-for="(l, i) in heritageCategoryLabels" :key="i" :value="i">{{ l }}</option>
								</select>
								<button type="button" class="u-btn plain sm" @click="resetHeritageFilters">{{ t('admin.resetFilters') }}</button>
								<button type="button" class="u-btn primary sm" @click="applyHeritageFilters">{{ t('common.search') }}</button>
							</div>
						</div>

						<div class="adm-list-head">
							<span class="adm-list-title">{{ t('admin.allHeritages') }}</span>
							<span class="adm-list-count">{{ showHeritageFilterSummary ? t('admin.filterResultSummary', { count: heritageTotal, page: heritagePage }) : t('admin.recordCount', { count: heritageDisplayCount }) }}</span>
						</div>

						<div v-for="item in heritages" :key="item.id" class="u-card adm-item tappable" @click="openHeritageDetail(item)">
							<div class="adm-item-head">
								<span class="adm-item-title">{{ item.name }}</span>
								<AppIcon name="chevron-right" :size="36" color="#94A3B8" />
							</div>
							<div class="adm-badges">
								<span v-if="item.category" class="u-badge info">{{ item.category }}</span>
								<span v-if="item.level" class="u-badge warn">{{ item.level }}</span>
							</div>
							<div class="adm-kv"><span class="k">四普编号</span><span class="v mono">{{ item.sip_code || t('common.notAvailable') }}</span></div>
							<div class="adm-kv"><span class="k">地址</span><span class="v">{{ item.address || t('common.notAvailable') }}</span></div>
							<div v-if="item.longitude && item.latitude" class="adm-kv"><span class="k">坐标</span><span class="v mono">{{ item.longitude }}, {{ item.latitude }}</span></div>
						</div>
						<div v-if="!heritages.length" class="u-card u-empty">{{ t('admin.noHeritageMatched') }}</div>

						<div v-if="heritageTotalPages > 1" class="adm-pager">
							<button type="button" class="u-btn plain sm" :disabled="heritagePage <= 1" @click="changeHeritagePage(-1)">{{ t('admin.prevPage') }}</button>
							<span class="adm-pager-text">{{ t('admin.pageInfo', { page: heritagePage, total: heritageTotalPages }) }}</span>
							<button type="button" class="u-btn plain sm" :disabled="heritagePage >= heritageTotalPages" @click="changeHeritagePage(1)">{{ t('admin.nextPage') }}</button>
						</div>
					</template>

					<!-- 项目管理 -->
					<template v-if="currentTab === 'projects'">
						<div v-if="projectSummary" class="u-card adm-summary">
							<div class="adm-sum-cell"><span class="n">{{ projectSummary.total || 0 }}</span><span class="l">全部项目</span></div>
							<div class="adm-sum-cell"><span class="n">{{ projectSummary.in_progress || 0 }}</span><span class="l">在办</span></div>
							<div class="adm-sum-cell"><span class="n ok">{{ projectSummary.archived || 0 }}</span><span class="l">已归档</span></div>
							<div class="adm-sum-cell"><span class="n warn">{{ projectSummary.overlap || 0 }}</span><span class="l">涉及文物</span></div>
						</div>

						<div class="u-card adm-filter">
							<div class="adm-search">
								<AppIcon name="search" :size="36" color="#94A3B8" />
								<input
									v-model.trim="projectKeyword"
									class="adm-search-input"
									type="search"
									:placeholder="t('admin.searchProjectPlaceholder')"
									enterkeyhint="search"
									@keyup.enter="loadProjects()"
								/>
							</div>
							<div class="adm-filter-row">
								<select class="adm-select" :value="projectStatusIndex" @change="onProjectStatusChange({ detail: { value: Number($event.target.value) } })">
									<option v-for="(l, i) in projectStatusLabels" :key="i" :value="i">{{ l }}</option>
								</select>
								<button type="button" class="u-btn primary sm" @click="loadProjects()">{{ t('common.search') }}</button>
							</div>
						</div>

						<div class="adm-list-head">
							<span class="adm-list-title">{{ t('admin.projectsTitle') }}</span>
							<span class="adm-list-link" @click="openProjectListOnline">{{ t('admin.openProjectListOnline') }} ›</span>
						</div>

						<div v-for="item in projects" :key="item.id" class="u-card adm-item">
							<span class="adm-item-title">{{ item.project_name }}</span>
							<div class="adm-badges">
								<span :class="['u-badge', item.is_archived ? 'ok' : 'info']">{{ item.status_label }}</span>
								<span v-if="item.is_overlap_artifact" class="u-badge bad">{{ t('admin.projectOverlapBadge', { count: item.overlap_count }) }}</span>
								<span v-else-if="item.spatial_check_at" class="u-badge ok">{{ t('admin.projectNoOverlap') }}</span>
								<span v-else class="u-badge warn">{{ t('admin.projectNotChecked') }}</span>
							</div>
							<div class="adm-kv"><span class="k">建设单位</span><span class="v">{{ item.company_name || t('common.notFilled') }}</span></div>
							<div class="adm-kv"><span class="k">来函日期</span><span class="v">{{ item.incoming_doc_date || '-' }}</span></div>
							<div class="adm-kv"><span class="k">收文日期</span><span class="v">{{ item.receive_date || '-' }}</span></div>
							<div v-if="item.is_overlap_artifact" class="adm-kv"><span class="k">涉及文物</span><span class="v">{{ overlapNames(item) }}</span></div>
							<div v-if="item.final_reply_to_company" class="adm-kv"><span class="k">复函号</span><span class="v">{{ item.final_reply_to_company }}</span></div>
							<div class="adm-item-foot">
								<span class="adm-minor">{{ item.updated_at ? t('admin.projectUpdatedAt', { value: item.updated_at }) : '' }}</span>
								<button type="button" class="u-btn primary sm" @click="openProjectOnline(item)">{{ t('admin.openProjectOnline') }}</button>
							</div>
						</div>
						<div v-if="!projects.length" class="u-card u-empty">{{ t('admin.noProjectMatched') }}</div>
					</template>

					<!-- 工具入口 -->
					<template v-if="currentTab === 'tools'">
						<div class="adm-list-head"><span class="adm-list-title">{{ t('admin.fieldTools') }}</span></div>
						<div class="u-card adm-tool">
							<div class="adm-tool-main">
								<div class="adm-tool-icon" style="background:#E7F6EC"><AppIcon name="map" :size="48" color="#15803D" /></div>
								<div class="adm-tool-text">
									<span class="adm-tool-title">{{ t('admin.collectTitle') }}</span>
									<span class="adm-tool-desc">{{ t('admin.collectDesc') }}</span>
								</div>
							</div>
							<div class="adm-tool-actions">
								<button type="button" class="u-btn plain sm" @click="goMyRecords">{{ t('admin.myCollectRecords') }}</button>
								<button type="button" class="u-btn primary sm" @click="goCollect">{{ t('admin.startCollect') }}</button>
							</div>
						</div>

						<div class="adm-list-head"><span class="adm-list-title">{{ t('admin.onlineTools') }}</span></div>
						<div class="u-card adm-tool tappable" @click="openKmlTool">
							<div class="adm-tool-main">
								<div class="adm-tool-icon" style="background:#E0F4F8"><AppIcon name="grid" :size="48" color="#0E7490" /></div>
								<div class="adm-tool-text">
									<span class="adm-tool-title">{{ t('admin.kmlTitle') }}</span>
									<span class="adm-tool-desc">{{ t('admin.kmlDesc') }}</span>
								</div>
								<AppIcon name="chevron-right" :size="36" color="#94A3B8" />
							</div>
						</div>
						<div class="u-card adm-tool tappable" @click="openDjangoCollectTool">
							<div class="adm-tool-main">
								<div class="adm-tool-icon" style="background:#F1EAFE"><AppIcon name="records" :size="48" color="#7C3AED" /></div>
								<div class="adm-tool-text">
									<span class="adm-tool-title">{{ t('admin.collectManageTitle') }}</span>
									<span class="adm-tool-desc">{{ t('admin.collectManageDesc') }}</span>
								</div>
								<AppIcon name="chevron-right" :size="36" color="#94A3B8" />
							</div>
						</div>
						<div class="u-card adm-tool tappable" @click="openProjectListOnline">
							<div class="adm-tool-main">
								<div class="adm-tool-icon" style="background:#FEF3E2"><AppIcon name="file" :size="48" color="#B45309" /></div>
								<div class="adm-tool-text">
									<span class="adm-tool-title">{{ t('admin.projectOnlineTitle') }}</span>
									<span class="adm-tool-desc">{{ t('admin.projectOnlineDesc') }}</span>
								</div>
								<AppIcon name="chevron-right" :size="36" color="#94A3B8" />
							</div>
						</div>
						<span class="adm-tip">{{ t('admin.onlineTip') }}</span>
					</template>
				</div>
			</div>
		</ion-content>
	</ion-page>
</template>

<script>
	import { IonPage, IonContent, IonSegment, IonSegmentButton, IonLabel } from '@ionic/vue';
	import AppHeader from '@/components/AppHeader.vue';
	import AppIcon from '@/components/AppIcon.vue';
	import { openApiEntry } from '@/lib/webview.js';
	import config from '@/lib/config.js';
	import { getUser, isAdminUser } from '@/lib/auth.js';
	import { apiRequest } from '@/lib/request.js';
	import { toast, showLoading, hideLoading } from '@/lib/ui.js';
	import { navigateTo, switchTab } from '@/lib/nav.js';
	import { t } from '@/lib/i18n.js';

	export default {
		components: { IonPage, IonContent, IonSegment, IonSegmentButton, IonLabel, AppHeader, AppIcon },
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
		ionViewWillEnter() {
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
			onSegmentChange(event) {
				const value = event.detail.value;
				if (value) {
					this.currentTab = value;
				}
			},
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
	.adm-seg-wrap {
		position: sticky;
		top: 0;
		z-index: 5;
		padding: 10px 14px;
		background: var(--c-bg);
	}

	.adm-seg {
		--background: #E2E8F0;
		border-radius: 10px;
	}

	.adm-seg ion-segment-button {
		--indicator-color: #FFFFFF;
		--color: #475569;
		--color-checked: #1E5AA8;
		min-height: 38px;
		font-size: 15px;
		font-weight: 700;
	}

	.adm-body {
		padding-bottom: 20px;
	}

	.u-card {
		margin-bottom: 10px;
	}

	.adm-filter {
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.adm-search {
		display: flex;
		align-items: center;
		gap: 6px;
		height: 44px;
		padding: 0 12px;
		border-radius: 10px;
		background: #F5F7FB;
		border: 1px solid var(--c-line);
	}

	.adm-search-input {
		flex: 1;
		min-width: 0;
		height: 100%;
		border: none;
		background: transparent;
		font-size: 15px;
		color: var(--c-text);
	}

	.adm-search-input:focus {
		box-shadow: none;
	}

	.adm-filter-row {
		display: flex;
		gap: 8px;
	}

	.adm-filter-row .u-btn {
		flex-shrink: 0;
	}

	.adm-select {
		flex: 1;
		min-width: 0;
		height: 40px;
		padding: 0 30px 0 12px;
		border-radius: 10px;
		border: 1px solid var(--c-line);
		background: #FFFFFF url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='3'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 10px center;
		font-size: 15px;
		color: var(--c-text);
		-webkit-appearance: none;
		appearance: none;
		font-family: inherit;
	}

	.adm-list-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px;
		margin: 4px 2px 8px;
	}

	.adm-list-title {
		font-size: 17px;
		font-weight: 700;
		color: var(--c-text);
		white-space: nowrap;
	}

	.adm-list-count {
		font-size: 13px;
		color: var(--c-text-3);
		text-align: right;
	}

	.adm-list-link {
		font-size: 14px;
		color: var(--c-primary);
		font-weight: 600;
		white-space: nowrap;
	}

	.adm-item {
		padding: 12px 14px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.tappable:active {
		transform: scale(0.99);
		opacity: 0.92;
	}

	.adm-item-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.adm-item-title {
		font-size: 17px;
		font-weight: 800;
		color: var(--c-text);
		line-height: 1.4;
		word-break: break-all;
	}

	.adm-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin: 2px 0 4px;
	}

	.adm-badges .u-badge {
		font-size: 12px;
		padding: 3px 8px;
	}

	.adm-kv {
		display: flex;
		gap: 10px;
		font-size: 14px;
		line-height: 1.5;
	}

	.adm-kv .k {
		flex: 0 0 60px;
		color: var(--c-text-3);
	}

	.adm-kv .v {
		flex: 1;
		min-width: 0;
		color: var(--c-text-2);
		word-break: break-all;
	}

	.adm-kv .mono {
		font-variant-numeric: tabular-nums;
	}

	.adm-item-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin-top: 6px;
		padding-top: 10px;
		border-top: 1px solid #EEF2F7;
	}

	.adm-minor {
		font-size: 12px;
		color: #94A3B8;
	}

	.adm-pager {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin-top: 4px;
	}

	.adm-pager-text {
		font-size: 14px;
		color: var(--c-text-3);
	}

	.adm-summary {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		padding: 12px 6px;
	}

	.adm-sum-cell {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.adm-sum-cell + .adm-sum-cell {
		border-left: 1px solid #EEF2F7;
	}

	.adm-sum-cell .n {
		font-size: 20px;
		font-weight: 800;
		color: var(--c-primary);
		font-variant-numeric: tabular-nums;
	}

	.adm-sum-cell .n.ok {
		color: var(--c-success);
	}

	.adm-sum-cell .n.warn {
		color: var(--c-warning);
	}

	.adm-sum-cell .l {
		font-size: 12px;
		color: var(--c-text-3);
	}

	.adm-tool {
		padding: 12px 14px;
	}

	.adm-tool-main {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.adm-tool-icon {
		width: 44px;
		height: 44px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.adm-tool-text {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.adm-tool-title {
		font-size: 16px;
		font-weight: 700;
		color: var(--c-text);
	}

	.adm-tool-desc {
		font-size: 13px;
		line-height: 1.5;
		color: var(--c-text-3);
	}

	.adm-tool-actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
		margin-top: 12px;
	}

	.adm-tip {
		display: block;
		margin: 6px 4px 0;
		font-size: 12px;
		line-height: 1.6;
		color: #94A3B8;
		text-align: center;
	}
</style>
