<template>
	<view class="page">
		<view class="header-card">
			<text class="header-title">{{ userRole === 'admin' ? t('home.adminDashboard') : t('home.patrolDashboard') }}</text>
			<text class="header-subtitle">{{ user.full_name || user.username || t('home.guestUser') }}</text>
		</view>

		<view v-if="userRole === 'patrol'" class="patrol-panel">
			<button class="start-btn" @click="goPatrol">{{ t('home.startPatrol') }}</button>

			<view class="card nearest-card">
				<text class="card-title">{{ t('home.nearestSite') }}</text>
				<view v-if="nearestSite">
					<text class="item-title">{{ nearestSite.name }}</text>
					<text class="item-text">{{ nearestSite.address || t('home.noAddress') }}</text>
					<text class="item-text" v-if="typeof nearestSite.distance === 'number'">{{ t('home.distanceKm', { distance: nearestSite.distance }) }}</text>
					<text class="item-text" v-else>{{ nearestSite.distance || t('home.nearestAutoPicked') }}</text>
				</view>
				<view v-else>
					<text class="item-text">{{ t('home.locating') }}</text>
				</view>
			</view>
		</view>

		<view v-else class="admin-panel">
			<view class="stats-row">
				<view class="stat-card card">
					<text class="stat-label">{{ t('home.totalSites') }}</text>
					<text class="stat-value">{{ adminStats.totalSites }}</text>
				</view>
				<view class="stat-card card">
					<text class="stat-label">{{ t('home.todayInspections') }}</text>
					<text class="stat-value">{{ adminStats.todayInspections }}</text>
				</view>
				<view class="stat-card card">
					<text class="stat-label">{{ t('home.pendingProjects') }}</text>
					<text class="stat-value">{{ adminStats.pendingProjects }}</text>
				</view>
			</view>

			<view class="card">
				<text class="card-title">{{ t('home.features') }}</text>
				<view class="feature-grid">
					<view class="feature-item" v-for="item in adminFeatures" :key="item.key" @click="onFeatureClick(item)">
						<text class="feature-icon">{{ item.icon }}</text>
						<text class="feature-text">{{ item.name }}</text>
					</view>
				</view>
			</view>
		</view>

		<BottomNav current="home" :userInfo="user" />
	</view>
</template>

<script>
	import config from '../../common/js/config.js';
	import { getAuthHeader, getToken, getUser } from '../../common/js/auth.js';
	import createPageI18n from '../../common/js/pageI18n.js';
	import BottomNav from '../../components/BottomNav.vue';

	const featureDefinitions = [
		{ key: 'patrol', labelKey: 'home.featurePatrol', icon: '巡', url: '/pages/patrol/patrol' },
		{ key: 'records', labelKey: 'home.featureRecords', icon: '记', url: '/pages/records/records' },
		{ key: 'heritages', labelKey: 'home.featureHeritages', icon: '文', url: '/pages/admin/admin' },
		{ key: 'collectManage', labelKey: 'home.featureCollectManage', icon: '采', url: '/pages/collect/my_records' },
		{ key: 'projects', labelKey: 'home.featureProjects', icon: '项', url: '/pages/admin/admin?tab=projects' },
		{ key: 'kml', labelKey: 'home.featureKml', icon: '图', url: '/pages/kml/kml' },
		{ key: 'my', labelKey: 'home.featureMy', icon: '我', url: '/pages/my/my' },
	];

	export default {
		mixins: [createPageI18n('home')],
		components: {
			BottomNav,
		},
		data() {
			return {
				user: {},
				location: {
					latitude: 0,
					longitude: 0,
				},
				nearestSite: null,
				adminStats: {
					totalSites: 0,
					todayInspections: 0,
					pendingProjects: 0,
				},
			};
		},
		computed: {
			adminFeatures() {
				return featureDefinitions.map((item) => ({
					...item,
					name: this.t(item.labelKey),
				}));
			},
			userRole() {
				if (!this.user) {
					return 'patrol';
				}
				if (this.user.is_admin || this.user.role === '管理员' || this.user.role === '超级管理员') {
					return 'admin';
				}
				return 'patrol';
			}
		},
		onLoad() {
			if (!getToken()) {
				uni.reLaunch({ url: '/pages/index/index' });
				return;
			}
			this.user = getUser() || {};
			if (this.userRole === 'admin') {
				this.loadAdminData();
			} else {
				this.loadPatrolData();
			}
		},
		methods: {
			goPatrol() {
				uni.navigateTo({ url: '/pages/patrol/patrol' });
			},
			onFeatureClick(item) {
				if (item.url) {
					uni.navigateTo({ url: item.url });
					return;
				}
				uni.showToast({ title: this.t('home.featureBuilding'), icon: 'none' });
			},
			loadPatrolData() {
				uni.getLocation({
					type: 'wgs84',
					success: (res) => {
						this.location.latitude = res.latitude;
						this.location.longitude = res.longitude;
						this.loadNearestSite();
					},
					fail: () => {
						this.nearestSite = {
							name: this.t('home.locationFailedName'),
							address: this.t('home.locationFailedAddress'),
							distance: '-',
						};
					}
				});
			},
			loadNearestSite() {
				uni.request({
					url: `${config.API_BASE_URL}/api/heritages/nearby`,
					method: 'GET',
					header: getAuthHeader(),
					data: {
						latitude: this.location.latitude,
						longitude: this.location.longitude,
					},
					success: (res) => {
						if (res.statusCode === 200 && res.data) {
							this.nearestSite = res.data;
							return;
						}
						this.nearestSite = { name: this.t('home.noMatchedSite'), address: '', distance: '-' };
					},
					fail: () => {
						this.nearestSite = {
							name: this.t('home.loadFailedName'),
							address: this.t('home.checkNetwork'),
							distance: '-',
						};
					}
				});
			},
			async loadAdminData() {
				uni.showLoading({ title: this.t('common.loading') });
				try {
					const [statsRes, recordsRes, projectsRes] = await Promise.all([
						this.request(`${config.API_BASE_URL}/api/dashboard/realtime-stats`),
						this.request(`${config.API_BASE_URL}/api/inspections/mine`),
						this.request(`${config.API_BASE_URL}/api/admin/projects`),
					]);

					const stats = (statsRes && statsRes.data) || {};
					this.adminStats.totalSites = (stats.overview && stats.overview.total_sites) || 0;

					const records = (recordsRes && recordsRes.data && recordsRes.data.items) || [];
					const todayKey = this.todayString();
					this.adminStats.todayInspections = records.filter(item => {
						const t = item.inspect_time || '';
						return t.slice(0, 10) === todayKey;
					}).length;

					const projects = (projectsRes && projectsRes.data && projectsRes.data.items) || [];
					this.adminStats.pendingProjects = projects.filter(item => item.workflow_status !== 'archived').length;
				} catch (error) {
					uni.showToast({ title: this.t('home.loadDataFailed'), icon: 'none' });
				} finally {
					uni.hideLoading();
				}
			},
			request(url, method = 'GET', data = null) {
				return new Promise((resolve, reject) => {
					uni.request({
						url,
						method,
						data,
						header: {
							...getAuthHeader(),
							'Content-Type': 'application/json',
						},
						success: resolve,
						fail: reject,
					});
				});
			},
			todayString() {
				const d = new Date();
				const y = d.getFullYear();
				const m = String(d.getMonth() + 1).padStart(2, '0');
				const day = String(d.getDate()).padStart(2, '0');
				return `${y}-${m}-${day}`;
			},
		}
	}
