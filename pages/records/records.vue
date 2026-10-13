<template>
	<view class="u-page has-tabbar">
		<AppHeader title="巡查记录" :subtitle="`共 ${records.length >= 100 ? '最近 100' : records.length} 条记录`" />

		<view class="filter-bar">
			<view
				v-for="item in filters"
				:key="item.key"
				class="filter"
				:class="[item.key, { active: filter === item.key }]"
				@click="filter = item.key"
			>
				<text>{{ item.name }}</text>
				<text class="filter-count">{{ counts[item.key] }}</text>
			</view>
		</view>

		<view class="u-body">
			<view v-if="loading && !records.length" class="u-empty">
				<AppIcon name="clock" :size="88" color="#94A3B8" />
				<text>正在加载…</text>
			</view>

			<view v-else-if="loadError && !records.length" class="u-card u-empty">
				<AppIcon name="alert" :size="88" color="#B45309" />
				<text>加载失败，请检查网络</text>
				<button class="u-btn sm" @click="load">重新加载</button>
			</view>

			<view v-else-if="!visible.length" class="u-card u-empty">
				<AppIcon name="records" :size="96" color="#94A3B8" />
				<text>{{ records.length ? '没有符合条件的记录' : '还没有巡查记录' }}</text>
				<button v-if="!records.length" class="u-btn primary" @click="goPatrol">
					<AppIcon name="camera" :size="44" color="#FFFFFF" />
					<text>去巡查上报</text>
				</button>
			</view>

			<view v-for="group in groups" :key="group.day" class="group">
				<text class="group-title">{{ group.label }}</text>
				<view v-for="item in group.items" :key="item.id" class="record u-card" :class="item.is_normal ? 'ok' : 'bad'">
					<view class="record-top">
						<view class="record-main">
							<text class="record-name">{{ item.site_name || '未知文物点' }}</text>
							<view class="record-time">
								<AppIcon name="clock" :size="30" color="#64748B" />
								<text>{{ timeOf(item.inspect_time) }}</text>
							</view>
						</view>
						<text class="u-badge big" :class="item.is_normal ? 'ok' : 'bad'">{{ item.is_normal ? '正常' : '有问题' }}</text>
					</view>
					<view v-if="!item.is_normal && item.issue_details" class="issue">
						<AppIcon name="alert" :size="36" color="#C62828" />
						<text>{{ item.issue_details }}</text>
					</view>
					<image
						v-if="item.photo_url"
						class="photo"
						:src="item.photo_url"
						mode="aspectFill"
						lazy-load
						@click="preview(item.photo_url)"
					/>
					<view v-if="item.latitude != null && item.longitude != null" class="coord">
						<AppIcon name="pin" :size="30" color="#94A3B8" />
						<text>{{ coord(item.longitude) }}, {{ coord(item.latitude) }}</text>
					</view>
				</view>
			</view>
		</view>

		<BottomNav current="records" />
	</view>
</template>

