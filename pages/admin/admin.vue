<template>
	<view class="page">
		<view class="hero">
			<view>
				<text class="hero-kicker">{{ t('admin.heroLabel') }}</text>
				<text class="hero-title">{{ t('admin.title') }}</text>
				<text class="hero-subtitle">{{ t('admin.subtitle') }}</text>
			</view>
		</view>

		<view class="tabs">
			<view :class="['tab', currentTab === 'heritages' ? 'tab-active' : '']" @click="currentTab = 'heritages'">{{ t('admin.tabHeritages') }}</view>
			<view :class="['tab', currentTab === 'projects' ? 'tab-active' : '']" @click="currentTab = 'projects'">{{ t('admin.tabProjects') }}</view>
			<view :class="['tab', currentTab === 'tools' ? 'tab-active' : '']" @click="currentTab = 'tools'">{{ t('admin.tabTools') }}</view>
		</view>

		<scroll-view scroll-y class="content-scroll">
			<view v-if="currentTab === 'heritages'" class="section">
				<view class="section-header">
					<text class="section-title">{{ t('admin.allHeritages') }}</text>
					<text class="section-count">{{ t('admin.recordCount', { count: heritageDisplayCount }) }}</text>
				</view>
				<view class="filters-card">
					<view class="filters-row">
						<input
							v-model.trim="heritageSearchKeyword"
							class="filter-input"
							:placeholder="t('admin.searchHeritagePlaceholder')"
						/>
						<picker class="filter-picker" :range="heritageCategoryLabels" :value="heritageCategoryIndex" @change="onHeritageCategoryChange">
							<view class="picker-text">{{ selectedHeritageCategoryLabel }}</view>
						</picker>
					</view>
					<view class="filter-actions">
						<button class="ghost-lite-btn" @click="resetHeritageFilters">{{ t('admin.resetFilters') }}</button>
						<button class="primary-btn" @click="applyHeritageFilters">{{ t('common.search') }}</button>
					</view>
				</view>
				<text v-if="showHeritageFilterSummary" class="filter-summary">{{ t('admin.filterResultSummary', { count: heritageTotal, page: heritagePage }) }}</text>
				<view v-for="item in heritages" :key="item.id" class="card">
					<text class="card-title">{{ item.name }}</text>
					<text class="card-text">{{ t('admin.sipCode', { value: item.sip_code || t('common.notAvailable') }) }}</text>
					<text class="card-text">{{ t('admin.categoryLevel', { category: item.category || t('common.notAvailable'), level: item.level || t('common.notAvailable') }) }}</text>
					<text class="card-text">{{ t('admin.address', { value: item.address || t('common.notAvailable') }) }}</text>
					<text class="card-text">{{ t('admin.coordinates', { longitude: item.longitude || '-', latitude: item.latitude || '-' }) }}</text>
				</view>
				<view v-if="!heritages.length" class="card">
					<text class="card-text">{{ t('admin.noHeritageMatched') }}</text>
				</view>
				<view v-if="heritageTotalPages > 1" class="pagination-bar">
					<button class="ghost-lite-btn page-btn" :disabled="heritagePage <= 1" @click="changeHeritagePage(-1)">{{ t('admin.prevPage') }}</button>
					<text class="page-text">{{ t('admin.pageInfo', { page: heritagePage, total: heritageTotalPages }) }}</text>
					<button class="ghost-lite-btn page-btn" :disabled="heritagePage >= heritageTotalPages" @click="changeHeritagePage(1)">{{ t('admin.nextPage') }}</button>
				</view>
			</view>

			<view v-if="currentTab === 'projects'" class="section">
				<view class="section-header">
					<text class="section-title">{{ t('admin.projectsTitle') }}</text>
					<text class="section-count">{{ t('admin.recordCount', { count: projects.length }) }}</text>
				</view>
				<view v-for="item in projects" :key="item.id" class="card">
					<text class="card-title">{{ item.project_name }}</text>
					<text class="badge">{{ getWorkflowText(item.workflow_status) }}</text>
					<text class="card-text">{{ t('admin.projectUnit', { value: item.project_unit || t('common.notFilled') }) }}</text>
					<text class="card-text">{{ t('admin.relatedSite', { value: item.related_site_name || t('common.notLinked') }) }}</text>
					<text class="card-text">{{ t('admin.coordinates', { longitude: item.project_lon || '-', latitude: item.project_lat || '-' }) }}</text>
					<text class="card-text">{{ t('admin.conclusion', { value: item.survey_conclusion || t('common.notAvailable') }) }}</text>
					<button class="primary-btn" @click="startEdit(item)">{{ t('admin.editProjectInfo') }}</button>
				</view>

				<view v-if="editingProject" class="editor-panel">
					<text class="editor-title">{{ t('admin.editProjectTitle', { name: form.project_name || t('common.notAvailable') }) }}</text>
					<input v-model="form.project_name" class="input" :placeholder="t('admin.projectNamePlaceholder')" />
					<input v-model="form.project_unit" class="input" :placeholder="t('admin.projectUnitPlaceholder')" />
					<picker class="picker" :range="workflowLabels" @change="onWorkflowChange">
						<view class="picker-text">{{ t('admin.currentStatus', { value: workflowLabel }) }}</view>
					</picker>
					<textarea v-model="form.construction_content" class="textarea" :placeholder="t('admin.constructionContentPlaceholder')"></textarea>
					<input v-model="form.project_scale" class="input" :placeholder="t('admin.projectScalePlaceholder')" />
					<input v-model="form.project_coordinates" class="input" :placeholder="t('admin.projectCoordinatesPlaceholder')" />
					<input v-model="form.project_lon" class="input" :placeholder="t('admin.projectLongitudePlaceholder')" type="digit" />
					<input v-model="form.project_lat" class="input" :placeholder="t('admin.projectLatitudePlaceholder')" type="digit" />
					<textarea v-model="form.survey_conclusion" class="textarea" :placeholder="t('admin.surveyConclusionPlaceholder')"></textarea>
					<textarea v-model="form.remarks" class="textarea" :placeholder="t('admin.remarksPlaceholder')"></textarea>
					<view class="editor-actions">
						<button class="ghost-lite-btn" @click="cancelEdit">{{ t('common.cancel') }}</button>
						<button class="primary-btn" @click="saveProject">{{ t('admin.saveChanges') }}</button>
					</view>
				</view>
			</view>

			<view v-if="currentTab === 'tools'" class="section">
				<view class="card">
					<text class="card-title">{{ t('admin.kmlTitle') }}</text>
					<text class="card-text">{{ t('admin.kmlDesc') }}</text>
					<button class="primary-btn" @click="openKmlTool">{{ t('admin.openKml') }}</button>
				</view>
				<view class="card" style="margin-top:20rpx;">
					<text class="card-title">Django管理端 · 鄯善县不可移动文物采集</text>
					<text class="card-text">进入 Django 管理端采集页面，支持现场采集表单填写、照片上传与登记记录管理。</text>
					<button class="primary-btn" @click="openDjangoCollectTool">打开采集管理页</button>
				</view>
				<view class="card" style="margin-top:20rpx;">
					<text class="card-title">四普现场数据采集</text>
					<text class="card-text">在现场对不可移动文物点进行登记采集，支持 GPS 定位、照片上传并自动加水印。</text>
					<view style="display:flex;gap:16rpx;margin-top:16rpx;">
						<button class="primary-btn" style="flex:2;" @click="goCollect">开始采集</button>
						<button class="ghost-lite-btn" style="flex:1;" @click="goMyRecords">我的采集</button>
					</view>
				</view>
			</view>
		</scroll-view>

		<BottomNav current="admin" />
	</view>
