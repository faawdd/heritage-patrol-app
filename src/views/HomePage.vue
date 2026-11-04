<template>
	<div class="app-page">
		<!-- 固定头部 -->
		<div class="home-header relative isolate shrink-0 overflow-hidden px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0 flex-1">
					<span class="mb-0.5 block text-[0.6875rem] font-semibold tracking-[0.12em] text-on-hero/75">基层文物巡查 · 野外作业终端</span>
					<h1 class="m-0 truncate text-[1.3125rem] font-bold leading-tight text-on-hero">{{ greet }}，{{ displayName }}</h1>
					<p class="mt-0.5 text-[0.8125rem] font-normal text-on-hero/85">{{ today }}</p>
				</div>
				<van-tag type="primary" size="large" class="shrink-0 !bg-on-hero/15 !text-on-hero">{{ roleText }}</van-tag>
			</div>
		</div>

		<div class="app-content home-content flex flex-col overflow-hidden bg-page">
			<van-pull-refresh v-model="refreshing" @refresh="onRefresh">
				<div class="home-body flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3">
					<van-button type="primary" size="large" block native-type="button" class="home-primary" @click="goPatrol">
						<AppIcon name="camera" :size="48" color="currentColor" />
						<span class="ml-2 text-lg font-semibold">开始巡查</span>
					</van-button>

					<van-cell-group inset class="!m-0">
						<van-cell class="stats-header" is-link :title="todayCount ? `今日已巡查 ${todayCount} 次` : '今日待巡查'" value="查看记录" @click="goRecords">
							<template #icon>
								<AppIcon :name="todayCount ? 'check-circle' : 'clock'" :size="32" :color="todayCount ? 'var(--c-success)' : 'var(--c-warning)'" class="mr-2 self-center" />
							</template>
						</van-cell>
						<van-grid :column-num="problemCount > 0 ? 4 : 3" :border="false" clickable>
							<van-grid-item>
								<span class="text-xl font-extrabold leading-tight tabular-nums text-primary">{{ todayCount }}</span>
								<span class="mt-0.5 text-[0.6875rem] font-medium text-ink-3">今天</span>
							</van-grid-item>
							<van-grid-item>
								<span class="text-xl font-extrabold leading-tight tabular-nums text-primary">{{ monthCount }}</span>
								<span class="mt-0.5 text-[0.6875rem] font-medium text-ink-3">本月</span>
							</van-grid-item>
							<van-grid-item>
								<span class="text-xl font-extrabold leading-tight tabular-nums text-primary">{{ totalLabel }}</span>
								<span class="mt-0.5 text-[0.6875rem] font-medium text-ink-3">累计</span>
							</van-grid-item>
							<van-grid-item v-if="problemCount > 0">
								<span class="text-xl font-extrabold leading-tight tabular-nums text-danger">{{ problemCount }}</span>
								<span class="mt-0.5 text-[0.6875rem] font-medium text-ink-3">问题</span>
							</van-grid-item>
						</van-grid>
					</van-cell-group>

					<van-cell-group inset class="!m-0">
						<van-cell v-if="siteState === 'loading'" title="最近文物点" label="正在定位…" center>
							<template #icon><AppIcon name="locate" :size="36" color="var(--c-text-3)" class="mr-3" /></template>
						</van-cell>
						<van-cell v-else-if="siteState === 'ok'" :title="nearestSite.name" label="最近文物点" center is-link :value="distanceText" @click="goPatrol">
							<template #icon><AppIcon name="landmark" :size="36" color="var(--c-primary)" class="mr-3" /></template>
						</van-cell>
						<van-cell v-else title="最近文物点" :label="siteError" center>
							<template #icon><AppIcon name="alert" :size="36" color="var(--c-warning)" class="mr-3" /></template>
							<template #right-icon>
								<van-button type="primary" plain size="small" native-type="button" @click="locate">重试</van-button>
							</template>
						</van-cell>
					</van-cell-group>

					<template v-if="isAdmin">
						<van-cell-group inset class="admin-group !m-0">
							<van-cell title="管理工作台" :value="`${adminStats.totalSites} 文物点 · ${adminStats.pendingProjects} 在办项目`" />
							<van-grid :column-num="3" :border="false" clickable>
								<van-grid-item v-for="item in adminFeatures" :key="item.key" :text="item.name" @click="open(item.url)">
									<template #icon><AppIcon :name="item.icon" :size="40" color="var(--c-primary)" /></template>
								</van-grid-item>
							</van-grid>
						</van-cell-group>
					</template>

					<van-cell-group v-if="recent.length" inset title="最近巡查" class="recent-list !m-0">
						<van-cell
							v-for="item in recent.slice(0, 2)"
							:key="item.id"
							center
							is-link
							:title="item.site_name"
							:label="friendly(item.inspect_time)"
							@click="goRecords"
						>
							<template #icon>
								<AppIcon :name="item.is_normal ? 'check-circle' : 'alert'" :size="32" :color="item.is_normal ? 'var(--c-success)' : 'var(--c-danger)'" class="mr-3" />
							</template>
							<template #value>
								<van-tag :type="item.is_normal ? 'success' : 'danger'" plain>{{ item.is_normal ? '正常' : '问题' }}</van-tag>
							</template>
						</van-cell>
					</van-cell-group>
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
.home-header {
	background-color: var(--c-primary);
}
.home-header::before {
	content: "";
	position: absolute;
	z-index: -1;
	inset: 0;
	background-image:
		linear-gradient(to right, rgb(255 255 255 / 14%) 1px, transparent 1px),
		linear-gradient(to bottom, rgb(255 255 255 / 14%) 1px, transparent 1px);
	background-size: 20px 20px;
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
	.home-body .recent-list { display: none; }
}
@media (max-height: 640px) {
	.home-body .stats-header,
	.home-body .admin-group { display: none; }
}
</style>
