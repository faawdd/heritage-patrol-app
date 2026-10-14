<template>
	<ion-page>
		<ion-content :fullscreen="true" class="home-content">
			<ion-refresher slot="fixed" @ionRefresh="onRefresh($event)">
				<ion-refresher-content />
			</ion-refresher>
			
			<!-- 简洁头部 -->
			<div class="home-header">
				<div class="header-top">
					<div class="header-text">
						<h1 class="header-title">{{ greet }}，{{ displayName }}</h1>
						<p class="header-date">{{ today }}</p>
					</div>
					<div class="header-badge">{{ roleText }}</div>
				</div>
			</div>

			<div class="home-body">
				<!-- 主操作按钮 - 最大最醒目 -->
				<button type="button" class="primary-action" @click="goPatrol">
					<div class="primary-action-icon">
						<AppIcon name="camera" :size="56" color="#FFFFFF" :stroke="2" />
					</div>
					<div class="primary-action-text">
						<span class="primary-action-title">开始巡查</span>
						<span class="primary-action-sub">拍照上报文物点情况</span>
					</div>
					<AppIcon name="arrow-right" :size="32" color="#FFFFFF" :stroke="2.5" />
				</button>

				<!-- 今日统计 - 简洁卡片 -->
				<div class="stats-card">
					<div class="stats-header" @click="goRecords">
						<div class="stats-status" :class="todayCount ? 'done' : 'pending'">
							<AppIcon :name="todayCount ? 'check-circle' : 'clock'" :size="28" :color="todayCount ? '#10B981' : '#F59E0B'" />
							<span>{{ todayCount ? `今日已巡查 ${todayCount} 次` : '今日待巡查' }}</span>
						</div>
						<span class="stats-link">查看记录</span>
					</div>
					<div class="stats-grid">
						<div class="stat-item">
							<span class="stat-value">{{ todayCount }}</span>
							<span class="stat-label">今天</span>
						</div>
						<div class="stat-item">
							<span class="stat-value">{{ monthCount }}</span>
							<span class="stat-label">本月</span>
						</div>
						<div class="stat-item">
							<span class="stat-value">{{ totalLabel }}</span>
							<span class="stat-label">累计</span>
						</div>
						<div class="stat-item" v-if="problemCount > 0">
							<span class="stat-value danger">{{ problemCount }}</span>
							<span class="stat-label">问题</span>
						</div>
					</div>
				</div>

				<!-- 附近文物点 -->
				<div class="site-card">
					<div v-if="siteState === 'loading'" class="site-loading">
						<div class="site-icon">
							<AppIcon name="locate" :size="36" color="#94A3B8" />
						</div>
						<div class="site-info">
							<span class="site-label">最近文物点</span>
							<span class="site-status">正在定位…</span>
						</div>
					</div>
					<div v-else-if="siteState === 'ok'" class="site-content" @click="goPatrol">
						<div class="site-icon success">
							<AppIcon name="landmark" :size="36" color="#2563EB" />
						</div>
						<div class="site-info">
							<span class="site-label">最近文物点</span>
							<span class="site-name">{{ nearestSite.name }}</span>
							<span class="site-address">{{ nearestSite.address || '暂无地址' }}</span>
						</div>
						<div class="site-distance">
							<span class="distance-value">{{ distanceText }}</span>
						</div>
					</div>
					<div v-else class="site-error">
						<div class="site-icon warning">
							<AppIcon name="alert" :size="36" color="#F59E0B" />
						</div>
						<div class="site-info">
							<span class="site-label">最近文物点</span>
							<span class="site-status">{{ siteError }}</span>
						</div>
						<button type="button" class="retry-btn" @click="locate">重试</button>
					</div>
				</div>

				<!-- 管理员功能 -->
				<template v-if="isAdmin">
					<div class="section-header">
						<h2 class="section-title">管理工作台</h2>
						<span class="section-summary">{{ adminStats.totalSites }} 文物点 · {{ adminStats.pendingProjects }} 在办项目</span>
					</div>
					<div class="admin-grid">
						<button 
							v-for="item in adminFeatures" 
							:key="item.key" 
							type="button"
							class="admin-item" 
							@click="open(item.url)"
						>
							<div class="admin-icon" :style="{ background: item.bg }">
								<AppIcon :name="item.icon" :size="32" :color="item.color" :stroke="2" />
							</div>
							<span class="admin-name">{{ item.name }}</span>
						</button>
					</div>
				</template>

				<!-- 最近巡查 -->
				<template v-if="recent.length">
					<div class="section-header">
						<h2 class="section-title">最近巡查</h2>
						<button type="button" class="section-link" @click="goRecords">全部</button>
					</div>
					<div class="recent-list">
						<button 
							v-for="item in recent" 
							:key="item.id" 
							type="button"
							class="recent-item" 
							@click="goRecords"
						>
							<div class="recent-status" :class="item.is_normal ? 'ok' : 'bad'">
								<AppIcon :name="item.is_normal ? 'check-circle' : 'alert'" :size="24" :color="item.is_normal ? '#10B981' : '#EF4444'" />
							</div>
							<div class="recent-content">
								<span class="recent-name">{{ item.site_name }}</span>
								<span class="recent-time">{{ friendly(item.inspect_time) }}</span>
							</div>
							<span class="recent-badge" :class="item.is_normal ? 'ok' : 'bad'">{{ item.is_normal ? '正常' : '问题' }}</span>
						</button>
					</div>
				</template>
			</div>
		</ion-content>
	</ion-page>
