<template>
	<ion-page>
		<ion-header>
			<ion-toolbar class="app-toolbar">
				<ion-title>管理中心</ion-title>
			</ion-toolbar>
		</ion-header>
		<ion-content :fullscreen="true">
			<div class="page">
				<div class="hero">
					<div>
						<span class="hero-kicker">{{ t('admin.heroLabel') }}</span>
						<span class="hero-title">{{ t('admin.title') }}</span>
						<span class="hero-subtitle">{{ t('admin.subtitle') }}</span>
					</div>
				</div>

				<ion-segment class="admin-segment" :value="currentTab" @ionChange="onSegmentChange">
					<ion-segment-button value="heritages"><ion-label>{{ t('admin.tabHeritages') }}</ion-label></ion-segment-button>
					<ion-segment-button value="projects"><ion-label>{{ t('admin.tabProjects') }}</ion-label></ion-segment-button>
					<ion-segment-button value="tools"><ion-label>{{ t('admin.tabTools') }}</ion-label></ion-segment-button>
				</ion-segment>

				<div v-if="currentTab === 'heritages'" class="section">
					<div class="section-header">
						<span class="section-title">{{ t('admin.allHeritages') }}</span>
						<span class="section-count">{{ t('admin.recordCount', { count: heritageDisplayCount }) }}</span>
					</div>
					<div class="filters-card">
						<div class="filters-row">
							<input
								v-model.trim="heritageSearchKeyword"
								class="filter-input"
								:placeholder="t('admin.searchHeritagePlaceholder')"
								enterkeyhint="search"
								@keyup.enter="applyHeritageFilters"
							/>
							<div class="filter-picker">
								<select class="picker-select" :value="heritageCategoryIndex" @change="onHeritageCategoryChange({ detail: { value: Number($event.target.value) } })">
									<option v-for="(l, i) in heritageCategoryLabels" :key="i" :value="i">{{ l }}</option>
								</select>
							</div>
						</div>
						<div class="filter-actions">
							<button type="button" class="ghost-lite-btn" @click="resetHeritageFilters">{{ t('admin.resetFilters') }}</button>
							<button type="button" class="primary-btn" @click="applyHeritageFilters">{{ t('common.search') }}</button>
						</div>
					</div>
					<span v-if="showHeritageFilterSummary" class="filter-summary">{{ t('admin.filterResultSummary', { count: heritageTotal, page: heritagePage }) }}</span>
					<div v-for="item in heritages" :key="item.id" class="card card-tappable" @click="openHeritageDetail(item)">
						<div class="card-head">
							<span class="card-title card-title-flex">{{ item.name }}</span>
							<span class="card-link">{{ t('admin.viewHeritageDetail') }} ›</span>
						</div>
						<span class="card-text">{{ t('admin.sipCode', { value: item.sip_code || t('common.notAvailable') }) }}</span>
						<span class="card-text">{{ t('admin.categoryLevel', { category: item.category || t('common.notAvailable'), level: item.level || t('common.notAvailable') }) }}</span>
						<span class="card-text">{{ t('admin.address', { value: item.address || t('common.notAvailable') }) }}</span>
						<span class="card-text">{{ t('admin.coordinates', { longitude: item.longitude || '-', latitude: item.latitude || '-' }) }}</span>
					</div>
					<div v-if="!heritages.length" class="card">
						<span class="card-text">{{ t('admin.noHeritageMatched') }}</span>
					</div>
					<div v-if="heritageTotalPages > 1" class="pagination-bar">
						<button type="button" class="ghost-lite-btn page-btn" :disabled="heritagePage <= 1" @click="changeHeritagePage(-1)">{{ t('admin.prevPage') }}</button>
						<span class="page-text">{{ t('admin.pageInfo', { page: heritagePage, total: heritageTotalPages }) }}</span>
						<button type="button" class="ghost-lite-btn page-btn" :disabled="heritagePage >= heritageTotalPages" @click="changeHeritagePage(1)">{{ t('admin.nextPage') }}</button>
					</div>
				</div>

				<div v-if="currentTab === 'projects'" class="section">
					<div class="section-header">
						<span class="section-title">{{ t('admin.projectsTitle') }}</span>
						<span class="section-count">{{ t('admin.recordCount', { count: projects.length }) }}</span>
					</div>
					<span v-if="projectSummary" class="filter-summary">{{ t('admin.projectSummary', {
						total: projectSummary.total || 0,
						inProgress: projectSummary.in_progress || 0,
						archived: projectSummary.archived || 0,
						overlap: projectSummary.overlap || 0,
					}) }}</span>
					<div class="filters-card">
						<div class="filters-row">
							<input
								v-model.trim="projectKeyword"
								class="filter-input"
								:placeholder="t('admin.searchProjectPlaceholder')"
								enterkeyhint="search"
								@keyup.enter="loadProjects()"
							/>
							<div class="filter-picker">
								<select class="picker-select" :value="projectStatusIndex" @change="onProjectStatusChange({ detail: { value: Number($event.target.value) } })">
									<option v-for="(l, i) in projectStatusLabels" :key="i" :value="i">{{ l }}</option>
								</select>
							</div>
						</div>
						<div class="filter-actions">
							<button type="button" class="ghost-lite-btn" @click="openProjectListOnline">{{ t('admin.openProjectListOnline') }}</button>
							<button type="button" class="primary-btn" @click="loadProjects()">{{ t('common.search') }}</button>
						</div>
					</div>
					<div v-for="item in projects" :key="item.id" class="card">
						<span class="card-title">{{ item.project_name }}</span>
						<div class="badge-row">
							<span :class="['badge', item.is_archived ? 'badge-muted' : '']">{{ item.status_label }}</span>
							<span v-if="item.is_overlap_artifact" class="badge badge-warn">{{ t('admin.projectOverlapBadge', { count: item.overlap_count }) }}</span>
						</div>
						<span class="card-text">{{ t('admin.projectCompany', { value: item.company_name || t('common.notFilled') }) }}</span>
						<span class="card-text">{{ t('admin.projectDates', { incoming: item.incoming_doc_date || '-', receive: item.receive_date || '-' }) }}</span>
						<span class="card-text">{{ projectOverlapText(item) }}</span>
						<span v-if="item.final_reply_to_company" class="card-text">{{ t('admin.projectReply', { value: item.final_reply_to_company }) }}</span>
						<span v-if="item.updated_at" class="card-text card-text-minor">{{ t('admin.projectUpdatedAt', { value: item.updated_at }) }}</span>
						<button type="button" class="primary-btn" @click="openProjectOnline(item)">{{ t('admin.openProjectOnline') }}</button>
					</div>
					<div v-if="!projects.length" class="card">
						<span class="card-text">{{ t('admin.noProjectMatched') }}</span>
					</div>
				</div>

				<div v-if="currentTab === 'tools'" class="section">
					<div class="card">
						<span class="card-title">{{ t('admin.kmlTitle') }}</span>
						<span class="card-text">{{ t('admin.kmlDesc') }}</span>
						<button type="button" class="primary-btn" @click="openKmlTool">{{ t('admin.openKml') }}</button>
					</div>
					<div class="card" style="margin-top:10px;">
						<span class="card-title">在线系统 · 不可移动文物采集</span>
						<span class="card-text">进入在线系统采集页面，支持现场采集表单填写、照片上传与登记记录管理。</span>
						<button type="button" class="primary-btn" @click="openDjangoCollectTool">打开采集管理页</button>
					</div>
					<div class="card" style="margin-top:10px;">
						<span class="card-title">四普现场数据采集</span>
						<span class="card-text">在现场对不可移动文物点进行登记采集，支持 GPS 定位、照片上传并自动加水印。</span>
						<div style="display:flex;gap:8px;margin-top:8px;">
							<button type="button" class="primary-btn" style="flex:2;" @click="goCollect">开始采集</button>
							<button type="button" class="ghost-lite-btn" style="flex:1;" @click="goMyRecords">我的采集</button>
						</div>
					</div>
				</div>
			</div>
		</ion-content>
	</ion-page>
