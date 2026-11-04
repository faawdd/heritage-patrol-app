<template>
	<div class="app-page flex min-h-0 flex-col">
		<div class="min-h-0 flex-1 overflow-hidden">
			<router-view v-slot="{ Component, route }">
				<KeepAlive>
					<component :is="Component" :key="route.path" />
				</KeepAlive>
			</router-view>
		</div>
		<van-tabbar
			:model-value="current"
			class="app-tabbar border-t border-line"
			:fixed="false"
			:border="false"
			safe-area-inset-bottom
			@change="selectTab"
		>
			<van-tabbar-item v-for="item in navItems" :key="item.key" :name="item.key" :class="{ main: item.main }">
				<template #icon="{ active }">
					<div v-if="item.main" class="flex h-[1.875rem] w-11 items-center justify-center rounded-full bg-gradient-primary shadow-[0_0.125rem_0.5rem_rgb(var(--c-primary-rgb)/0.3)]">
						<AppIcon name="camera" :size="40" color="var(--c-on-primary)" :stroke="2" />
					</div>
					<AppIcon v-else :name="item.icon" :size="40" :color="active ? 'var(--c-primary)' : 'var(--c-text-4)'" :stroke="active ? 2.2 : 1.8" />
				</template>
				{{ item.name }}
			</van-tabbar-item>
		</van-tabbar>
	</div>
</template>

<script>
	import AppIcon from '@/components/AppIcon.vue';
	import { getUser, isAdminUser } from '@/lib/auth.js';
	import { switchTab } from '@/lib/nav.js';

	export default {
		name: 'TabsPage',
		components: { AppIcon },
		data() {
			return { user: getUser() || {} };
		},
		computed: {
			current() {
				return String(this.$route.path || '').split('/')[2] || 'home';
			},
			navItems() {
				const items = [
					{ key: 'home', name: '首页', icon: 'home' },
					isAdminUser(this.user)
						? { key: 'records', name: '记录', icon: 'file' }
						: { key: 'tasks', name: '任务', icon: 'clock' },
					{ key: 'patrol', name: '巡查', icon: 'camera', main: true },
				];
				items.push(isAdminUser(this.user)
					? { key: 'admin', name: '管理', icon: 'grid' }
					: { key: 'records', name: '记录', icon: 'file' });
				items.push({ key: 'my', name: '我的', icon: 'user' });
				return items;
			},
		},
		watch: {
			'$route.path'() { this.user = getUser() || {}; },
		},
		methods: {
			selectTab(name) { switchTab(`/tabs/${name}`); },
		},
	};
</script>

<style scoped>
	@reference "../theme/tailwind.css";

	.app-tabbar {
		flex-shrink: 0;
		--van-tabbar-height: 3.625rem;
		--van-tabbar-item-font-size: 0.75rem;
		--van-tabbar-item-text-color: var(--c-text-3);
		--van-tabbar-item-active-color: var(--c-primary);
		border-top: 1px solid var(--c-line);
		z-index: 2;
	}

	.app-tabbar :deep(.van-tabbar-item) {
		min-width: 0;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.app-tabbar :deep(.van-tabbar-item__icon) {
		display: flex;
		height: 2rem;
		align-items: center;
		justify-content: center;
		margin-bottom: 0.125rem;
	}
</style>
