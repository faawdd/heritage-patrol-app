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
				<view v-for="item in heritages" :key="item.id" class="card card-tappable" @click="openHeritageDetail(item)">
					<view class="card-head">
						<text class="card-title card-title-flex">{{ item.name }}</text>
						<text class="card-link">{{ t('admin.viewHeritageDetail') }} ›</text>
					</view>
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
				<text v-if="projectSummary" class="filter-summary">{{ t('admin.projectSummary', {
					total: projectSummary.total || 0,
					inProgress: projectSummary.in_progress || 0,
					archived: projectSummary.archived || 0,
					overlap: projectSummary.overlap || 0,
				}) }}</text>
				<view class="filters-card">
					<view class="filters-row">
						<input
							v-model.trim="projectKeyword"
							class="filter-input"
							:placeholder="t('admin.searchProjectPlaceholder')"
							@confirm="loadProjects()"
						/>
						<picker class="filter-picker" :range="projectStatusLabels" :value="projectStatusIndex" @change="onProjectStatusChange">
							<view class="picker-text">{{ projectStatusLabels[projectStatusIndex] }}</view>
						</picker>
					</view>
					<view class="filter-actions">
						<button class="ghost-lite-btn" @click="openProjectListOnline">{{ t('admin.openProjectListOnline') }}</button>
						<button class="primary-btn" @click="loadProjects()">{{ t('common.search') }}</button>
					</view>
				</view>
				<view v-for="item in projects" :key="item.id" class="card">
					<text class="card-title">{{ item.project_name }}</text>
					<view class="badge-row">
						<text :class="['badge', item.is_archived ? 'badge-muted' : '']">{{ item.status_label }}</text>
						<text v-if="item.is_overlap_artifact" class="badge badge-warn">{{ t('admin.projectOverlapBadge', { count: item.overlap_count }) }}</text>
					</view>
					<text class="card-text">{{ t('admin.projectCompany', { value: item.company_name || t('common.notFilled') }) }}</text>
					<text class="card-text">{{ t('admin.projectDates', { incoming: item.incoming_doc_date || '-', receive: item.receive_date || '-' }) }}</text>
					<text class="card-text">{{ projectOverlapText(item) }}</text>
					<text v-if="item.final_reply_to_company" class="card-text">{{ t('admin.projectReply', { value: item.final_reply_to_company }) }}</text>
					<text v-if="item.updated_at" class="card-text card-text-minor">{{ t('admin.projectUpdatedAt', { value: item.updated_at }) }}</text>
					<button class="primary-btn" @click="openProjectOnline(item)">{{ t('admin.openProjectOnline') }}</button>
				</view>
				<view v-if="!projects.length" class="card">
					<text class="card-text">{{ t('admin.noProjectMatched') }}</text>
				</view>
			</view>

			<view v-if="currentTab === 'tools'" class="section">
				<view class="card">
					<text class="card-title">{{ t('admin.kmlTitle') }}</text>
					<text class="card-text">{{ t('admin.kmlDesc') }}</text>
					<button class="primary-btn" @click="openKmlTool">{{ t('admin.openKml') }}</button>
				</view>
				<view class="card" style="margin-top:20rpx;">
					<text class="card-title">在线系统 · 不可移动文物采集</text>
					<text class="card-text">进入在线系统采集页面，支持现场采集表单填写、照片上传与登记记录管理。</text>
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
	import createPageI18n from '../../common/js/pageI18n.js';
	import BottomNav from '../../components/BottomNav.vue';

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
			openHeritageDetail(item) {
				const name = encodeURIComponent(item.name || '');
				uni.navigateTo({ url: `/pages/heritage/detail?id=${item.id}&name=${name}` });
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
					uni.showToast({ title: this.t('admin.toolAddressMissing'), icon: 'none' });
					return;
				}
				uni.navigateTo({
					url: `/pages/kml/kml?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&locate=0`,
				});
			},
			openProjectListOnline() {
				this.openWebPage(this.projectListWebUrl, this.t('admin.projectsTitle'));
			},
			async openProjectOnline(item) {
				try {
					const response = await this.request(`${config.API_BASE_URL}/api/admin/land-projects/${item.id}/web-entry`);
					this.openWebPage(response.data && response.data.url, item.project_name || this.t('admin.projectsTitle'));
				} catch (error) {
					uni.showToast({ title: this.t('admin.openFailed'), icon: 'none' });
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
	.card {
		background: #fff;
		border-radius: 18rpx;
		border: 1rpx solid var(--line-soft);
		padding: var(--card-padding);
		margin-bottom: 20rpx;
		box-shadow: var(--shadow-soft);
	}
	.card-tappable:active {
		opacity: 0.85;
	}
	.card-head {
		display: flex;
		align-items: flex-start;
		gap: 16rpx;
	}
	.card-title-flex {
		flex: 1;
		min-width: 0;
	}
	.card-link {
		flex-shrink: 0;
		font-size: 24rpx;
		color: var(--accent-strong);
		padding-top: 6rpx;
	}
	.card-title {
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
	.card-text-minor {
		font-size: 12px;
		opacity: 0.8;
	}
	.badge-row {
		display: flex;
		flex-wrap: wrap;
		gap: 12rpx;
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
	.badge-muted {
		background: #eef1f5;
		color: #66707d;
	}
	.badge-warn {
		background: #fff1e6;
		color: #c2410c;
	}
	.picker-text {
		font-size: 14px;
		color: var(--text-primary);
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
