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
						<AppIcon name="camera" :size="56" color="#FFFFFF" :stroke="2.2" />
					</div>
					<AppIcon
						v-else
						:name="item.icon"
						:size="52"
						:color="current === item.key ? '#1E5AA8' : '#64748B'"
						:stroke="current === item.key ? 2.4 : 2"
					/>
					<ion-label>{{ item.name }}</ion-label>
				</ion-tab-button>
			</ion-tab-bar>
		</ion-tabs>
	</ion-page>
</template>

<script>
	// 底部导航（替代原 BottomNav 组件）：首页 / 记录 / 巡查上报 / 管理（仅管理员）/ 我的
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
					{ key: 'records', name: '记录', icon: 'records', url: '/tabs/records' },
					{ key: 'patrol', name: '巡查上报', icon: 'camera', url: '/tabs/patrol', main: true },
				];
				if (isAdminUser(this.user)) {
					items.push({ key: 'admin', name: '管理', icon: 'grid', url: '/tabs/admin' });
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
	.app-tabbar {
		--background: #FFFFFF;
		--border: 0.5px solid #E2E8F0;
		height: 64px;
		padding: 0 4px;
		box-shadow: 0 -4px 16px rgba(15, 47, 92, 0.08);
		overflow: visible;
		contain: none;
	}

	.app-tabbar ion-tab-button {
		--color: #64748B;
		--color-selected: #1E5AA8;
		--ripple-color: transparent;
		overflow: visible;
		gap: 3px;
	}

	.app-tabbar ion-tab-button ion-label {
		font-size: 14px;
		line-height: 1.2;
		margin: 0;
		white-space: nowrap;
	}

	.app-tabbar ion-tab-button.tab-selected ion-label {
		font-weight: 800;
	}

	.app-tabbar ion-tab-button.main {
		justify-content: flex-end;
		--color: #1E5AA8;
		--color-selected: #1E5AA8;
		z-index: 2;
	}

	/* ion-tab-button 的 shadow 内部容器默认 overflow:hidden，会把上浮的圆形按钮裁掉 */
	.app-tabbar ion-tab-button::part(native) {
		overflow: visible;
	}

	.app-tabbar ion-tab-button.main ion-label {
		font-weight: 800;
		padding-bottom: 6px;
	}

	.tab-main {
		flex: 0 0 auto;
		width: 56px;
		height: 56px;
		margin-top: -26px;
		box-sizing: border-box;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #2A6BC2 0%, #1E5AA8 60%, #174B8F 100%);
		border: 4px solid #FFFFFF;
		box-shadow: 0 5px 14px rgba(30, 90, 168, 0.4);
	}
</style>
