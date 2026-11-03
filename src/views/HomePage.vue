<template>
	<div class="app-page">
		<div class="app-content home-content">
			<van-pull-refresh v-model="refreshing" @refresh="onRefresh">
			
			<!-- 简洁头部 -->
			<div class="home-header">
				<div class="header-top">
					<div class="header-text">
						<span class="header-kicker">基层文物巡查 · 野外作业终端</span>
						<h1 class="header-title">{{ greet }}，{{ displayName }}</h1>
						<p class="header-date">{{ today }}</p>
					</div>
					<div class="header-badge">{{ roleText }}</div>
				</div>
			</div>

			<div class="home-body">
				<!-- 主操作按钮 - 最大最醒目 -->
				<van-button native-type="button" class="primary-action" @click="goPatrol">
					<div class="primary-action-icon">
						<AppIcon name="camera" :size="56" color="var(--c-on-primary)" :stroke="2" />
					</div>
					<div class="primary-action-text">
						<span class="primary-action-title">开始巡查</span>
						<span class="primary-action-sub">拍照上报文物点情况</span>
					</div>
					<AppIcon name="arrow-right" :size="32" color="var(--c-on-primary)" :stroke="2.5" />
				</van-button>

				<!-- 今日统计 - 简洁卡片 -->
				<div class="stats-card">
					<div class="stats-header" @click="goRecords">
						<div class="stats-status" :class="todayCount ? 'done' : 'pending'">
							<AppIcon :name="todayCount ? 'check-circle' : 'clock'" :size="28" :color="todayCount ? 'var(--c-success)' : 'var(--c-warning)'" />
							<span>{{ todayCount ? `今日已巡查 ${todayCount} 次` : '今日待巡查' }}</span>
						</div>
						<span class="stats-link">查看记录</span>
					</div>
					<div class="stats-grid">
						<div class="stat-item featured">
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
							<AppIcon name="locate" :size="36" color="var(--c-text-4)" />
						</div>
						<div class="site-info">
							<span class="site-label">最近文物点</span>
							<span class="site-status">正在定位…</span>
						</div>
					</div>
					<div v-else-if="siteState === 'ok'" class="site-content" @click="goPatrol">
						<div class="site-icon success">
							<AppIcon name="landmark" :size="36" color="var(--c-primary)" />
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
							<AppIcon name="alert" :size="36" color="var(--c-warning)" />
						</div>
						<div class="site-info">
							<span class="site-label">最近文物点</span>
							<span class="site-status">{{ siteError }}</span>
						</div>
						<van-button native-type="button" class="retry-btn" @click="locate">重试</van-button>
					</div>
				</div>

				<!-- 管理员功能 -->
				<template v-if="isAdmin">
					<div class="section-header">
						<h2 class="section-title">管理工作台</h2>
						<span class="section-summary">{{ adminStats.totalSites }} 文物点 · {{ adminStats.pendingProjects }} 在办项目</span>
					</div>
					<div class="admin-grid">
						<van-button
							v-for="item in adminFeatures" 
							:key="item.key" 
							native-type="button"
							class="admin-item" 
							@click="open(item.url)"
						>
							<div class="admin-icon">
								<AppIcon :name="item.icon" :size="36" color="var(--c-primary)" :stroke="1.9" />
							</div>
							<span class="admin-name">{{ item.name }}</span>
						</van-button>
					</div>
				</template>

				<!-- 最近巡查 -->
				<template v-if="recent.length">
					<div class="section-header recent-head">
						<h2 class="section-title">最近巡查</h2>
						<van-button native-type="button" class="section-link" @click="goRecords">全部</van-button>
					</div>
					<div class="recent-list">
						<van-button
							v-for="item in recent.slice(0, 2)" 
							:key="item.id" 
							native-type="button"
							class="recent-item" 
							@click="goRecords"
						>
							<div class="recent-status" :class="item.is_normal ? 'ok' : 'bad'">
								<AppIcon :name="item.is_normal ? 'check-circle' : 'alert'" :size="24" :color="item.is_normal ? 'var(--c-success)' : 'var(--c-danger)'" />
							</div>
							<div class="recent-content">
								<span class="recent-name">{{ item.site_name }}</span>
								<span class="recent-time">{{ friendly(item.inspect_time) }}</span>
							</div>
							<span class="recent-badge" :class="item.is_normal ? 'ok' : 'bad'">{{ item.is_normal ? '正常' : '问题' }}</span>
						</van-button>
					</div>
				</template>
			</div>
		</van-pull-refresh>
		</div>
	</div>
