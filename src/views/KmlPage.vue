<template>
	<ion-page>
		<ion-header>
			<ion-toolbar class="app-toolbar">
				<ion-buttons slot="start"><ion-back-button default-href="/tabs/admin" /></ion-buttons>
				<ion-title>{{ pageTitle || t('kml.title') }}</ion-title>
				<ion-buttons slot="end">
					<ion-button @click="openInBrowser">在浏览器打开</ion-button>
				</ion-buttons>
			</ion-toolbar>
		</ion-header>
		<ion-content :scroll-y="false">
			<div class="page">
				<div class="notice">
					<span class="kicker">{{ t('kml.heroLabel') }}</span>
					<span class="title">{{ pageTitle || t('kml.title') }}</span>
					<span class="desc">{{ pageTitle ? t('kml.webSubtitle') : t('kml.subtitle') }}</span>
					<div v-if="enableLocation" class="action-row">
						<button type="button" class="locate-btn" :disabled="locating" @click="showCurrentLocation()">
							{{ locating ? t('kml.locating') : t('kml.showCurrentLocation') }}
						</button>
						<span v-if="lastLocationText" class="locate-text">{{ lastLocationText }}</span>
					</div>
				</div>
				<iframe v-if="url" :key="url" :src="url" class="web-frame"></iframe>
			</div>
		</ion-content>
	</ion-page>
</template>

<script>
	import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonButton } from '@ionic/vue';
	import { Browser } from '@capacitor/browser';
	import config from '@/lib/config.js';
	import { t } from '@/lib/i18n.js';
	import { toast, showLoading, hideLoading } from '@/lib/ui.js';
	import { getGpsLocation } from '@/lib/sensors.js';

	export default {
		components: { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonButton },
		data() {
			return {
				baseUrl: `${config.WEB_BASE_URL}/admin/kml-overlay-check/`,
				url: `${config.WEB_BASE_URL}/admin/kml-overlay-check/`,
				locating: false,
				lastLocationText: '',
				autoLocateTried: false,
				pageTitle: '',
				enableLocation: true,
			};
		},
		created() {
			const query = (this.$route && this.$route.query) || {};
			if (query.url) {
				this.baseUrl = String(query.url);
				this.url = this.baseUrl;
			}
			if (query.title) {
				this.pageTitle = String(query.title);
			}
			if (query.locate === '0') {
				this.enableLocation = false;
				return;
			}
			this.tryAutoLocateOnEnter();
		},
		methods: {
			t,
			async openInBrowser() {
				try {
					await Browser.open({ url: this.url });
				} catch (_) {
					toast(this.t('admin.openFailed'), { icon: 'none' });
				}
			},
			hasLocationParams(rawUrl) {
				if (!rawUrl) {
					return false;
				}
				try {
					const target = new URL(rawUrl);
					const path = String(target.pathname || '');
					if (path.includes('/mobile/kml-entry/')) {
						const nextPath = target.searchParams.get('next') || '';
						if (!nextPath) {
							return false;
						}
						const nextTarget = new URL(nextPath, 'https://local.invalid');
						return nextTarget.searchParams.has('app_loc_lon') && nextTarget.searchParams.has('app_loc_lat');
					}
					return target.searchParams.has('app_loc_lon') && target.searchParams.has('app_loc_lat');
				} catch (_) {
					return rawUrl.includes('app_loc_lon=') && rawUrl.includes('app_loc_lat=');
				}
			},
			tryAutoLocateOnEnter() {
				if (this.autoLocateTried) {
					return;
				}
				this.autoLocateTried = true;
				if (this.hasLocationParams(this.baseUrl)) {
					return;
				}
				setTimeout(() => {
					this.showCurrentLocation({
						showLoading: false,
						showSuccessToast: false,
						showFailToast: false,
					});
				}, 80);
			},
			buildLocationText(location) {
				const lon = Number(location.longitude).toFixed(6);
				const lat = Number(location.latitude).toFixed(6);
				const acc = Number.isFinite(Number(location.accuracy)) ? ` ±${Math.round(Number(location.accuracy))}m` : '';
				return `${this.t('kml.currentLocationPrefix')} ${lon}, ${lat}${acc}`;
			},
			appendLocationParams(searchParams, location) {
				searchParams.set('app_loc_lon', String(location.longitude));
				searchParams.set('app_loc_lat', String(location.latitude));
				if (location.altitude != null && Number.isFinite(Number(location.altitude))) {
					searchParams.set('app_loc_alt', String(location.altitude));
				} else {
					searchParams.delete('app_loc_alt');
				}
				if (location.accuracy != null && Number.isFinite(Number(location.accuracy))) {
					searchParams.set('app_loc_accuracy', String(location.accuracy));
				} else {
					searchParams.delete('app_loc_accuracy');
				}
				searchParams.set('app_loc_ts', String(Date.now()));
			},
			appendLocationToPath(path, location) {
				const dummyOrigin = 'https://local.invalid';
				const target = new URL(path, dummyOrigin);
				this.appendLocationParams(target.searchParams, location);
				return `${target.pathname}${target.search}${target.hash}`;
			},
			buildUrlWithLocation(rawUrl, location) {
				try {
					const target = new URL(rawUrl);
					const path = String(target.pathname || '');
					if (path.includes('/mobile/kml-entry/')) {
						const nextPath = target.searchParams.get('next') || '/static/frontend/gis/kml-management';
						target.searchParams.set('next', this.appendLocationToPath(nextPath, location));
						return target.toString();
					}

					this.appendLocationParams(target.searchParams, location);
					return target.toString();
				} catch (_) {
					const separator = rawUrl.includes('?') ? '&' : '?';
					return `${rawUrl}${separator}app_loc_lon=${encodeURIComponent(location.longitude)}&app_loc_lat=${encodeURIComponent(location.latitude)}&app_loc_ts=${Date.now()}`;
				}
			},
			async getHighAccuracyLocation() {
				const loc = await getGpsLocation({ timeout: 12000, useLastKnown: false });
				return {
					longitude: Number(loc.longitude),
					latitude: Number(loc.latitude),
					altitude: loc.altitude != null ? Number(loc.altitude) : null,
					accuracy: loc.accuracy != null ? Number(loc.accuracy) : null,
				};
			},
			async showCurrentLocation(options = {}) {
				if (this.locating) {
					return;
				}
				const withLoading = options.showLoading !== false;
				const showSuccessToast = options.showSuccessToast !== false;
				const showFailToast = options.showFailToast !== false;
				this.locating = true;
				if (withLoading) {
					showLoading(this.t('kml.locating'));
				}
				try {
					const location = await this.getHighAccuracyLocation();
					if (!Number.isFinite(location.longitude) || !Number.isFinite(location.latitude)) {
						throw new Error('invalid location');
					}
					this.lastLocationText = this.buildLocationText(location);
					this.url = this.buildUrlWithLocation(this.baseUrl, location);
					if (showSuccessToast) {
						toast(this.t('kml.locationUpdated'), { icon: 'none' });
					}
				} catch (_) {
					if (showFailToast) {
						toast(this.t('kml.locationFailed'), { icon: 'none' });
					}
				} finally {
					this.locating = false;
					if (withLoading) {
						hideLoading();
					}
				}
			},
		},
	};