</script>

<style>
	.page {
		min-height: 100vh;
		padding: 24rpx 24rpx 140rpx;
		padding-bottom: calc(184rpx + env(safe-area-inset-bottom));
		padding-bottom: calc(184rpx + constant(safe-area-inset-bottom));
		box-sizing: border-box;
		background: var(--bg-primary);
	}
	.header-card {
		min-height: var(--topbar-min-height);
		width: 100%;
		box-sizing: border-box;
		padding: var(--card-padding);
		border-radius: var(--radius-card);
		background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
		margin-bottom: 20rpx;
		box-shadow: var(--shadow-strong);
	}
	.header-title {
		display: block;
		font-size: 20px;
		font-weight: 600;
		color: #fff;
		line-height: 1.3;
		margin-bottom: 4rpx;
	}
	.header-subtitle {
		display: block;
		font-size: 14px;
		color: #fff;
		opacity: 0.92;
	}
	.card {
		background: #fff;
		border-radius: 18rpx;
		border: 1rpx solid var(--line-soft);
		padding: var(--card-padding);
		margin-bottom: 16rpx;
		box-shadow: var(--shadow-soft);
	}
	.card-title {
		display: block;
		font-size: 18px;
		font-weight: 600;
		color: var(--accent);
		margin-bottom: 12rpx;
	}
	.item-title {
		display: block;
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 8rpx;
	}
	.item-text {
		display: block;
		font-size: 14px;
		color: var(--text-secondary);
		line-height: 1.6;
	}
	.start-btn {
		height: 110rpx;
		line-height: 110rpx;
		font-size: 20px;
		font-weight: 700;
		color: #fff;
		background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
		border-radius: 18rpx;
		margin-bottom: 18rpx;
		box-shadow: var(--shadow-soft);
	}
	.stats-row {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 12rpx;
		margin-bottom: 16rpx;
	}
	.stat-card {
		margin-bottom: 0;
		padding: var(--card-padding);
	}
	.stat-label {
		display: block;
		font-size: 13px;
		color: var(--text-secondary);
		margin-bottom: 6rpx;
	}
	.stat-value {
		display: block;
		font-size: 24px;
		font-weight: 700;
		color: var(--accent);
	}
	.feature-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 14rpx;
	}
	.feature-item {
		background: #fff;
		border: 1rpx solid var(--line-soft);
		border-radius: 16rpx;
		height: 170rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		box-shadow: var(--shadow-soft);
	}
	.feature-icon {
		width: 64rpx;
		height: 64rpx;
		line-height: 64rpx;
		text-align: center;
		border-radius: 999rpx;
		background: var(--accent-soft);
		color: var(--accent);
		font-size: 26rpx;
		font-weight: 700;
		margin-bottom: 10rpx;
	}
	.feature-text {
		font-size: 14px;
		color: var(--text-primary);
	}
</style>
