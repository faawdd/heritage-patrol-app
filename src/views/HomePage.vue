<template>
	<ion-page>
		<ion-content :fullscreen="true">
			<ion-refresher slot="fixed" @ionRefresh="onRefresh($event)">
				<ion-refresher-content />
			</ion-refresher>
			<div class="u-page">
				<AppHeader :title="`${greet}，${displayName}`" :subtitle="today" tall>
					<template #right>
						<div class="role-chip">{{ roleText }}</div>
					</template>
				</AppHeader>

				<div class="u-body overlap">
					<!-- 主操作 -->
					<div class="cta u-fade-in" @click="goPatrol">
						<div class="cta-icon">
							<AppIcon name="camera" :size="72" color="#1E5AA8" :stroke="2" />
						</div>
						<div class="cta-text">
							<span class="cta-title">开始巡查上报</span>
							<span class="cta-sub">拍照 · 选择情况 · 一键上报</span>
						</div>
						<AppIcon name="chevron-right" :size="52" color="#FFFFFF" :stroke="2.6" />
					</div>

					<!-- 今日状态 -->
					<div class="today-card u-card" :class="todayCount ? 'done' : 'todo'">
						<AppIcon :name="todayCount ? 'check-circle' : 'clock'" :size="64" :color="todayCount ? '#15803D' : '#B45309'" />
						<div class="today-text">
							<span class="today-title">{{ todayCount ? `今天已巡查 ${todayCount} 次` : '今天还没有巡查' }}</span>
							<span class="today-sub">{{ todayCount ? '辛苦了，感谢您守护文物！' : '请到文物点现场拍照上报' }}</span>
						</div>
					</div>

					<!-- 附近文物点 -->
					<div class="u-section-title">
						<span>离我最近的文物点</span>
						<span class="u-link" @click="locate">刷新</span>
					</div>
					<div class="u-card site-card">
						<div v-if="siteState === 'loading'" class="site-loading">
							<AppIcon name="locate" :size="56" color="#94A3B8" />
							<span>正在定位，请稍候…</span>
						</div>
						<div v-else-if="siteState === 'ok'" class="site-body">
							<div class="site-icon">
								<AppIcon name="landmark" :size="60" color="#1E5AA8" />
							</div>
							<div class="site-info">
								<span class="site-name">{{ nearestSite.name }}</span>
								<span class="site-addr">{{ nearestSite.address || '暂无地址' }}</span>
								<div class="site-dist">
									<AppIcon name="pin" :size="32" color="#D99A1E" />
									<span>距离约 {{ distanceText }}</span>
								</div>
							</div>
						</div>
						<div v-else class="site-loading">
							<AppIcon name="alert" :size="56" color="#B45309" />
							<span>{{ siteError }}</span>
							<button type="button" class="u-btn sm" @click="locate">重新定位</button>
						</div>
					</div>

					<!-- 我的巡查统计 -->
					<div class="u-section-title">
						<span>我的巡查</span>
						<span class="u-link" @click="goRecords">全部记录</span>
					</div>
					<div class="stats">
						<div class="stat">
							<span class="stat-num">{{ todayCount }}</span>
							<span class="stat-label">今天</span>
						</div>
						<div class="stat">
							<span class="stat-num">{{ monthCount }}</span>
							<span class="stat-label">本月</span>
						</div>
						<div class="stat">
							<span class="stat-num">{{ totalLabel }}</span>
							<span class="stat-label">累计</span>
						</div>
						<div class="stat">
							<span class="stat-num danger">{{ problemCount }}</span>
							<span class="stat-label">发现问题</span>
						</div>
					</div>

					<div v-if="recent.length" class="u-card recent">
						<div v-for="item in recent" :key="item.id" class="recent-item" @click="goRecords">
							<div class="dot" :class="item.is_normal ? 'ok' : 'bad'" />
							<div class="recent-main">
								<span class="recent-name">{{ item.site_name }}</span>
								<span class="recent-time">{{ friendly(item.inspect_time) }}</span>
							</div>
							<span class="u-badge" :class="item.is_normal ? 'ok' : 'bad'">{{ item.is_normal ? '正常' : '有问题' }}</span>
						</div>
					</div>

					<!-- 管理员功能 -->
					<template v-if="isAdmin">
						<div class="u-section-title"><span>管理工作台</span></div>
						<div class="admin-stats u-card">
							<div class="admin-stat">
								<span class="stat-num">{{ adminStats.totalSites }}</span>
								<span class="stat-label">文物点总数</span>
							</div>
							<div class="divider" />
							<div class="admin-stat">
								<span class="stat-num">{{ adminStats.pendingProjects }}</span>
								<span class="stat-label">进行中项目</span>
							</div>
						</div>
						<div class="grid">
							<div v-for="item in adminFeatures" :key="item.key" class="grid-item" @click="open(item.url)">
								<div class="grid-icon" :style="{ background: item.bg }">
									<AppIcon :name="item.icon" :size="56" :color="item.color" />
								</div>
								<span class="grid-text">{{ item.name }}</span>
							</div>
						</div>
					</template>
				</div>
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
	import { apiRequest } from '@/lib/request.js';
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
							this.siteError = '附近没有找到文物点';
						}
					})
					.catch((err) => {
						this.siteState = 'error';
						this.siteError = err && err.errMsg && /location|定位|auth/i.test(err.errMsg)
							? '定位失败，请打开手机定位(GPS)'
							: '定位失败，请检查定位和网络';
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
	.role-chip {
		padding: 5px 11px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.18);
		border: 1px solid rgba(255, 255, 255, 0.35);
		font-size: 13px;
		font-weight: 700;
		color: #FFFFFF;
		white-space: nowrap;
	}

	.overlap {
		margin-top: -48px;
		position: relative;
		z-index: 2;
	}

	.cta {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 18px 16px;
		margin-bottom: 14px;
		border-radius: 16px;
		background: linear-gradient(120deg, #D99A1E 0%, #E8AE34 100%);
		box-shadow: 0 8px 18px rgba(217, 154, 30, 0.38);
	}

	.cta:active {
		transform: scale(0.98);
	}

	.cta-icon {
		width: 60px;
		height: 60px;
		border-radius: 15px;
		background: #FFFFFF;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.cta-text {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.cta-title {
		font-size: 23px;
		font-weight: 800;
		color: #FFFFFF;
		letter-spacing: 1px;
	}

	.cta-sub {
		margin-top: 3px;
		font-size: 14px;
		color: rgba(255, 255, 255, 0.92);
	}

	.today-card {
		display: flex;
		align-items: center;
		gap: 12px;
		border-left: 6px solid #B45309;
	}

	.today-card.done {
		border-left-color: #15803D;
	}

	.today-text {
		display: flex;
		flex-direction: column;
	}

	.today-title {
		font-size: 18px;
		font-weight: 800;
		color: #0F172A;
	}

	.today-sub {
		font-size: 14px;
		color: #64748B;
		margin-top: 2px;
	}

	.site-loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 8px 0;
		font-size: 16px;
		color: #475569;
	}

	.site-body {
		display: flex;
		gap: 12px;
	}

	.site-icon {
		width: 52px;
		height: 52px;
		border-radius: 13px;
		background: #E8F0FB;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.site-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.site-name {
		font-size: 19px;
		font-weight: 800;
		color: #0F172A;
	}

	.site-addr {
		margin-top: 3px;
		font-size: 14px;
		color: #64748B;
	}

	.site-dist {
		margin-top: 6px;
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 15px;
		font-weight: 700;
		color: #B45309;
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 8px;
		margin-bottom: 14px;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 14px 0;
		border-radius: 12px;
		background: #FFFFFF;
		box-shadow: 0 4px 14px rgba(15, 47, 92, 0.06);
	}

	.stat-num {
		font-size: 24px;
		font-weight: 800;
		color: #1E5AA8;
		line-height: 1.2;
	}

	.stat-num.danger {
		color: #C62828;
	}

	.stat-label {
		margin-top: 3px;
		font-size: 14px;
		color: #475569;
	}

	.recent {
		padding-top: 6px;
		padding-bottom: 6px;
	}

	.recent-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 0;
		border-bottom: 1px solid #EEF2F7;
	}

	.recent-item:last-child {
		border-bottom: none;
	}

	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.dot.ok {
		background: #15803D;
	}

	.dot.bad {
		background: #C62828;
	}

	.recent-main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.recent-name {
		font-size: 17px;
		font-weight: 700;
		color: #0F172A;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.recent-time {
		font-size: 14px;
		color: #64748B;
	}

	.admin-stats {
		display: flex;
		align-items: center;
	}

	.admin-stat {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.divider {
		width: 1px;
		height: 40px;
		background: #E2E8F0;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
		margin-bottom: 14px;
	}

	.grid-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 7px;
		padding: 14px 4px;
		border-radius: 12px;
		background: #FFFFFF;
		box-shadow: 0 4px 14px rgba(15, 47, 92, 0.06);
	}

	.grid-item:active {
		transform: scale(0.97);
	}

	.grid-icon {
		width: 52px;
		height: 52px;
		border-radius: 14px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.grid-text {
		font-size: 15px;
		font-weight: 700;
		color: #0F172A;
	}
</style>