<script>
	import AppHeader from '../../components/AppHeader.vue';
	import AppIcon from '../../components/AppIcon.vue';
	import BottomNav from '../../components/BottomNav.vue';
	import { getToken } from '../../common/js/auth.js';
	import { apiRequest } from '../../common/js/request.js';
	import { friendlyTime, todayKey } from '../../common/js/format.js';

	export default {
		components: { AppHeader, AppIcon, BottomNav },
		data() {
			return {
				loading: false,
				loadError: false,
				records: [],
				filter: 'all',
				filters: [
					{ key: 'all', name: '全部' },
					{ key: 'ok', name: '正常' },
					{ key: 'bad', name: '有问题' },
				],
			};
		},
		computed: {
			counts() {
				const bad = this.records.filter((r) => !r.is_normal).length;
				return { all: this.records.length, ok: this.records.length - bad, bad };
			},
			visible() {
				if (this.filter === 'ok') return this.records.filter((r) => r.is_normal);
				if (this.filter === 'bad') return this.records.filter((r) => !r.is_normal);
				return this.records;
			},
			groups() {
				const map = {};
				const order = [];
				this.visible.forEach((item) => {
					const day = String(item.inspect_time || '').slice(0, 10) || '未知日期';
					if (!map[day]) {
						map[day] = [];
						order.push(day);
					}
					map[day].push(item);
				});
				return order.map((day) => ({ day, label: this.dayLabel(day), items: map[day] }));
			},
		},
		onLoad() {
			if (!getToken()) {
				uni.reLaunch({ url: '/pages/index/index' });
				return;
			}
			this.load();
		},
		onPullDownRefresh() {
			this.load().finally(() => uni.stopPullDownRefresh());
		},
		methods: {
			load() {
				this.loading = true;
				this.loadError = false;
				return apiRequest({ url: '/api/inspections/mine' })
					.then((res) => {
						if (res.statusCode === 200 && res.data) {
							this.records = res.data.items || [];
						} else {
							this.loadError = true;
						}
					})
					.catch(() => {
						this.loadError = true;
						uni.showToast({ title: '加载失败，请检查网络', icon: 'none' });
					})
					.finally(() => {
						this.loading = false;
					});
			},
			dayLabel(day) {
				if (day === todayKey()) return '今天';
				const label = friendlyTime(`${day} 00:00`);
				return label.replace(/\s*00:00$/, '');
			},
			timeOf(value) {
				return String(value || '').slice(11, 16) || '-';
			},
			coord(value) {
				if (value === null || value === undefined || value === '') return '-';
				return Number(value).toFixed(5);
			},
			preview(url) {
				const urls = this.visible.map((r) => r.photo_url).filter(Boolean);
				uni.previewImage({ urls, current: url });
			},
			goPatrol() {
				uni.reLaunch({ url: '/pages/patrol/patrol' });
			},
		},
	};
</script>

<style>
	.filter-bar {
		display: flex;
		gap: 16rpx;
		padding: 28rpx;
		position: sticky;
		top: 0;
		z-index: 5;
		background: #F1F4F9;
	}

	.filter {
		flex: 1;
		height: 96rpx;
		border-radius: 24rpx;
		background: #FFFFFF;
		border: 3rpx solid #E2E8F0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10rpx;
		font-size: 34rpx;
		font-weight: 700;
		color: #334155;
	}

	.filter-count {
		min-width: 44rpx;
		padding: 2rpx 12rpx;
		border-radius: 999rpx;
		background: #EEF2F7;
		font-size: 26rpx;
		text-align: center;
		box-sizing: border-box;
	}

	.filter.active {
		color: #FFFFFF;
		background: #1E5AA8;
		border-color: #1E5AA8;
	}

	.filter.ok.active {
		background: #15803D;
		border-color: #15803D;
	}

	.filter.bad.active {
		background: #C62828;
		border-color: #C62828;
	}

	.filter.active .filter-count {
		background: rgba(255, 255, 255, 0.25);
	}

	.group-title {
		display: block;
		margin: 8rpx 4rpx 18rpx;
		font-size: 34rpx;
		font-weight: 800;
		color: #334155;
	}

	.record {
		border-left: 12rpx solid #15803D;
	}

	.record.bad {
		border-left-color: #C62828;
	}

	.record-top {
		display: flex;
		align-items: flex-start;
		gap: 16rpx;
	}

	.record-main {
		flex: 1;
		min-width: 0;
	}

	.record-name {
		display: block;
		font-size: 38rpx;
		font-weight: 800;
		color: #0F172A;
		line-height: 1.3;
	}

	.record-time {
		display: flex;
		align-items: center;
		gap: 8rpx;
		margin-top: 8rpx;
		font-size: 30rpx;
		color: #64748B;
	}

	.u-badge.big {
		font-size: 30rpx;
		padding: 12rpx 24rpx;
	}

	.issue {
		display: flex;
		gap: 12rpx;
		margin-top: 20rpx;
		padding: 20rpx 22rpx;
		border-radius: 18rpx;
		background: #FDECEC;
		color: #9B1C1C;
		font-size: 30rpx;
		line-height: 1.5;
	}

	.photo {
		width: 100%;
		height: 380rpx;
		margin-top: 20rpx;
		border-radius: 20rpx;
		background: #E2E8F0;
	}

	.coord {
		display: flex;
		align-items: center;
		gap: 8rpx;
		margin-top: 16rpx;
		font-size: 26rpx;
		color: #94A3B8;
	}
</style>