</template>

<script>
	import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/vue';
	import AppHeader from '@/components/AppHeader.vue';
	import AppIcon from '@/components/AppIcon.vue';
	import { getUser, isAdminUser, setUser } from '@/lib/auth.js';
	import { getRoleLabel } from '@/lib/i18n.js';
	import { apiRequest, extractError } from '@/lib/request.js';
	import { navigateTo, switchTab } from '@/lib/nav.js';
	import { dateLabel, formatDistance, friendlyTime, getLocation, greeting, monthKey, todayKey } from '@/lib/format.js';

	const ADMIN_FEATURES = [
		{ key: 'heritages', name: '文物点管理', icon: 'landmark', url: '/tabs/admin', color: '#1E5AA8', bg: '#E8F0FB' },
		{ key: 'projects', name: '建设项目', icon: 'file', url: '/tabs/admin?tab=projects', color: '#B45309', bg: '#FEF3E2' },
		{ key: 'collect', name: '现场采集', icon: 'map', url: '/collect', color: '#15803D', bg: '#E7F6EC' },
		{ key: 'collectRecords', name: '采集记录', icon: 'records', url: '/collect/records', color: '#7C3AED', bg: '#F1EAFE' },
		{ key: 'kml', name: 'KML 检查', icon: 'grid', url: '/kml', color: '#0E7490', bg: '#E0F4F8' },
		{ key: 'tools', name: '管理工具', icon: 'chart', url: '/tabs/admin?tab=tools', color: '#C62828', bg: '#FDECEC' },
	];

	export default {
		components: { AppHeader, AppIcon, IonContent, IonPage, IonRefresher, IonRefresherContent },
		data() {
			return {
				user: {},
				records: [],
				nearestSite: null,
				siteState: 'loading',
				siteError: '',
				adminStats: { totalSites: '-', pendingProjects: '-' },
				greet: greeting(),
				today: dateLabel(),
				adminFeatures: ADMIN_FEATURES,
			};
		},
		computed: {
			isAdmin() {
				return isAdminUser(this.user);
			},
			displayName() {
				return this.user.full_name || this.user.username || '看护员';
			},
			roleText() {
				return getRoleLabel(this.user.role || (this.isAdmin ? '管理员' : '文物看护员'));
			},
			todayCount() {
				const key = todayKey();
				return this.records.filter((r) => String(r.inspect_time || '').slice(0, 10) === key).length;
			},
			monthCount() {
				const key = monthKey();
				return this.records.filter((r) => String(r.inspect_time || '').slice(0, 7) === key).length;
			},
			totalLabel() {
				return this.records.length >= 100 ? '100+' : this.records.length;
			},
			problemCount() {
				return this.records.filter((r) => !r.is_normal).length;
			},
			recent() {
				return this.records.slice(0, 3);
			},
			distanceText() {
				return formatDistance(this.nearestSite && this.nearestSite.distance);
			},
		},
		ionViewWillEnter() {
			this.user = getUser() || {};
			this.greet = greeting();
			this.today = dateLabel();
			this.refresh();
		},
		methods: {
			onRefresh(event) {
				this.greet = greeting();
				this.today = dateLabel();
				this.refresh().finally(() => event.target.complete());
			},
			refresh() {
				const tasks = [this.loadProfile(), this.loadRecords(), this.locate()];
				if (this.isAdmin) {
					tasks.push(this.loadAdminData());
				}
				return Promise.all(tasks.map((p) => p.catch(() => null)));
			},
			loadProfile() {
				return apiRequest({ url: '/api/auth/me' }).then((res) => {
					if (res.statusCode === 200 && res.data && res.data.user) {
						this.user = res.data.user;
						setUser(res.data.user);
					}
				});
			},
			loadRecords() {
				return apiRequest({ url: '/api/inspections/mine' }).then((res) => {
					if (res.statusCode === 200 && res.data) {
						this.records = res.data.items || [];
					}
				});
			},
			locate() {
				this.siteState = 'loading';
				return getLocation()
					.then((loc) => apiRequest({ url: '/api/heritages/nearby', data: { latitude: loc.latitude, longitude: loc.longitude } }))
					.then((res) => {
						if (res.statusCode === 200 && res.data && res.data.id) {
							this.nearestSite = res.data;
							this.siteState = 'ok';
						} else {
							this.siteState = 'error';
							this.siteError = extractError(res, '附近没有找到文物点');
						}
					})
					.catch((err) => {
						this.siteState = 'error';
						this.siteError = err && err.isLocationError
							? err.errMsg
							: '网络异常，查找附近文物点失败';
					});
			},
			loadAdminData() {
				return Promise.all([
					apiRequest({ url: '/api/dashboard/realtime-stats' }),
					apiRequest({ url: '/api/admin/land-projects' }),
				]).then(([statsRes, projectsRes]) => {
					const stats = (statsRes && statsRes.data) || {};
					this.adminStats.totalSites = (stats.overview && stats.overview.total_sites) || 0;
					const body = (projectsRes && projectsRes.data) || {};
					if (body.summary) {
						this.adminStats.pendingProjects = body.summary.in_progress || 0;
					} else {
						this.adminStats.pendingProjects = (body.items || []).filter((p) => !p.is_archived).length;
					}
				});
			},
			friendly(value) {
				return friendlyTime(value);
			},
			goPatrol() {
				switchTab('/tabs/patrol');
			},
			goRecords() {
				switchTab('/tabs/records');
			},
			open(url) {
				if (url.indexOf('/tabs/') === 0) {
					switchTab(url);
					return;
				}
				navigateTo(url);
			},
		},
	};
