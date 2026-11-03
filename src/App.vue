<template>
	<div class="app-shell">
		<router-view v-slot="{ Component, route }">
			<KeepAlive include="TabsPage" :max="1">
				<component :is="Component" :key="pageKey(route)" />
			</KeepAlive>
		</router-view>
		<van-action-sheet
			v-model:show="actionSheetState.show"
			:actions="actionSheetState.actions"
			:title="actionSheetState.title"
			cancel-text="取消"
			close-on-click-action
			@select="finishActionSheet"
			@cancel="finishActionSheet()"
			@click-overlay="finishActionSheet()"
		/>
		<UpdateDialog />
	</div>
</template>

<script setup>
	import { onMounted, onUnmounted } from 'vue';
	import { useRouter } from 'vue-router';
	import { App as CapApp } from '@capacitor/app';
	import { Capacitor } from '@capacitor/core';
	import { ScreenOrientation } from '@capacitor/screen-orientation';
	import { SplashScreen } from '@capacitor/splash-screen';
	import { canGoBack, navigateBack } from '@/lib/nav.js';
	import { applySettings } from '@/lib/settings.js';
	import { initAutoUpdate } from '@/lib/updater.js';
	import UpdateDialog from '@/components/UpdateDialog.vue';
	import { loadTasks, syncPatrols } from '@/lib/patrol.js';
	import { getUser, isLoggedIn } from '@/lib/auth.js';
	import { actionSheetState, dismissOverlay, finishActionSheet, toast } from '@/lib/ui.js';
	const router = useRouter();
	const removeRouteListener = router.afterEach(() => { dismissOverlay(true); });
	function pageKey(route) {
		return route.path.startsWith('/tabs/')
			? `tabs:${getUser()?.id || getUser()?.username || ''}`
			: route.fullPath;
	}

	async function syncOnline() {
		if (!isLoggedIn() || navigator.onLine === false) return;
		try {
			const result = await syncPatrols();
			if (result.uploaded) toast(`已同步 ${result.uploaded} 条巡查`);
			await loadTasks();
		} catch (error) {
			console.error('Patrol synchronization failed', error);
		}
	}
	let syncTimer;
	let resumeListener;
	let backListener;
	onUnmounted(() => {
		window.removeEventListener('online', syncOnline);
		clearInterval(syncTimer);
		resumeListener?.remove();
		backListener?.remove();
		removeRouteListener();
	});

	onMounted(async () => {
		window.addEventListener('online', syncOnline);
		syncTimer = setInterval(syncOnline, 60000);
		syncOnline();
		if (!Capacitor.isNativePlatform()) {
			return;
		}
		if (Capacitor.getPlatform() === 'android') {
			backListener = await CapApp.addListener('backButton', () => {
				if (dismissOverlay()) return;
				if (canGoBack()) navigateBack();
				else if (!router.currentRoute.value.path.startsWith('/tabs/') && router.currentRoute.value.path !== '/login') navigateBack();
				else CapApp.minimizeApp().catch(error => console.error('Unable to minimize app', error));
			});
		}
		resumeListener = await CapApp.addListener('appStateChange', ({ isActive }) => { if (isActive) syncOnline(); });
		ScreenOrientation.lock({ orientation: 'portrait' }).catch(() => {});
		// 状态栏颜色由外观设置统一管理（含深色模式）。
		applySettings();
		SplashScreen.hide().catch(() => {});
		initAutoUpdate();
	});
</script>
