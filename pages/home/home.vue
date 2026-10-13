<template>
	<view class="u-page has-tabbar">
		<AppHeader :title="`${greet}，${displayName}`" :subtitle="today" tall>
			<template #right>
				<view class="role-chip">{{ roleText }}</view>
			</template>
		</AppHeader>

		<view class="u-body overlap">
			<!-- 主操作 -->
			<view class="cta u-fade-in" @click="goPatrol">
				<view class="cta-icon">
					<AppIcon name="camera" :size="72" color="#1E5AA8" :stroke="2" />
				</view>
				<view class="cta-text">
					<text class="cta-title">开始巡查上报</text>
					<text class="cta-sub">拍照 · 选择情况 · 一键上报</text>
				</view>
				<AppIcon name="chevron-right" :size="52" color="#FFFFFF" :stroke="2.6" />
			</view>

			<!-- 今日状态 -->
			<view class="today-card u-card" :class="todayCount ? 'done' : 'todo'">
				<AppIcon :name="todayCount ? 'check-circle' : 'clock'" :size="64" :color="todayCount ? '#15803D' : '#B45309'" />
				<view class="today-text">
					<text class="today-title">{{ todayCount ? `今天已巡查 ${todayCount} 次` : '今天还没有巡查' }}</text>
					<text class="today-sub">{{ todayCount ? '辛苦了，感谢您守护文物！' : '请到文物点现场拍照上报' }}</text>
				</view>
			</view>

			<!-- 附近文物点 -->
			<view class="u-section-title">
				<text>离我最近的文物点</text>
				<text class="u-link" @click="locate">刷新</text>
			</view>
			<view class="u-card site-card">
				<view v-if="siteState === 'loading'" class="site-loading">
					<AppIcon name="locate" :size="56" color="#94A3B8" />
					<text>正在定位，请稍候…</text>
				</view>
				<view v-else-if="siteState === 'ok'" class="site-body">
					<view class="site-icon">
						<AppIcon name="landmark" :size="60" color="#1E5AA8" />
					</view>
					<view class="site-info">
						<text class="site-name">{{ nearestSite.name }}</text>
						<text class="site-addr">{{ nearestSite.address || '暂无地址' }}</text>
						<view class="site-dist">
							<AppIcon name="pin" :size="32" color="#D99A1E" />
							<text>距离约 {{ distanceText }}</text>
						</view>
					</view>
				</view>
				<view v-else class="site-loading">
					<AppIcon name="alert" :size="56" color="#B45309" />
					<text>{{ siteError }}</text>
					<button class="u-btn sm" @click="locate">重新定位</button>
				</view>
			</view>

			<!-- 我的巡查统计 -->
			<view class="u-section-title">
				<text>我的巡查</text>
				<text class="u-link" @click="goRecords">全部记录</text>
			</view>
			<view class="stats">
				<view class="stat">
					<text class="stat-num">{{ todayCount }}</text>
					<text class="stat-label">今天</text>
				</view>
				<view class="stat">
					<text class="stat-num">{{ monthCount }}</text>
					<text class="stat-label">本月</text>
				</view>
				<view class="stat">
					<text class="stat-num">{{ totalLabel }}</text>
					<text class="stat-label">累计</text>
				</view>
				<view class="stat">
					<text class="stat-num danger">{{ problemCount }}</text>
					<text class="stat-label">发现问题</text>
				</view>
			</view>

			<view v-if="recent.length" class="u-card recent">
				<view v-for="item in recent" :key="item.id" class="recent-item" @click="goRecords">
					<view class="dot" :class="item.is_normal ? 'ok' : 'bad'" />
					<view class="recent-main">
						<text class="recent-name">{{ item.site_name }}</text>
						<text class="recent-time">{{ friendly(item.inspect_time) }}</text>
					</view>
					<text class="u-badge" :class="item.is_normal ? 'ok' : 'bad'">{{ item.is_normal ? '正常' : '有问题' }}</text>
				</view>
			</view>

			<!-- 管理员功能 -->
			<template v-if="isAdmin">
				<view class="u-section-title"><text>管理工作台</text></view>
				<view class="admin-stats u-card">
					<view class="admin-stat">
						<text class="stat-num">{{ adminStats.totalSites }}</text>
						<text class="stat-label">文物点总数</text>
					</view>
					<view class="divider" />
					<view class="admin-stat">
						<text class="stat-num">{{ adminStats.pendingProjects }}</text>
						<text class="stat-label">进行中项目</text>
					</view>
				</view>
				<view class="grid">
					<view v-for="item in adminFeatures" :key="item.key" class="grid-item" @click="open(item.url)">
						<view class="grid-icon" :style="{ background: item.bg }">
							<AppIcon :name="item.icon" :size="56" :color="item.color" />
						</view>
						<text class="grid-text">{{ item.name }}</text>
					</view>
				</view>
			</template>
		</view>

		<BottomNav current="home" :userInfo="user" />
	</view>
</template>