</template>

<script>
	import AppHeader from '@/components/AppHeader.vue';
	import AppIcon from '@/components/AppIcon.vue';
	import { getUser, isAdminUser, setUser } from '@/lib/auth.js';
	import { getRoleLabel } from '@/lib/i18n.js';
	import { apiRequest, extractError } from '@/lib/request.js';
	import { navigateTo, switchTab } from '@/lib/nav.js';
	import { dateLabel, formatDistance, friendlyTime, getLocation, greeting, monthKey, todayKey } from '@/lib/format.js';

	const ADMIN_FEATURES = [
		{ key: 'heritages', name: '文物点管理', icon: 'landmark', url: '/tabs/admin' },
		{ key: 'projects', name: '建设项目', icon: 'file', url: '/tabs/admin?tab=projects' },
		{ key: 'collect', name: '现场采集', icon: 'map', url: '/collect' },
		{ key: 'collectRecords', name: '采集记录', icon: 'records', url: '/collect/records' },
		{ key: 'kml', name: 'KML 检查', icon: 'grid', url: '/kml' },
		{ key: 'tools', name: '管理工具', icon: 'chart', url: '/tabs/admin?tab=tools' },
	];

	export default {
		components: { AppHeader, AppIcon, },
		data() {
			return {
				refreshing: false,
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
		activated() {
			this.user = getUser() || {};
			this.greet = greeting();
			this.today = dateLabel();
			this.refresh();
		},
		methods: {
			onRefresh() {
				this.greet = greeting();
				this.today = dateLabel();
				this.refresh().finally(() => { this.refreshing = false; });
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
/* ========== 首页：专业野外作业工作台 ========== */
.home-content {
	background: var(--c-bg);
}

.home-header {
	position: relative;
	isolation: isolate;
	overflow: hidden;
	background: var(--g-hero);
	padding: 14px 18px 20px;
	padding-top: calc(env(safe-area-inset-top) + 12px);
	border-bottom: 1px solid rgba(255, 255, 255, 0.14);
}

.home-header::after {
	content: "";
	position: absolute;
	z-index: -1;
	width: 190px;
	height: 190px;
	right: -74px;
	top: -90px;
	border: 1px solid rgba(255, 255, 255, 0.12);
	border-radius: 50%;
	box-shadow: 0 0 0 18px rgba(255, 255, 255, 0.035), 0 0 0 38px rgba(255, 255, 255, 0.025);
	pointer-events: none;
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

.header-kicker {
	display: block;
	margin-bottom: 7px;
	font-size: 0.6875rem;
	font-weight: 600;
	letter-spacing: 0.12em;
	color: var(--c-on-hero);
	opacity: 0.72;
}

.header-title {
	margin: 0;
	font-size: 1.3125rem;
	font-weight: 700;
	color: var(--c-on-hero);
	line-height: 1.3;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.header-date {
	margin: 4px 0 0;
	font-size: 0.8125rem;
	color: var(--c-on-hero);
	opacity: 0.85;
	font-weight: 400;
}

.header-badge {
	flex-shrink: 0;
	padding: 6px 12px;
	border-radius: 20px;
	background: rgba(255, 255, 255, 0.18);
	border: 1px solid rgba(255, 255, 255, 0.25);
	font-size: 0.75rem;
	font-weight: 500;
	color: var(--c-on-hero);
	white-space: nowrap;
}

/* 主体内容 */
.home-body {
	padding: 12px 16px 24px;
}

/* 主操作按钮 - 最大最醒目，使用绿色渐变 */
.primary-action {
	display: flex;
	align-items: center;
	gap: 14px;
	width: 100%;
	padding: 16px;
	margin-bottom: 12px;
	border: none;
	border-radius: 16px;
	background: var(--g-primary);
	box-shadow: 0 4px 16px rgba(var(--c-primary-rgb), 0.25);
	cursor: pointer;
	transition: all 150ms ease;
	text-align: left;
}

.primary-action:active {
	transform: scale(0.98);
	box-shadow: 0 2px 8px rgba(var(--c-primary-rgb), 0.20);
}

.primary-action-icon {
	width: 52px;
	height: 52px;
	border-radius: 14px;
	background: rgba(255, 255, 255, 0.18);
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
	font-size: 1.125rem;
	font-weight: 600;
	color: var(--c-on-primary);
	letter-spacing: 0.3px;
}

.primary-action-sub {
	font-size: 0.8125rem;
	color: var(--c-on-primary);
	opacity: 0.9;
	font-weight: 400;
}

/* 统计卡片 */
.stats-card {
	background: var(--c-surface);
	border-radius: var(--r-card);
	padding: 16px;
	margin-bottom: 12px;
	box-shadow: var(--shadow-sm);
	border: 1px solid var(--c-line);
}

.stats-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-bottom: 12px;
	border-bottom: 1px solid var(--c-line);
	margin-bottom: 12px;
	cursor: pointer;
}

.stats-status {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 0.875rem;
	font-weight: 500;
}

.stats-status.pending {
	color: var(--c-warning);
}

.stats-status.done {
	color: var(--c-success);
}

.stats-link {
	font-size: 0.8125rem;
	color: var(--c-primary);
	font-weight: 500;
	background: none;
	border: none;
	cursor: pointer;
	padding: 0;
}

.stats-grid {
	display: flex;
	gap: 0;
}

.stat-item {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	min-height: 58px;
	padding: 7px 4px;
	border-right: 1px solid var(--c-line);
	background: transparent;
}

.stat-item:last-child {
	border-right: 0;
}

.stat-item.featured {
	margin-right: 4px;
	border-right: 0;
	border-radius: 9px;
	background: var(--c-primary-light);
}

.stat-value {
	font-size: 1.25rem;
	font-weight: 700;
	color: var(--c-primary);
	line-height: 1.2;
	font-variant-numeric: tabular-nums;
}

.stat-value.danger {
	color: var(--c-danger);
}

.stat-label {
	margin-top: 2px;
	font-size: 0.6875rem;
	color: var(--c-text-3);
	font-weight: 500;
}

/* 文物点卡片 */
.site-card {
	background: var(--c-surface);
	border-radius: var(--r-card);
	padding: 16px;
	margin-bottom: 12px;
	box-shadow: var(--shadow-sm);
	border: 1px solid var(--c-line);
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
	width: 44px;
	height: 44px;
	border-radius: 10px;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	background: var(--c-fill);
}

.site-icon.success {
	background: var(--c-primary-light);
}

.site-icon.warning {
	background: var(--c-warning-bg);
}

.site-info {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.site-label {
	font-size: 0.6875rem;
	color: var(--c-text-3);
	font-weight: 500;
}

.site-name {
	font-size: 0.9375rem;
	font-weight: 600;
	color: var(--c-text);
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.site-address {
	font-size: 0.75rem;
	color: var(--c-text-3);
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.site-status {
	font-size: 0.8125rem;
	color: var(--c-text-2);
}

.site-distance {
	flex-shrink: 0;
}

.distance-value {
	font-size: 0.875rem;
	font-weight: 600;
	color: var(--c-primary);
}

.retry-btn {
	flex-shrink: 0;
	padding: 8px 16px;
	border: 1px solid var(--c-line);
	border-radius: 8px;
	background: var(--c-surface);
	font-size: 0.8125rem;
	font-weight: 500;
	color: var(--c-primary);
	cursor: pointer;
	transition: all 150ms ease;
}

.retry-btn:active {
	background: var(--c-fill);
	transform: scale(0.97);
}

/* 区块标题 */
.section-header {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	margin: 14px 4px 8px;
}

.section-title {
	margin: 0;
	font-size: 1.0625rem;
	font-weight: 600;
	color: var(--c-text);
}

.section-summary {
	font-size: 0.75rem;
	color: var(--c-text-3);
	font-weight: 400;
}

.section-link {
	font-size: 0.8125rem;
	color: var(--c-primary);
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
	gap: 10px;
}

.admin-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6px;
	padding: 14px 8px;
	border: 1px solid var(--c-line);
	border-radius: var(--r-card);
	background: var(--c-surface);
	box-shadow: var(--shadow-sm);
	cursor: pointer;
	transition: all 150ms ease;
}

.admin-item:active {
	transform: scale(0.97);
	box-shadow: 0 1px 3px rgba(var(--c-primary-rgb), 0.06);
}

.admin-icon {
	width: 44px;
	height: 44px;
	border-radius: 11px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--c-primary-light);
}

.admin-name {
	font-size: 0.75rem;
	font-weight: 500;
	color: var(--c-text);
	text-align: center;
}

/* 最近巡查列表 */
.recent-list {
	background: var(--c-surface);
	border-radius: var(--r-card);
	box-shadow: var(--shadow-sm);
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
	border-bottom: 1px solid var(--c-line);
}

.recent-item:active {
	background: var(--c-fill);
}

.recent-status {
	width: 32px;
	height: 32px;
	border-radius: 8px;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.recent-status.ok {
	background: var(--c-success-bg);
}

.recent-status.bad {
	background: var(--c-danger-bg);
}

.recent-content {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.recent-name {
	font-size: 0.875rem;
	font-weight: 600;
	color: var(--c-text);
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.recent-time {
	font-size: 0.75rem;
	color: var(--c-text-3);
}

.recent-badge {
	flex-shrink: 0;
	padding: 3px 8px;
	border-radius: var(--r-badge);
	font-size: 0.6875rem;
	font-weight: 500;
}

.recent-badge.ok {
	background: var(--c-success-bg);
	color: var(--c-success);
}

.recent-badge.bad {
	background: var(--c-danger-bg);
	color: var(--c-danger);
}

/* 一屏显示：不滚动，空间不足时压缩 */
.home-content {
	display: flex;
	flex-direction: column;
	overflow: hidden;
}
.home-content :deep(.van-pull-refresh),
.home-content :deep(.van-pull-refresh__track) {
	height: 100%;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}
.home-header {
	flex-shrink: 0;
	padding: 8px 16px 12px;
	padding-top: calc(env(safe-area-inset-top) + 8px);
}
.header-kicker { margin-bottom: 3px; }
.header-date { margin-top: 2px; }
.home-body {
	flex: 1;
	min-height: 0;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 10px 14px 8px;
}
.home-body > * { flex-shrink: 0; margin-top: 0; margin-bottom: 0; }
.primary-action { padding: 10px 14px; gap: 12px; }
.primary-action-sub { display: none; }
.home-body .section-header { margin: 2px 0 0; }
.home-body .recent-list { flex-shrink: 1; min-height: 0; overflow: hidden; }
.home-body .recent-item { padding-top: 6px; padding-bottom: 6px; }
.home-body .admin-grid { gap: 6px; }
.home-body .admin-item { padding-top: 6px; padding-bottom: 6px; }
.home-body .site-address { display: none; }
.home-body .stats-card { padding: 10px 14px; }
.home-body .stats-header { padding-bottom: 8px; margin-bottom: 8px; }
.home-body .site-card { padding: 10px 14px; }
.home-body .admin-icon { width: 34px; height: 34px; border-radius: 9px; }
@media (max-height: 800px) {
	.home-body .admin-name { font-size: 0.6875rem; }
	.home-body .recent-head,
	.home-body .recent-list { display: none; }
}
@media (max-height: 640px) {
	.home-body .stats-header { display: none; }
	.home-body .admin-icon { display: none; }
}
</style>