</script>

<style scoped>
/* ========== 首页简约设计 ========== */
.home-content {
	--background: #F8FAFC;
}

/* 简洁头部 */
.home-header {
	background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
	padding: 20px 20px 24px;
	padding-top: calc(env(safe-area-inset-top) + 20px);
}

.header-top {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 12px;
}

.header-text {
	flex: 1;
	min-width: 0;
}

.header-title {
	margin: 0;
	font-size: 24px;
	font-weight: 700;
	color: #FFFFFF;
	line-height: 1.3;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.header-date {
	margin: 4px 0 0;
	font-size: 14px;
	color: rgba(255, 255, 255, 0.85);
}

.header-badge {
	flex-shrink: 0;
	padding: 6px 12px;
	border-radius: 20px;
	background: rgba(255, 255, 255, 0.2);
	border: 1px solid rgba(255, 255, 255, 0.3);
	font-size: 13px;
	font-weight: 600;
	color: #FFFFFF;
	white-space: nowrap;
}

/* 主体内容 */
.home-body {
	padding: 16px;
	padding-bottom: 32px;
}

/* 主操作按钮 - 最大最醒目 */
.primary-action {
	display: flex;
	align-items: center;
	gap: 16px;
	width: 100%;
	padding: 20px;
	margin-bottom: 16px;
	border: none;
	border-radius: 20px;
	background: linear-gradient(135deg, #2563EB 0%, #1E40AF 100%);
	box-shadow: 0 8px 24px rgba(37, 99, 235, 0.35);
	cursor: pointer;
	transition: all 150ms ease;
	text-align: left;
}

.primary-action:active {
	transform: scale(0.98);
	box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
}

.primary-action-icon {
	width: 64px;
	height: 64px;
	border-radius: 16px;
	background: rgba(255, 255, 255, 0.2);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.primary-action-text {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.primary-action-title {
	font-size: 22px;
	font-weight: 700;
	color: #FFFFFF;
	letter-spacing: 0.5px;
}

.primary-action-sub {
	font-size: 14px;
	color: rgba(255, 255, 255, 0.9);
}

/* 统计卡片 */
.stats-card {
	background: #FFFFFF;
	border-radius: 16px;
	padding: 16px;
	margin-bottom: 16px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.stats-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-bottom: 12px;
	border-bottom: 1px solid #F1F5F9;
	margin-bottom: 12px;
	cursor: pointer;
}

.stats-status {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 15px;
	font-weight: 600;
}

.stats-status.pending {
	color: #F59E0B;
}

.stats-status.done {
	color: #10B981;
}

.stats-link {
	font-size: 14px;
	color: #2563EB;
	font-weight: 500;
	background: none;
	border: none;
	cursor: pointer;
	padding: 0;
}

.stats-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));
	gap: 8px;
}

.stat-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 8px 4px;
	border-radius: 12px;
	background: #F8FAFC;
}

