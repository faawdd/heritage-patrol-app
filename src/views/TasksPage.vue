<template>
	<div class="app-page">
		<div class="app-content">
			<div class="u-page">
				<AppHeader title="我的巡查任务" subtitle="按分配文物点与巡查周期安排巡查" />
				<div class="u-body">
					<van-button class="u-btn primary block" :disabled="loading" @click="load">更新任务 / 离线缓存</van-button>
					<p v-if="notice">{{ notice }}</p>
					<div v-if="!loading && !tasks.length" class="u-card">请联系管理员分配巡查文物点</div>
					<div v-for="site in tasks" :key="site.id" class="u-card">
						<h3>{{ site.name }}</h3>
						<p>{{ site.township || site.address }}</p>
						<p>{{ site.interval_days ? `每 ${site.interval_days} 天巡查一次` : '未设置周期' }}</p>
						<span class="u-badge" :class="isOverdue(site) ? 'bad' : 'ok'">{{ site.due_at ? `${isOverdue(site) ? '已逾期 · ' : '到期 · '}${new Date(site.due_at).toLocaleString()}` : '无期限' }}</span>
					</div>
					<van-button class="u-btn primary block" @click="switchTab('/tabs/patrol')">去巡查上报</van-button>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { onActivated, ref } from 'vue';
import AppHeader from '@/components/AppHeader.vue';
import { loadTasks } from '@/lib/patrol.js';
import { switchTab } from '@/lib/nav.js';
import { toast } from '@/lib/ui.js';

const tasks = ref([]);
const loading = ref(false);
const notice = ref('');
const isOverdue = site => !!site.due_at && Date.parse(site.due_at) < Date.now();
async function load() {
	loading.value = true;
	try {
		const result = await loadTasks();
		tasks.value = result.items || [];
		notice.value = result.cached ? `使用离线清单（缓存于 ${new Date(result.savedAt).toLocaleString()}）；联网后更新最新分配。` : '任务清单已保存，可断网巡查。';
	} catch (error) {
		notice.value = error.message || error.errMsg || '任务加载失败';
		toast(notice.value);
	} finally {
		loading.value = false;
	}
}
onActivated(load);
</script>