</template>

<script>
	import config from '../../common/js/config.js';
	import { getAuthHeader, getUser, isAdminUser } from '../../common/js/auth.js';
	import { getWorkflowLabel } from '../../common/js/i18n.js';
	import createPageI18n from '../../common/js/pageI18n.js';
	import BottomNav from '../../components/BottomNav.vue';

	const workflowValues = [
		'received',
		'ovital_checked',
		'site_surveyed',
		'application_submitted',
		'bureau_approved',
		'replied_to_project',
		'archived',
	];

	export default {
		mixins: [createPageI18n('admin')],
		components: {
			BottomNav,
		},
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
				editingProject: null,
				form: {
					project_name: '',
					project_unit: '',
					workflow_status: 'received',
					construction_content: '',
					project_scale: '',
					project_coordinates: '',
					project_lon: '',
					project_lat: '',
					survey_conclusion: '',
					remarks: '',
				},
			};
		},
		computed: {
			workflowOptions() {
				return workflowValues.map((value) => ({
					value,
					label: getWorkflowLabel(value),
				}));
			},
			workflowLabels() {
				return this.workflowOptions.map(item => item.label);
			},
			workflowLabel() {
				const selected = this.workflowOptions.find(item => item.value === this.form.workflow_status);
				return selected ? selected.label : this.t('admin.selectStatus');
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
			selectedHeritageCategoryLabel() {
				return this.heritageCategorySelectOptions[this.heritageCategoryIndex].label;
			},
			showHeritageFilterSummary() {
				return !!this.heritageSearchKeyword.trim() || !!this.heritageCategory;
			},
			heritageDisplayCount() {
				return this.heritageTotal;
			},
		},
		onLoad(options) {
			const user = getUser();
			if (!isAdminUser(user)) {
				uni.showToast({ title: this.t('admin.noAdminPermission'), icon: 'none' });
				uni.reLaunch({ url: '/pages/home/home' });
				return;
			}
			if (options && ['heritages', 'projects', 'tools'].includes(options.tab)) {
				this.currentTab = options.tab;
			}
			this.loadData();
		},
		methods: {
			getWorkflowText(status) {
				return getWorkflowLabel(status);
			},
			request(url, method = 'GET', data = null) {
				return new Promise((resolve, reject) => {
					uni.request({
						url,
						method,
						data,
						header: {
							'Content-Type': 'application/json',
							...getAuthHeader(),
						},
						success: resolve,
						fail: reject,
					});
				});
			},
			async loadData() {
				uni.showLoading({ title: this.t('common.loading') });
				try {
					await Promise.all([this.loadHeritages(false), this.loadProjects(false)]);
				} catch (error) {
					uni.showToast({ title: this.t('admin.adminDataLoadFailed'), icon: 'none' });
				} finally {
					uni.hideLoading();
				}
			},
			async loadHeritages(showLoading = true) {
				if (showLoading) {
					uni.showLoading({ title: this.t('admin.loadingHeritages') });
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
					if (showLoading) {
						uni.hideLoading();
					}
				}
			},
			async loadProjects(showLoading = true) {
				if (showLoading) {
					uni.showLoading({ title: this.t('admin.loadingProjects') });
				}
				try {
					const projectRes = await this.request(`${config.API_BASE_URL}/api/admin/projects`);
					this.projects = (projectRes.data && projectRes.data.items) || [];
				} finally {
					if (showLoading) {
						uni.hideLoading();
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
			startEdit(item) {
				this.editingProject = item.id;
				this.form = {
					project_name: item.project_name || '',
					project_unit: item.project_unit || '',
					workflow_status: item.workflow_status || 'received',
					construction_content: item.construction_content || '',
					project_scale: item.project_scale || '',
					project_coordinates: item.project_coordinates || '',
					project_lon: item.project_lon == null ? '' : String(item.project_lon),
					project_lat: item.project_lat == null ? '' : String(item.project_lat),
					survey_conclusion: item.survey_conclusion || '',
					remarks: item.remarks || '',
				};
				this.currentTab = 'projects';
			},
			cancelEdit() {
				this.editingProject = null;
			},
			onWorkflowChange(event) {
				const option = this.workflowOptions[event.detail.value];
				this.form.workflow_status = option.value;
			},
			async saveProject() {
				if (!this.editingProject) {
					return;
				}
				try {
					const response = await this.request(
						`${config.API_BASE_URL}/api/admin/projects/${this.editingProject}`,
						'PUT',
						{
							...this.form,
							project_lon: this.form.project_lon === '' ? null : Number(this.form.project_lon),
							project_lat: this.form.project_lat === '' ? null : Number(this.form.project_lat),
							related_site_id: null,
						}
					);
					if (response.statusCode === 200) {
						uni.showToast({ title: this.t('admin.projectUpdated'), icon: 'success' });
						this.editingProject = null;
						this.loadProjects();
						return;
					}
					uni.showToast({ title: this.t('admin.saveFailed'), icon: 'none' });
				} catch (error) {
					uni.showToast({ title: this.t('admin.saveFailed'), icon: 'none' });
				}
			},
			async openKmlTool() {
				try {
					const response = await this.request(`${config.API_BASE_URL}/api/admin/kml-overlay-entry`);
					const url = response.data && response.data.url;
					if (!url) {
						uni.showToast({ title: this.t('admin.toolAddressMissing'), icon: 'none' });
						return;
					}
					uni.navigateTo({ url: `/pages/kml/kml?url=${encodeURIComponent(url)}` });
				} catch (error) {
					uni.showToast({ title: this.t('admin.openFailed'), icon: 'none' });
				}
			},
			async openDjangoCollectTool() {
				try {
					const response = await this.request(`${config.API_BASE_URL}/api/admin/collect-entry`);
					const url = response.data && response.data.url;
					if (!url) {
						uni.showToast({ title: this.t('admin.toolAddressMissing'), icon: 'none' });
						return;
					}
					uni.navigateTo({ url: `/pages/kml/kml?url=${encodeURIComponent(url)}` });
				} catch (error) {
					uni.showToast({ title: this.t('admin.openFailed'), icon: 'none' });
				}
			},
			goCollect() {
				uni.navigateTo({ url: '/pages/collect/collect' });
			},
			goMyRecords() {
				uni.navigateTo({ url: '/pages/collect/my_records' });
			},
		},
	};
</script>

<style>
	.page {
		min-height: 100vh;
		padding: 24rpx;
		padding-bottom: calc(184rpx + env(safe-area-inset-bottom));
		padding-bottom: calc(184rpx + constant(safe-area-inset-bottom));
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
		margin-bottom: 24rpx;
		box-shadow: var(--shadow-strong);
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
		margin-bottom: 12rpx;
	}
	.hero-subtitle {
		display: block;
		font-size: 14px;
		line-height: 1.6;
		opacity: 0.88;
	}
	.tabs {
		display: flex;
		gap: 16rpx;
		margin-bottom: 24rpx;
	}
	.tab {
		flex: 1;
		padding: 18rpx 0;
		text-align: center;
		border-radius: var(--radius-pill);
		background: #fff;
		border: 1rpx solid var(--line-soft);
		color: var(--text-secondary);
		font-size: 14px;
	}
	.tab-active {
		background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
		color: #fff;
		font-weight: 700;
		border-color: transparent;
	}
	.content-scroll {
		height: calc(100vh - 320rpx);
	}
	.section {
		padding-bottom: 24rpx;
	}
	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 18rpx;
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
		border-radius: 18rpx;
		border: 1rpx solid var(--line-soft);
		padding: 18rpx;
		margin-bottom: 20rpx;
		box-shadow: var(--shadow-soft);
	}
	.filters-row {
		display: flex;
		gap: 12rpx;
		align-items: center;
	}
	.filter-input {
		flex: 1;
		height: 78rpx;
		background: var(--input-bg);
		border-radius: 14rpx;
		border: 1rpx solid var(--line-soft);
		padding: 0 20rpx;
		box-sizing: border-box;
		font-size: 14px;
	}
	.filter-picker {
		flex: 0 0 250rpx;
		height: 78rpx;
		background: var(--input-bg);
		border-radius: 14rpx;
		border: 1rpx solid var(--line-soft);
		padding: 0 16rpx;
		box-sizing: border-box;
		display: flex;
		align-items: center;
	}
	.filter-actions {
		display: flex;
		gap: 12rpx;
		justify-content: flex-end;
		margin-top: 14rpx;
	}
	.filter-summary {
		display: block;
		margin: -4rpx 4rpx 16rpx;
		font-size: 24rpx;
		color: var(--text-secondary);
	}
	.pagination-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12rpx;
		margin-top: 8rpx;
		margin-bottom: 20rpx;
	}
	.page-btn {
		flex: 0 0 180rpx;
		height: 74rpx;
		line-height: 74rpx;
		padding: 0;
	}
	.page-text {
		flex: 1;
		text-align: center;
		font-size: 14px;
		color: var(--text-secondary);
	}
	.card, .editor-panel {
		background: #fff;
		border-radius: 18rpx;
		border: 1rpx solid var(--line-soft);
		padding: var(--card-padding);
		margin-bottom: 20rpx;
		box-shadow: var(--shadow-soft);
	}
	.card-title, .editor-title {
		display: block;
		font-size: 18px;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 14rpx;
	}
	.card-text {
		display: block;
		font-size: 14px;
		line-height: 1.7;
		color: var(--text-secondary);
		margin-bottom: 8rpx;
	}
	.badge {
		display: inline-block;
		padding: 8rpx 16rpx;
		border-radius: var(--radius-pill);
		background: var(--accent-soft);
		color: var(--accent-strong);
		font-size: 22rpx;
		margin-bottom: 12rpx;
	}
	.input, .textarea, .picker {
		width: 100%;
		background: var(--input-bg);
		border-radius: 18rpx;
		border: 1rpx solid var(--line-soft);
		padding: 20rpx;
		box-sizing: border-box;
		margin-bottom: 16rpx;
		font-size: 14px;
	}
	.textarea {
		height: 160rpx;
	}
	.picker-text {
		font-size: 14px;
		color: var(--text-primary);
	}
	.editor-actions {
		display: flex;
		gap: 16rpx;
	}
	.primary-btn, .ghost-lite-btn {
		border-radius: var(--radius-pill);
		font-size: 25rpx;
	}
	.primary-btn {
		background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
		color: #fff;
		margin-top: 12rpx;
	}
	.ghost-lite-btn {
		background: rgba(9, 92, 219, 0.12);
		color: var(--accent-strong);
		border: 1rpx solid rgba(9, 92, 219, 0.26);
	}
</style>
