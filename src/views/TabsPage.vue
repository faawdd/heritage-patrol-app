<template>
	<ion-page>
		<ion-tabs>
			<ion-router-outlet />
			<ion-tab-bar slot="bottom" class="app-tabbar">
				<ion-tab-button
					v-for="item in navItems"
					:key="item.key"
					:tab="item.key"
					:href="item.url"
					:class="{ main: item.main }"
				>
					<div v-if="item.main" class="tab-main">
						<AppIcon name="camera" :size="32" color="#FFFFFF" :stroke="2" />
					</div>
					<template v-else>
						<AppIcon
							:name="item.icon"
							:size="26"
							:color="current === item.key ? '#2563EB' : '#94A3B8'"
							:stroke="current === item.key ? 2.2 : 1.8"
						/>
						<ion-label>{{ item.name }}</ion-label>
					</template>
				</ion-tab-button>
			</ion-tab-bar>
		</ion-tabs>
	</ion-page>
</template>

<script>
	// 简约底部导航：突出核心功能，减少视觉噪音
	import { IonLabel, IonPage, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs } from '@ionic/vue';
	import AppIcon from '@/components/AppIcon.vue';
	import { getUser, isAdminUser } from '@/lib/auth.js';

	export default {
		name: 'TabsPage',
		components: { IonPage, IonTabs, IonRouterOutlet, IonTabBar, IonTabButton, IonLabel, AppIcon },
		data() {
			return { user: getUser() || {} };
		},
		computed: {
			current() {
				const segment = String(this.$route.path || '').split('/')[2] || 'home';
				return segment;
			},
			navItems() {
				const items = [
					{ key: 'home', name: '首页', icon: 'home', url: '/tabs/home' },
					isAdminUser(this.user)
						? { key: 'records', name: '记录', icon: 'file', url: '/tabs/records' }
						: { key: 'tasks', name: '任务', icon: 'clock', url: '/tabs/tasks' },
					{ key: 'patrol', name: '巡查', icon: 'camera', url: '/tabs/patrol', main: true },
				];
				if (isAdminUser(this.user)) {
					items.push({ key: 'admin', name: '管理', icon: 'grid', url: '/tabs/admin' });
				} else {
					items.push({ key: 'records', name: '记录', icon: 'file', url: '/tabs/records' });
				}
				items.push({ key: 'my', name: '我的', icon: 'user', url: '/tabs/my' });
				return items;
			},
		},
		watch: {
			'$route.path'() {
				this.user = getUser() || {};
			},
		},
	};
</script>

<style>
	/* ========== 简约底部导航 ========== */
	.app-tabbar {
		--background: #FFFFFF;
		--border: 1px solid #F1F5F9;
		height: 60px;
		padding: 0 8px;
		padding-bottom: env(safe-area-inset-bottom);
		box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.04);
		overflow: visible;
		contain: none;
	}

	.app-tabbar ion-tab-button {
		--color: #94A3B8;
		--color-selected: #2563EB;
		--ripple-color: transparent;
		overflow: visible;
		gap: 2px;
		min-width: 0;
	}

	.app-tabbar ion-tab-button ion-label {
		font-size: 11px;
		line-height: 1.2;
		margin: 0;
		white-space: nowrap;
		font-weight: 500;
	}

	.app-tabbar ion-tab-button.tab-selected ion-label {
		font-weight: 600;
		color: #2563EB;
	}

	.app-tabbar ion-tab-button.main {
		justify-content: center;
		--color: #2563EB;
		--color-selected: #2563EB;
		z-index: 2;
	}

	/* ion-tab-button 的 shadow 内部容器默认 overflow:hidden，会把上浮的圆形按钮裁掉 */
	.app-tabbar ion-tab-button::part(native) {
		overflow: visible;
	}

	.app-tabbar ion-tab-button.main ion-label {
		display: none;
	}

	/* 主按钮 - 突出的圆形设计 */
	.tab-main {
		width: 52px;
		height: 52px;
		margin-top: -20px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
		border: 3px solid #FFFFFF;
		box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
		transition: all 150ms ease;
	}

	.app-tabbar ion-tab-button.main:active .tab-main {
		transform: scale(0.95);
		box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
	}
</style>
