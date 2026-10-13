<template>
	<ion-app>
		<ion-router-outlet />
		<UpdateDialog />
	</ion-app>
</template>

<script setup>
	import { onMounted } from 'vue';
	import { IonApp, IonRouterOutlet, useBackButton, useIonRouter } from '@ionic/vue';
	import { App as CapApp } from '@capacitor/app';
	import { Capacitor } from '@capacitor/core';
	import { ScreenOrientation } from '@capacitor/screen-orientation';
	import { SplashScreen } from '@capacitor/splash-screen';
	import { StatusBar, Style } from '@capacitor/status-bar';
	import { setIonRouter } from '@/lib/nav.js';
	import { initAutoUpdate } from '@/lib/updater.js';
	import UpdateDialog from '@/components/UpdateDialog.vue';

	const ionRouter = useIonRouter();
	setIonRouter(ionRouter);

	// Android 返回键：能后退则后退，否则退到后台（避免直接退出应用）
	useBackButton(-1, () => {
		if (ionRouter.canGoBack()) {
			ionRouter.back();
		} else {
			CapApp.minimizeApp().catch(() => CapApp.exitApp());
		}
	});

	onMounted(async () => {
		if (!Capacitor.isNativePlatform()) {
			return;
		}
		ScreenOrientation.lock({ orientation: 'portrait' }).catch(() => {});
		StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
		StatusBar.setBackgroundColor({ color: '#1E5AA8' }).catch(() => {});
		SplashScreen.hide().catch(() => {});
		initAutoUpdate();
	});
</script>