</template>

<script>
	import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonSegment, IonSegmentButton, IonLabel } from '@ionic/vue';
	import config from '@/lib/config.js';
	import { getAuthHeader, getUser, isAdminUser } from '@/lib/auth.js';
	import { request } from '@/lib/request.js';
	import { toast, showLoading, hideLoading } from '@/lib/ui.js';
	import { navigateTo, switchTab } from '@/lib/nav.js';
	import { t } from '@/lib/i18n.js';

	export default {
		components: { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonSegment, IonSegmentButton, IonLabel },
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
				return request({
					url,
					method,
					data,
					header: {
						'Content-Type': 'application/json',
						...getAuthHeader(),
					},
				});
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
			projectOverlapText(item) {
				if (!item.spatial_check_at && !item.is_overlap_artifact) {
					return this.t('admin.projectNotChecked');
				}
				if (!item.is_overlap_artifact) {
					return this.t('admin.projectNoOverlap');
				}
				const names = (item.overlapped_relics || [])
					.map(row => (row.level ? `${row.name}（${row.level}）` : row.name))
					.filter(Boolean)
					.join('、');
				return this.t('admin.projectOverlap', { count: item.overlap_count, names: names || '-' });
			},
			openWebPage(url, title) {
				if (!url) {
					toast(this.t('admin.toolAddressMissing'), { icon: 'none' });
					return;
				}
				navigateTo(`/kml?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&locate=0`);
			},
			openProjectListOnline() {
				this.openWebPage(this.projectListWebUrl, this.t('admin.projectsTitle'));
			},
			async openProjectOnline(item) {
				try {
					const response = await this.request(`${config.API_BASE_URL}/api/admin/land-projects/${item.id}/web-entry`);
					this.openWebPage(response.data && response.data.url, item.project_name || this.t('admin.projectsTitle'));
				} catch (error) {
					toast(this.t('admin.openFailed'), { icon: 'none' });
				}
			},
			async openEntryTool(path) {
				try {
					const response = await this.request(`${config.API_BASE_URL}${path}`);
					const url = response.data && response.data.url;
					if (!url) {
						toast(this.t('admin.toolAddressMissing'), { icon: 'none' });
						return;
					}
					navigateTo(`/kml?url=${encodeURIComponent(url)}`);
				} catch (error) {
					toast(this.t('admin.openFailed'), { icon: 'none' });
				}
			},
			openKmlTool() {
				return this.openEntryTool('/api/admin/kml-overlay-entry');
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
	.page {
		min-height: 100%;
		padding: 12px;
		padding-bottom: 24px;
		box-sizing: border-box;
		background: var(--bg-primary);
	}
	.hero {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		min-height: var(--topbar-min-height);
		width: 100%;
		box-sizing: border-box;
		padding: var(--card-padding);
		border-radius: var(--radius-card);
		background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
		color: #fff;
		margin-bottom: 12px;
		box-shadow: var(--shadow-strong);
	}
	.hero-kicker {
		display: block;
		font-size: 10px;
		letter-spacing: 1.5px;
		text-transform: uppercase;
		opacity: 0.72;
		margin-bottom: 5px;
	}
	.hero-title {
		display: block;
		font-size: 20px;
		font-weight: 700;
		margin-bottom: 6px;
	}
	.hero-subtitle {
		display: block;
		font-size: 14px;
		line-height: 1.6;
		opacity: 0.88;
	}
	.admin-segment {
		margin-bottom: 12px;
	}
	.section {
		padding-bottom: 12px;
	}
	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 9px;
	}
	.section-title {
		font-size: 18px;
		font-weight: 700;
		color: var(--text-primary);
	}
	.section-count {
		font-size: 14px;
		color: var(--text-secondary);
	}
	.filters-card {
		background: #fff;
		border-radius: 9px;
		border: 0.5px solid var(--line-soft);
		padding: 9px;
		margin-bottom: 10px;
		box-shadow: var(--shadow-soft);
	}
	.filters-row {
		display: flex;
		gap: 6px;
		align-items: center;
	}
	.filter-input {
		flex: 1;
		min-width: 0;
		height: 39px;
		background: var(--input-bg);
		border-radius: 7px;
		border: 0.5px solid var(--line-soft);
		padding: 0 10px;
		box-sizing: border-box;
		font-size: 14px;
	}
	.filter-picker {
		flex: 0 0 125px;
		height: 39px;
		background: var(--input-bg);
		border-radius: 7px;
		border: 0.5px solid var(--line-soft);
		padding: 0 8px;
		box-sizing: border-box;
		display: flex;
		align-items: center;
	}
	.picker-select {
		width: 100%;
		border: none;
		background: transparent;
		font-size: 14px;
		color: var(--text-primary);
		outline: none;
	}
	.filter-actions {
		display: flex;
		gap: 6px;
		justify-content: flex-end;
		margin-top: 7px;
	}
	.filter-summary {
		display: block;
		margin: -2px 2px 8px;
		font-size: 12px;
		color: var(--text-secondary);
	}
	.pagination-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		margin-top: 4px;
		margin-bottom: 10px;
	}
	.page-btn {
		flex: 0 0 90px;
		height: 37px;
		line-height: 37px;
		padding: 0;
	}
	.page-text {
		flex: 1;
		text-align: center;
		font-size: 14px;
		color: var(--text-secondary);
	}
	.card {
		background: #fff;
		border-radius: 9px;
		border: 0.5px solid var(--line-soft);
		padding: var(--card-padding);
		margin-bottom: 10px;
		box-shadow: var(--shadow-soft);
	}
	.card-tappable:active {
		opacity: 0.85;
	}
	.card-head {
		display: flex;
		align-items: flex-start;
		gap: 8px;
	}
	.card-title-flex {
		flex: 1;
		min-width: 0;
	}
	.card-link {
		flex-shrink: 0;
		font-size: 12px;
		color: var(--accent-strong);
		padding-top: 3px;
	}
	.card-title {
		display: block;
		font-size: 18px;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 7px;
	}
	.card-text {
		display: block;
		font-size: 14px;
		line-height: 1.7;
		color: var(--text-secondary);
		margin-bottom: 4px;
	}
	.card-text-minor {
		font-size: 12px;
		opacity: 0.8;
	}
	.badge-row {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.badge {
		display: inline-block;
		padding: 4px 8px;
		border-radius: var(--radius-pill);
		background: var(--accent-soft);
		color: var(--accent-strong);
		font-size: 11px;
		margin-bottom: 6px;
	}
	.badge-muted {
		background: #eef1f5;
		color: #66707d;
	}
	.badge-warn {
		background: #fff1e6;
		color: #c2410c;
	}
	.primary-btn, .ghost-lite-btn {
		border-radius: var(--radius-pill);
		font-size: 12.5px;
	}
	.primary-btn {
		background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
		color: #fff;
		margin-top: 6px;
	}
	.ghost-lite-btn {
		background: rgba(9, 92, 219, 0.12);
		color: var(--accent-strong);
		border: 0.5px solid rgba(9, 92, 219, 0.26);
	}
</style>