</script>

<style scoped>
	.page {
		height: 100%;
		display: flex;
		flex-direction: column;
		background: var(--bg-primary);
	}
	.notice {
		flex: 0 0 auto;
		width: 100%;
		box-sizing: border-box;
		padding: var(--card-padding);
		background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
		color: #fff;
		box-shadow: var(--shadow-strong);
	}
	.web-frame {
		flex: 1 1 auto;
		width: 100%;
		height: 100%;
		min-height: 0;
		border: 0;
	}
	.kicker {
		display: block;
		font-size: 10px;
		letter-spacing: 1.5px;
		text-transform: uppercase;
		opacity: 0.72;
		margin-bottom: 5px;
	}
	.title {
		display: block;
		font-size: var(--title-xl);
		font-weight: 700;
		margin-bottom: 5px;
	}
	.desc {
		display: block;
		font-size: 14px;
		line-height: 1.6;
		opacity: 0.9;
	}
	.action-row {
		margin-top: 8px;
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}
	.locate-btn {
		min-height: 32px;
		line-height: 32px;
		padding: 0 12px;
		border-radius: 999px;
		border: 0.5px solid rgba(255, 255, 255, 0.8);
		background: rgba(255, 255, 255, 0.2);
		color: #fff;
		font-size: 12px;
		font-weight: 700;
	}
	.locate-btn[disabled] {
		opacity: 0.75;
	}
	.locate-text {
		font-size: 11px;
		line-height: 1.4;
		opacity: 0.9;
	}
</style>