.stat-value {
	font-size: 24px;
	font-weight: 700;
	color: #2563EB;
	line-height: 1.2;
	font-variant-numeric: tabular-nums;
}

.stat-value.danger {
	color: #EF4444;
}

.stat-label {
	margin-top: 2px;
	font-size: 12px;
	color: #64748B;
	font-weight: 500;
}

/* 文物点卡片 */
.site-card {
	background: #FFFFFF;
	border-radius: 16px;
	padding: 16px;
	margin-bottom: 16px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.site-loading,
.site-content,
.site-error {
	display: flex;
	align-items: center;
	gap: 12px;
}

.site-content {
	cursor: pointer;
}

.site-icon {
	width: 48px;
	height: 48px;
	border-radius: 12px;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	background: #F1F5F9;
}

.site-icon.success {
	background: #DBEAFE;
}

.site-icon.warning {
	background: #FEF3C7;
}

.site-info {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.site-label {
	font-size: 12px;
	color: #94A3B8;
	font-weight: 500;
}

.site-name {
	font-size: 16px;
	font-weight: 600;
	color: #1E293B;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.site-address {
	font-size: 13px;
	color: #64748B;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.site-status {
	font-size: 14px;
	color: #64748B;
}

.site-distance {
	flex-shrink: 0;
}

.distance-value {
	font-size: 15px;
	font-weight: 600;
	color: #2563EB;
}

.retry-btn {
	flex-shrink: 0;
	padding: 8px 16px;
	border: 1px solid #E2E8F0;
	border-radius: 8px;
	background: #FFFFFF;
	font-size: 14px;
	font-weight: 500;
	color: #2563EB;
	cursor: pointer;
	transition: all 150ms ease;
}

.retry-btn:active {
	background: #F8FAFC;
	transform: scale(0.97);
}

/* 区块标题 */
.section-header {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	margin: 24px 4px 12px;
}

.section-title {
	margin: 0;
	font-size: 18px;
	font-weight: 700;
	color: #1E293B;
}

.section-summary {
	font-size: 13px;
	color: #64748B;
	font-weight: 400;
}

.section-link {
	font-size: 14px;
	color: #2563EB;
	font-weight: 500;
	background: none;
	border: none;
	cursor: pointer;
	padding: 0;
}

/* 管理员功能网格 */
.admin-grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 12px;
}

.admin-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 16px 8px;
	border: none;
	border-radius: 16px;
	background: #FFFFFF;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
	cursor: pointer;
	transition: all 150ms ease;
}

.admin-item:active {
	transform: scale(0.97);
	box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
}

.admin-icon {
	width: 48px;
	height: 48px;
	border-radius: 12px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.admin-name {
	font-size: 13px;
	font-weight: 600;
	color: #1E293B;
	text-align: center;
}

/* 最近巡查列表 */
.recent-list {
	background: #FFFFFF;
	border-radius: 16px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
	overflow: hidden;
}

.recent-item {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 14px 16px;
	border: none;
	background: none;
	width: 100%;
	text-align: left;
	cursor: pointer;
	transition: background 150ms ease;
}

.recent-item:not(:last-child) {
	border-bottom: 1px solid #F1F5F9;
}

.recent-item:active {
	background: #F8FAFC;
}

.recent-status {
	width: 36px;
	height: 36px;
	border-radius: 10px;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.recent-status.ok {
	background: #D1FAE5;
}

.recent-status.bad {
	background: #FEE2E2;
}

.recent-content {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.recent-name {
	font-size: 15px;
	font-weight: 600;
	color: #1E293B;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.recent-time {
	font-size: 13px;
	color: #94A3B8;
}

.recent-badge {
	flex-shrink: 0;
	padding: 4px 10px;
	border-radius: 6px;
	font-size: 12px;
	font-weight: 600;
}

.recent-badge.ok {
	background: #D1FAE5;
	color: #059669;
}

.recent-badge.bad {
	background: #FEE2E2;
	color: #DC2626;
}
</style>
