<template>
	<div class="app-page tabs-page">
		<div class="tabs-content">
			<router-view v-slot="{ Component, route }">
				<KeepAlive>
					<component :is="Component" :key="route.path" />
				</KeepAlive>
			</router-view>
		</div>
		<van-tabbar
			:model-value="current"
			class="app-tabbar"
			:fixed="false"
			:border="false"
			safe-area-inset-bottom
			@change="selectTab"
		>
			<van-tabbar-item v-for="item in navItems" :key="item.key" :name="item.key" :class="{ main: item.main }">
				<template #icon="{ active }">
					<div v-if="item.main" class="tab-main">
						<AppIcon name="camera" :size="48" color="var(--c-on-primary)" :stroke="2" />
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

<style>
	.tabs-content {
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}
	.app-tabbar {
		flex-shrink: 0;
		--van-tabbar-height: 62px;
		--van-tabbar-item-font-size: 0.75rem;
		--van-tabbar-item-text-color: var(--c-text-3);
		--van-tabbar-item-active-color: var(--c-primary);
		border-top: 1px solid var(--c-line);
		z-index: 2;
	}
	.app-tabbar .van-tabbar-item {
		font-size: 0.75rem;
		font-weight: 600;
		min-width: 0;
	}
	.app-tabbar .van-tabbar-item__icon {
		margin-bottom: 3px;
	}
	.app-tabbar .van-tabbar-item.main {
		overflow: visible;
	}
	.tab-main {
		width: 50px;
		height: 50px;
		margin-top: -20px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--g-primary);
		border: 3px solid var(--c-surface);
		box-shadow: 0 4px 12px rgba(var(--c-primary-rgb), 0.3);
	}
</style>
