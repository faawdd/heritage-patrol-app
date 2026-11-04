<template>
	<div class="app-page">
		<div class="app-content">
			<van-pull-refresh v-model="refreshing" @refresh="onRefresh">
			<div class="u-page">
				<AppHeader title="巡查记录" :subtitle="`共 ${records.length >= 100 ? '最近 100' : records.length} 条记录`">
					<div class="mt-2 flex gap-2">
						<van-button
							v-for="item in filters"
							:key="item.key"
							native-type="button"
							class="flex-1"
							:type="filter === item.key ? 'primary' : 'default'"
							@click="filter = item.key"
						>{{ item.name }} {{ counts[item.key] }}</van-button>
					</div>
				</AppHeader>

				<div class="u-body">
					<div v-if="pending.length" class="u-card">
						<h3>待同步巡查（{{ pending.length }}）</h3>
						<p>照片已保存到本机，上传成功后才移除。不要清除应用数据或卸载。</p>
						<van-button type="primary" block :disabled="syncing" @click="syncPending">{{ syncing ? '正在同步…' : '立即同步 / 重试' }}</van-button>
						<div v-for="item in pending" :key="item.key">
							<p>{{ item.site_name }} · {{ new Date(item.inspect_time).toLocaleString() }} · {{ item.photos.length }} 张照片</p>
							<p v-if="item.error" class="text-danger">{{ item.error }}</p>
							<van-button size="small" @click="previewPending(item)">查看本地照片</van-button>
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
						<van-button size="small" native-type="button" @click="load">重新加载</van-button>
					</div>

					<div v-else-if="!visible.length" class="u-card u-empty">
						<AppIcon name="records" :size="96" color="var(--c-text-4)" />
						<span>{{ records.length ? '没有符合条件的记录' : '还没有巡查记录' }}</span>
						<van-button type="primary" v-if="!records.length" native-type="button" @click="goPatrol">
							<AppIcon name="camera" :size="44" color="var(--c-on-primary)" />
							<span>去巡查上报</span>
						</van-button>
					</div>

					<div v-for="group in groups" :key="group.day" class="group">
						<span class="mb-1.5 mt-1.5 block px-0.5 text-[0.8125rem] font-semibold text-ink-2">{{ group.label }}</span>
						<div v-for="item in group.items" :key="item.id" class="record mb-2.5 border-l-4 px-3.5 py-3 bg-surface shadow-card" :class="item.is_normal ? 'border-l-success' : 'border-l-danger'">
							<div class="flex items-start gap-2">
								<div class="min-w-0 flex-1">
									<span class="block overflow-hidden text-ellipsis whitespace-nowrap text-[0.9375rem] font-semibold leading-[1.3] text-ink">{{ item.site_name || '未知文物点' }}</span>
									<div class="mt-1 flex items-center gap-1 overflow-hidden whitespace-nowrap text-xs text-ink-3">
										<AppIcon name="clock" :size="28" color="var(--c-text-3)" />
										<span>{{ timeOf(item.inspect_time) }}</span>
										<template v-if="item.latitude != null && item.longitude != null">
											<AppIcon class="ml-2" name="pin" :size="28" color="var(--c-text-4)" />
											<span class="overflow-hidden text-ellipsis text-ink-4">{{ coord(item.longitude) }}, {{ coord(item.latitude) }}</span>
										</template>
									</div>
								</div>
								<span class="u-badge shrink-0 px-2 py-0.5 text-xs" :class="item.is_normal ? 'ok' : 'bad'">{{ item.is_normal ? '正常' : '有问题' }}</span>
							</div>
							<div v-if="!item.is_normal && item.issue_details" class="mt-2.5 flex gap-1.5 bg-danger-bg px-3 py-2.5 text-sm leading-6 text-danger">
								<AppIcon name="alert" :size="36" color="var(--c-danger)" />
								<span>{{ item.issue_details }}</span>
							</div>
							<img
								v-if="item.photo_url"
								class="mt-2.5 block h-40 w-full bg-line object-cover"
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
