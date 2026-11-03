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
							<p v-if="item.error" style="color: var(--c-danger)">{{ item.error }}</p>
							<van-button class="u-btn sm" @click="previewPending(item)">查看本地照片</van-button>
						</div>
					</div>
					<p v-if="cached">正在显示本机缓存记录，联网后可刷新。</p>
					<div v-if="loading && !records.length" class="u-empty">
						<AppIcon name="clock" :size="88" color="var(--c-text-4)" />
						<span>正在加载…</span>
					</div>

					<div v-else-if="loadError && !records.length" class="u-card u-empty">
						<AppIcon name="alert" :size="88" color="var(--c-warning)" />
						<span>加载失败，请检查网络</span>
						<van-button native-type="button" class="u-btn sm" @click="load">重新加载</van-button>
					</div>

					<div v-else-if="!visible.length" class="u-card u-empty">
						<AppIcon name="records" :size="96" color="var(--c-text-4)" />
						<span>{{ records.length ? '没有符合条件的记录' : '还没有巡查记录' }}</span>
						<van-button v-if="!records.length" native-type="button" class="u-btn primary" @click="goPatrol">
							<AppIcon name="camera" :size="44" color="var(--c-on-primary)" />
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
										<AppIcon name="clock" :size="28" color="var(--c-text-3)" />
										<span>{{ timeOf(item.inspect_time) }}</span>
										<template v-if="item.latitude != null && item.longitude != null">
											<AppIcon class="record-pin" name="pin" :size="28" color="var(--c-text-4)" />
											<span class="record-coord">{{ coord(item.longitude) }}, {{ coord(item.latitude) }}</span>
										</template>
									</div>
								</div>
								<span class="u-badge big" :class="item.is_normal ? 'ok' : 'bad'">{{ item.is_normal ? '正常' : '有问题' }}</span>
							</div>
							<div v-if="!item.is_normal && item.issue_details" class="issue">
								<AppIcon name="alert" :size="36" color="var(--c-danger)" />
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
		padding: 12px 16px;
		position: sticky;
		top: 0;
		z-index: 5;
		background: var(--c-bg);
		border-bottom: 1px solid var(--c-line);
	}

	.filter {
		flex: 1;
		height: 44px;
		border-radius: 10px;
		background: var(--c-surface);
		border: 1px solid var(--c-line);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 5px;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--c-text-2);
	}

	.filter-count {
		min-width: 20px;
		padding: 1px 6px;
		border-radius: 999px;
		background: var(--c-fill);
		font-size: 0.75rem;
		text-align: center;
		box-sizing: border-box;
	}

	.filter.active {
		color: var(--c-on-primary);
		background: var(--c-primary);
		border-color: var(--c-primary);
	}

	.filter.ok.active {
		background: var(--c-success);
		border-color: var(--c-success);
	}

	.filter.bad.active {
		background: var(--c-danger);
		border-color: var(--c-danger);
	}

	.filter.active .filter-count {
		background: rgba(255, 255, 255, 0.22);
	}

	.group-title {
		display: block;
		margin: 6px 2px 6px;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--c-text-2);
	}

	.record {
		border-left: 4px solid var(--c-success);
		padding: 12px 14px;
		margin-bottom: 10px;
	}

	.record.bad {
		border-left-color: var(--c-danger);
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
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--c-text);
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
		font-size: 0.75rem;
		color: var(--c-text-3);
		white-space: nowrap;
		overflow: hidden;
	}

	.record-pin {
		margin-left: 8px;
	}

	.record-coord {
		color: var(--c-text-4);
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.u-badge.big {
		font-size: 0.75rem;
		padding: 3px 8px;
		flex-shrink: 0;
	}

	.issue {
		display: flex;
		gap: 6px;
		margin-top: 10px;
		padding: 10px 11px;
		border-radius: 9px;
		background: var(--c-danger-bg);
		color: var(--c-danger);
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.photo {
		display: block;
		width: 100%;
		height: 160px;
		object-fit: cover;
		margin-top: 10px;
		border-radius: 10px;
		background: var(--c-line);
	}
</style>
