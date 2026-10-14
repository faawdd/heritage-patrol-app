<template>
	<div class="app-page">
		<div class="app-content">
			<van-pull-refresh v-model="refreshing" @refresh="onRefresh">
			<div class="u-page">
				<AppHeader title="巡查记录" :subtitle="`共 ${records.length >= 100 ? '最近 100' : records.length} 条记录`" />

				<div class="filter-bar">
					<div
						v-for="item in filters"
						:key="item.key"
						class="filter"
						:class="[item.key, { active: filter === item.key }]"
						@click="filter = item.key"
					>
						<span>{{ item.name }}</span>
						<span class="filter-count">{{ counts[item.key] }}</span>
					</div>
				</div>

				<div class="u-body">
					<div v-if="pending.length" class="u-card">
						<h3>待同步巡查（{{ pending.length }}）</h3>
						<p>照片已保存到本机，上传成功后才移除。不要清除应用数据或卸载。</p>
						<van-button class="u-btn primary block" :disabled="syncing" @click="syncPending">{{ syncing ? '正在同步…' : '立即同步 / 重试' }}</van-button>
						<div v-for="item in pending" :key="item.key">
							<p>{{ item.site_name }} · {{ new Date(item.inspect_time).toLocaleString() }} · {{ item.photos.length }} 张照片</p>
							<p v-if="item.error" style="color: #C62828">{{ item.error }}</p>
							<van-button class="u-btn sm" @click="previewPending(item)">查看本地照片</van-button>
						</div>
					</div>
					<p v-if="cached">正在显示本机缓存记录，联网后可刷新。</p>
					<div v-if="loading && !records.length" class="u-empty">
						<AppIcon name="clock" :size="88" color="#94A3B8" />
						<span>正在加载…</span>
					</div>

					<div v-else-if="loadError && !records.length" class="u-card u-empty">
						<AppIcon name="alert" :size="88" color="#B45309" />
						<span>加载失败，请检查网络</span>
						<van-button native-type="button" class="u-btn sm" @click="load">重新加载</van-button>
					</div>

					<div v-else-if="!visible.length" class="u-card u-empty">
						<AppIcon name="records" :size="96" color="#94A3B8" />
						<span>{{ records.length ? '没有符合条件的记录' : '还没有巡查记录' }}</span>
						<van-button v-if="!records.length" native-type="button" class="u-btn primary" @click="goPatrol">
							<AppIcon name="camera" :size="44" color="#FFFFFF" />
							<span>去巡查上报</span>
						</van-button>
					</div>

					<div v-for="group in groups" :key="group.day" class="group">
						<span class="group-title">{{ group.label }}</span>
						<div v-for="item in group.items" :key="item.id" class="record u-card" :class="item.is_normal ? 'ok' : 'bad'">
							<div class="record-top">
								<div class="record-main">
									<span class="record-name">{{ item.site_name || '未知文物点' }}</span>
									<div class="record-time">
										<AppIcon name="clock" :size="28" color="#64748B" />
										<span>{{ timeOf(item.inspect_time) }}</span>
										<template v-if="item.latitude != null && item.longitude != null">
											<AppIcon class="record-pin" name="pin" :size="28" color="#94A3B8" />
											<span class="record-coord">{{ coord(item.longitude) }}, {{ coord(item.latitude) }}</span>
										</template>
									</div>
								</div>
								<span class="u-badge big" :class="item.is_normal ? 'ok' : 'bad'">{{ item.is_normal ? '正常' : '有问题' }}</span>
							</div>
							<div v-if="!item.is_normal && item.issue_details" class="issue">
								<AppIcon name="alert" :size="36" color="#C62828" />
								<span>{{ item.issue_details }}</span>
							</div>
							<img
								v-if="item.photo_url"
								class="photo"
								:src="item.photo_url"
								loading="lazy"
								alt=""
								@click="preview(item)"
							/>
							<span v-if="item.photo_urls?.length > 1">共 {{ item.photo_urls.length }} 张（点击查看）</span>
						</div>
					</div>
				</div>
			</div>
		</van-pull-refresh>
		</div>
	</div>
</template>

