<template>
	<div class="app-page">
		<div class="app-content home-content flex flex-col overflow-hidden bg-page">
			<van-pull-refresh v-model="refreshing" @refresh="onRefresh">
			
			<!-- 简洁头部 -->
			<div class="home-header relative isolate shrink-0 overflow-hidden border-b border-on-primary/15 bg-gradient-hero px-[1.125rem] pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0 flex-1">
						<span class="mb-[3px] block text-[0.6875rem] font-semibold tracking-[0.12em] text-on-hero/70">基层文物巡查 · 野外作业终端</span>
						<h1 class="m-0 truncate text-[1.3125rem] font-bold leading-tight text-on-hero">{{ greet }}，{{ displayName }}</h1>
						<p class="mt-0.5 text-[0.8125rem] font-normal text-on-hero/85">{{ today }}</p>
					</div>
					<div class="shrink-0 rounded-full border border-on-hero/25 bg-on-hero/15 px-3 py-1.5 text-xs font-medium text-on-hero">{{ roleText }}</div>
				</div>
			</div>

			<div class="home-body flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-3.5 py-2">
				<!-- 主操作按钮 - 最大最醒目 -->
				<van-button native-type="button" class="flex !h-auto min-h-[3.25rem] w-full items-center gap-3 rounded-2xl !border-0 bg-gradient-primary px-3.5 py-2.5 text-left text-on-primary shadow-card transition active:scale-[0.98]" @click="goPatrol">
					<div class="flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-[0.875rem] bg-on-primary/15">
						<AppIcon name="camera" :size="56" color="var(--c-on-primary)" :stroke="2" />
					</div>
					<div class="flex min-w-0 flex-1 flex-col gap-1">
						<span class="text-lg font-semibold tracking-[0.01875rem] text-on-primary">开始巡查</span>
						<span class="hidden text-[0.8125rem] font-normal text-on-primary/90">拍照上报文物点情况</span>
					</div>
					<AppIcon name="arrow-right" :size="32" color="var(--c-on-primary)" :stroke="2.5" />
				</van-button>

				<!-- 今日统计 - 简洁卡片 -->
				<div class="rounded-card border border-line bg-surface px-3.5 py-2.5 shadow-card">
					<div class="stats-header mb-2 flex min-h-11 cursor-pointer items-center justify-between border-b border-line pb-2" @click="goRecords">
						<div class="flex items-center gap-2 text-sm font-medium" :class="todayCount ? 'text-success' : 'text-warning'">
							<AppIcon :name="todayCount ? 'check-circle' : 'clock'" :size="28" :color="todayCount ? 'var(--c-success)' : 'var(--c-warning)'" />
							<span>{{ todayCount ? `今日已巡查 ${todayCount} 次` : '今日待巡查' }}</span>
						</div>
						<span class="bg-transparent p-0 text-[0.8125rem] font-medium text-primary">查看记录</span>
					</div>
					<div class="flex">
						<div class="flex min-h-[3.625rem] min-w-0 flex-1 flex-col items-center justify-center rounded-lg bg-primary-light px-1 py-[7px] dark:bg-primary/20 mr-1">
							<span class="text-xl font-extrabold leading-tight tabular-nums text-primary">{{ todayCount }}</span>
							<span class="mt-0.5 text-[0.6875rem] font-medium text-ink-3">今天</span>
						</div>
						<div class="flex min-h-[3.625rem] min-w-0 flex-1 flex-col items-center justify-center border-r border-line px-1 py-[7px]">
							<span class="text-xl font-extrabold leading-tight tabular-nums text-primary">{{ monthCount }}</span>
							<span class="mt-0.5 text-[0.6875rem] font-medium text-ink-3">本月</span>
						</div>
						<div class="flex min-h-[3.625rem] min-w-0 flex-1 flex-col items-center justify-center px-1 py-[7px]" :class="{ 'border-r border-line': problemCount > 0 }">
							<span class="text-xl font-extrabold leading-tight tabular-nums text-primary">{{ totalLabel }}</span>
							<span class="mt-0.5 text-[0.6875rem] font-medium text-ink-3">累计</span>
						</div>
						<div class="flex min-h-[3.625rem] min-w-0 flex-1 flex-col items-center justify-center px-1 py-[7px]" v-if="problemCount > 0">
							<span class="text-xl font-extrabold leading-tight tabular-nums text-danger">{{ problemCount }}</span>
							<span class="mt-0.5 text-[0.6875rem] font-medium text-ink-3">问题</span>
						</div>
					</div>
				</div>

				<!-- 附近文物点 -->
				<div class="rounded-card border border-line bg-surface px-3.5 py-2.5 shadow-card">
					<div v-if="siteState === 'loading'" class="flex items-center gap-3">
						<div class="site-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.625rem] bg-fill">
							<AppIcon name="locate" :size="36" color="var(--c-text-4)" />
						</div>
						<div class="flex min-w-0 flex-1 flex-col gap-0.5">
							<span class="text-[0.6875rem] font-medium text-ink-3">最近文物点</span>
							<span class="text-[0.8125rem] text-ink-2">正在定位…</span>
						</div>
					</div>
					<div v-else-if="siteState === 'ok'" class="flex cursor-pointer items-center gap-3" @click="goPatrol">
						<div class="site-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.625rem] bg-primary-light">
							<AppIcon name="landmark" :size="36" color="var(--c-primary)" />
						</div>
						<div class="flex min-w-0 flex-1 flex-col gap-0.5">
							<span class="text-[0.6875rem] font-medium text-ink-3">最近文物点</span>
							<span class="truncate text-[0.9375rem] font-semibold text-ink">{{ nearestSite.name }}</span>
							<span class="site-address hidden truncate text-xs text-ink-3">{{ nearestSite.address || '暂无地址' }}</span>
						</div>
						<div class="shrink-0">
							<span class="text-sm font-semibold text-primary">{{ distanceText }}</span>
						</div>
					</div>
					<div v-else class="flex items-center gap-3">
						<div class="site-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.625rem] bg-warning-bg">
							<AppIcon name="alert" :size="36" color="var(--c-warning)" />
						</div>
						<div class="flex min-w-0 flex-1 flex-col gap-0.5">
							<span class="text-[0.6875rem] font-medium text-ink-3">最近文物点</span>
							<span class="text-[0.8125rem] text-ink-2">{{ siteError }}</span>
						</div>
						<van-button native-type="button" class="min-h-11 shrink-0 rounded-lg border border-line bg-surface px-4 text-[0.8125rem] font-medium text-primary transition active:scale-[0.97] active:bg-fill" @click="locate">重试</van-button>
					</div>
				</div>

				<!-- 管理员功能 -->
				<template v-if="isAdmin">
					<div class="my-0.5 flex items-baseline justify-between">
						<h2 class="m-0 text-[1.0625rem] font-semibold text-ink">管理工作台</h2>
						<span class="text-xs font-normal text-ink-3">{{ adminStats.totalSites }} 文物点 · {{ adminStats.pendingProjects }} 在办项目</span>
					</div>
					<div class="grid grid-cols-3 gap-1.5">
						<van-button
							v-for="item in adminFeatures" 
							:key="item.key" 
							native-type="button"
							class="flex !h-auto flex-col items-center gap-1.5 rounded-card border border-line bg-surface px-2 py-1.5 shadow-card transition active:scale-[0.97]" 
							@click="open(item.url)"
						>
							<div class="admin-icon flex h-[2.125rem] w-[2.125rem] items-center justify-center rounded-[0.5625rem] bg-primary-light">
								<AppIcon :name="item.icon" :size="36" color="var(--c-primary)" :stroke="1.9" />
							</div>
							<span class="admin-name text-center text-xs font-medium text-ink">{{ item.name }}</span>
						</van-button>
					</div>
				</template>

				<!-- 最近巡查 -->
				<template v-if="recent.length">
					<div class="recent-head my-0.5 flex items-baseline justify-between">
						<h2 class="m-0 text-[1.0625rem] font-semibold text-ink">最近巡查</h2>
						<van-button native-type="button" class="!h-auto !border-0 !bg-transparent !p-0 text-[0.8125rem] font-medium text-primary" @click="goRecords">全部</van-button>
					</div>
					<div class="recent-list min-h-0 shrink overflow-hidden rounded-card bg-surface shadow-card">
						<van-button
							v-for="item in recent.slice(0, 2)" 
							:key="item.id" 
							native-type="button"
							class="flex !h-auto min-h-11 w-full items-center gap-3 !border-0 !border-b !border-line !bg-transparent !px-4 !py-1.5 text-left transition last:!border-b-0 active:!bg-fill" 
							@click="goRecords"
						>
							<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" :class="item.is_normal ? 'bg-success-bg' : 'bg-danger-bg'">
								<AppIcon :name="item.is_normal ? 'check-circle' : 'alert'" :size="24" :color="item.is_normal ? 'var(--c-success)' : 'var(--c-danger)'" />
							</div>
							<div class="flex min-w-0 flex-1 flex-col gap-0.5">
								<span class="truncate text-sm font-semibold text-ink">{{ item.site_name }}</span>
								<span class="text-xs text-ink-3">{{ friendly(item.inspect_time) }}</span>
							</div>
							<span class="shrink-0 rounded-full px-2 py-[3px] text-[0.6875rem] font-medium" :class="item.is_normal ? 'bg-success-bg' : 'bg-danger-bg'">{{ item.is_normal ? '正常' : '问题' }}</span>
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
@reference "../theme/tailwind.css";
.home-header::after {
	content: "";
	position: absolute;
	z-index: -1;
	width: 11.875rem;
	height: 11.875rem;
	right: -4.625rem;
	top: -5.625rem;
	border: 1px solid color-mix(in srgb, var(--c-on-hero) 12%, transparent);
	border-radius: 50%;
	box-shadow: 0 0 0 1.125rem color-mix(in srgb, var(--c-on-hero) 3.5%, transparent), 0 0 0 2.375rem color-mix(in srgb, var(--c-on-hero) 2.5%, transparent);
	pointer-events: none;
}
.home-content :deep(.van-pull-refresh),
.home-content :deep(.van-pull-refresh__track) {
	height: 100%;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}
@media (max-height: 800px) {
	.home-body .admin-name { font-size: 0.6875rem; }
	.home-body .recent-head,
	.home-body .recent-list { display: none; }
}
@media (max-height: 640px) {
	.home-body .stats-header,
	.home-body .admin-icon { display: none; }
}
</style>