<script>
	import AppHeader from '../../components/AppHeader.vue';
	import AppIcon from '../../components/AppIcon.vue';
	import BottomNav from '../../components/BottomNav.vue';
	import { getToken, getUser, isAdminUser, setUser } from '../../common/js/auth.js';
	import { getRoleLabel } from '../../common/js/i18n.js';
	import { apiRequest } from '../../common/js/request.js';
	import { dateLabel, formatDistance, friendlyTime, getLocation, greeting, monthKey, todayKey } from '../../common/js/format.js';

	const ADMIN_FEATURES = [
		{ key: 'heritages', name: '文物点管理', icon: 'landmark', url: '/pages/admin/admin', color: '#1E5AA8', bg: '#E8F0FB' },
		{ key: 'projects', name: '建设项目', icon: 'file', url: '/pages/admin/admin?tab=projects', color: '#B45309', bg: '#FEF3E2' },
		{ key: 'collect', name: '现场采集', icon: 'map', url: '/pages/collect/collect', color: '#15803D', bg: '#E7F6EC' },
		{ key: 'collectRecords', name: '采集记录', icon: 'records', url: '/pages/collect/my_records', color: '#7C3AED', bg: '#F1EAFE' },
		{ key: 'kml', name: 'KML 检查', icon: 'grid', url: '/pages/kml/kml', color: '#0E7490', bg: '#E0F4F8' },
		{ key: 'tools', name: '管理工具', icon: 'chart', url: '/pages/admin/admin?tab=tools', color: '#C62828', bg: '#FDECEC' },
	];

	export default {
		components: { AppHeader, AppIcon, BottomNav },
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
		onLoad() {
			if (!getToken()) {
				uni.reLaunch({ url: '/pages/index/index' });
				return;
			}
			this.user = getUser() || {};
			this.refresh();
		},
		onPullDownRefresh() {
			this.greet = greeting();
			this.today = dateLabel();
			this.refresh().finally(() => uni.stopPullDownRefresh());
		},
		methods: {
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
				uni.reLaunch({ url: '/pages/patrol/patrol' });
			},
			goRecords() {
				uni.reLaunch({ url: '/pages/records/records' });
			},
			open(url) {
				if (url.indexOf('/pages/admin/admin') === 0) {
					uni.reLaunch({ url });
					return;
				}
				uni.navigateTo({ url });
			},
		},
	};
</script>

<style>
	.role-chip {
		padding: 10rpx 22rpx;
		border-radius: 999rpx;
		background: rgba(255, 255, 255, 0.18);
		border: 2rpx solid rgba(255, 255, 255, 0.35);
		font-size: 26rpx;
		font-weight: 700;
		color: #FFFFFF;
		white-space: nowrap;
	}

	.overlap {
		margin-top: -96rpx;
		position: relative;
		z-index: 2;
	}

	.cta {
		display: flex;
		align-items: center;
		gap: 24rpx;
		padding: 36rpx 32rpx;
		margin-bottom: 28rpx;
		border-radius: 32rpx;
		background: linear-gradient(120deg, #D99A1E 0%, #E8AE34 100%);
		box-shadow: 0 16rpx 36rpx rgba(217, 154, 30, 0.38);
	}

	.cta:active {
		transform: scale(0.98);
	}

	.cta-icon {
		width: 120rpx;
		height: 120rpx;
		border-radius: 30rpx;
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
		font-size: 46rpx;
		font-weight: 800;
		color: #FFFFFF;
		letter-spacing: 2rpx;
	}

	.cta-sub {
		margin-top: 6rpx;
		font-size: 28rpx;
		color: rgba(255, 255, 255, 0.92);
	}

	.today-card {
		display: flex;
		align-items: center;
		gap: 24rpx;
		border-left: 12rpx solid #B45309;
	}

	.today-card.done {
		border-left-color: #15803D;
	}

	.today-text {
		display: flex;
		flex-direction: column;
	}

	.today-title {
		font-size: 36rpx;
		font-weight: 800;
		color: #0F172A;
	}

	.today-sub {
		font-size: 28rpx;
		color: #64748B;
		margin-top: 4rpx;
	}

	.site-loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16rpx;
		padding: 16rpx 0;
		font-size: 32rpx;
		color: #475569;
	}

	.site-body {
		display: flex;
		gap: 24rpx;
	}

	.site-icon {
		width: 104rpx;
		height: 104rpx;
		border-radius: 26rpx;
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
		font-size: 38rpx;
		font-weight: 800;
		color: #0F172A;
	}

	.site-addr {
		margin-top: 6rpx;
		font-size: 28rpx;
		color: #64748B;
	}

	.site-dist {
		margin-top: 12rpx;
		display: flex;
		align-items: center;
		gap: 8rpx;
		font-size: 30rpx;
		font-weight: 700;
		color: #B45309;
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16rpx;
		margin-bottom: 28rpx;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 28rpx 0;
		border-radius: 24rpx;
		background: #FFFFFF;
		box-shadow: 0 8rpx 28rpx rgba(15, 47, 92, 0.06);
	}

	.stat-num {
		font-size: 48rpx;
		font-weight: 800;
		color: #1E5AA8;
		line-height: 1.2;
	}

	.stat-num.danger {
		color: #C62828;
	}

	.stat-label {
		margin-top: 6rpx;
		font-size: 28rpx;
		color: #475569;
	}

	.recent {
		padding-top: 12rpx;
		padding-bottom: 12rpx;
	}

	.recent-item {
		display: flex;
		align-items: center;
		gap: 20rpx;
		padding: 24rpx 0;
		border-bottom: 2rpx solid #EEF2F7;
	}

	.recent-item:last-child {
		border-bottom: none;
	}

	.dot {
		width: 20rpx;
		height: 20rpx;
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
		font-size: 34rpx;
		font-weight: 700;
		color: #0F172A;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.recent-time {
		font-size: 28rpx;
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
		width: 2rpx;
		height: 80rpx;
		background: #E2E8F0;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 20rpx;
		margin-bottom: 28rpx;
	}

	.grid-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14rpx;
		padding: 28rpx 8rpx;
		border-radius: 24rpx;
		background: #FFFFFF;
		box-shadow: 0 8rpx 28rpx rgba(15, 47, 92, 0.06);
	}

	.grid-item:active {
		transform: scale(0.97);
	}

	.grid-icon {
		width: 104rpx;
		height: 104rpx;
		border-radius: 28rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.grid-text {
		font-size: 30rpx;
		font-weight: 700;
		color: #0F172A;
	}
</style>