<script>
	import AppHeader from '@/components/AppHeader.vue';
	import AppIcon from '@/components/AppIcon.vue';
	import { loadPatrolRecords, PATROL_CHANGED, pendingPatrols, syncPatrols } from '@/lib/patrol.js';
	import { friendlyTime, todayKey } from '@/lib/format.js';
	import { previewImage } from '@/lib/native.js';
	import { switchTab } from '@/lib/nav.js';
	import { toast } from '@/lib/ui.js';

	export default {
		components: { AppHeader, AppIcon, },
		data() {
			return {
				refreshing: false,
				loading: false,
				loadError: false,
				records: [],
				pending: [],
				syncing: false,
				cached: false,
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
		activated() {
			this.load();
		},
		mounted() {
			window.addEventListener(PATROL_CHANGED, this.loadPending);
		},
		beforeUnmount() {
			window.removeEventListener(PATROL_CHANGED, this.loadPending);
		},
		methods: {
			async loadPending() {
				try { this.pending = await pendingPatrols(); }
				catch (error) { toast(error.message || '本地记录读取失败'); }
			},
			async syncPending() {
				this.syncing = true;
				try {
					const result = await syncPatrols();
					toast(result.uploaded ? `已上传 ${result.uploaded} 条` : '没有上传成功的记录，请检查网络、登录状态或失败说明');
					await this.load();
				} catch (error) {
					toast(error.message || '同步失败');
				} finally { this.syncing = false; }
			},
			async previewPending(item) {
				const urls = item.photos.map(photo => URL.createObjectURL(photo));
				try {
					const preview = await previewImage(urls);
					await preview.closed;
				}
				finally {
					urls.forEach(url => URL.revokeObjectURL(url));
				}
			},
			onRefresh() {
				this.load().finally(() => { this.refreshing = false; });
			},
			load() {
				this.loadPending();
				this.loading = true;
				this.loadError = false;
				return loadPatrolRecords()
					.then((result) => {
						this.records = result.items;
						this.cached = !!result.cached;
					})
					.catch(() => {
						this.loadError = true;
						toast('加载失败，请检查网络', { icon: 'none' });
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
			preview(item) {
				const urls = item.photo_urls?.length ? item.photo_urls : [item.photo_url];
				previewImage(urls);
			},
			goPatrol() {
				switchTab('/tabs/patrol');
			},
		},
	};
</script>

<style scoped>
	.filter-bar {
		display: flex;
		gap: 8px;
		padding: 14px;
		position: sticky;
		top: 0;
		z-index: 5;
		background: #F1F4F9;
	}

	.filter {
		flex: 1;
		height: 48px;
		border-radius: 12px;
		background: #FFFFFF;
		border: 1.5px solid #E2E8F0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 5px;
		font-size: 17px;
		font-weight: 700;
		color: #334155;
	}

	.filter-count {
		min-width: 22px;
		padding: 1px 6px;
		border-radius: 999px;
		background: #EEF2F7;
		font-size: 13px;
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
		margin: 4px 2px 8px;
		font-size: 14px;
		font-weight: 800;
		color: #334155;
	}

	.record {
		border-left: 5px solid #15803D;
		padding: 12px 14px;
		margin-bottom: 10px;
	}

	.record.bad {
		border-left-color: #C62828;
	}

	.record-top {
		display: flex;
		align-items: flex-start;
		gap: 8px;
	}

	.record-main {
		flex: 1;
		min-width: 0;
	}

	.record-name {
		display: block;
		font-size: 17px;
		font-weight: 800;
		color: #0F172A;
		line-height: 1.3;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.record-time {
		display: flex;
		align-items: center;
		gap: 4px;
		margin-top: 4px;
		font-size: 13px;
		color: #64748B;
		white-space: nowrap;
		overflow: hidden;
	}

	.record-pin {
		margin-left: 8px;
	}

	.record-coord {
		color: #94A3B8;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.u-badge.big {
		font-size: 13px;
		padding: 4px 10px;
		flex-shrink: 0;
	}

	.issue {
		display: flex;
		gap: 6px;
		margin-top: 10px;
		padding: 10px 11px;
		border-radius: 9px;
		background: #FDECEC;
		color: #9B1C1C;
		font-size: 15px;
		line-height: 1.5;
	}

	.photo {
		display: block;
		width: 100%;
		height: 160px;
		object-fit: cover;
		margin-top: 10px;
		border-radius: 10px;
		background: #E2E8F0;
	}
</style>
