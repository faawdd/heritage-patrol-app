<template>
	<div class="app-page">
		<div class="app-content">
			<div class="u-page">
				<AppHeader :title="pageTitle || t('kml.title')" :subtitle="t('kml.headerSubtitle')" back />
				<div class="u-body kml-body">
					<div class="u-card kml-intro">
						<div class="kml-intro-icon"><AppIcon name="grid" :size="52" color="var(--c-info)" /></div>
						<div class="kml-intro-text">
							<span class="kml-intro-title">{{ t('kml.introTitle') }}</span>
							<span class="kml-intro-desc">{{ t('kml.subtitle') }}</span>
						</div>
					</div>

					<div v-if="enableLocation" class="u-card kml-loc">
						<div class="kml-loc-head">
							<span class="kml-loc-label">{{ t('kml.locationTitle') }}</span>
							<span :class="['u-badge', location ? 'ok' : (locating ? 'info' : 'warn')]">
								{{ location ? t('kml.locationReady') : (locating ? t('kml.locating') : t('kml.locationNone')) }}
							</span>
						</div>
						<span class="kml-loc-value">{{ lastLocationText || t('kml.locationHint') }}</span>
						<van-button native-type="button" class="u-btn plain sm kml-loc-btn" :disabled="locating" @click="showCurrentLocation()">
							{{ locating ? t('kml.locating') : t('kml.refreshLocation') }}
						</van-button>
					</div>

					<van-button native-type="button" class="u-btn primary block" :disabled="opening" @click="openTool">
						{{ opening ? t('kml.opening') : t('kml.openButton') }}
					</van-button>
					<span class="kml-tip">{{ t('kml.openTip') }}</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
	import AppHeader from '@/components/AppHeader.vue';
	import AppIcon from '@/components/AppIcon.vue';
	import { t } from '@/lib/i18n.js';
	import { toast, showLoading, hideLoading } from '@/lib/ui.js';
	import { getGpsLocation } from '@/lib/sensors.js';
	import { openWebTool, openApiEntry } from '@/lib/webview.js';

	// 在线系统页面禁止被 iframe 嵌入（X-Frame-Options: DENY），本页仅作为启动页：
	// 获取定位后，申请短时令牌入口并在应用内浏览器中打开。
	export default {
		components: { AppHeader, AppIcon },
		data() {
			return {
				presetUrl: '',
				location: null,
				locating: false,
				opening: false,
				lastLocationText: '',
				pageTitle: '',
				enableLocation: true,
			};
		},
		created() {
			const query = (this.$route && this.$route.query) || {};
			if (query.url) {
				this.presetUrl = String(query.url);
			}
			if (query.title) {
				this.pageTitle = String(query.title);
			}
			if (query.locate === '0') {
				this.enableLocation = false;
				return;
			}
			setTimeout(() => {
				this.showCurrentLocation({ showLoading: false, showSuccessToast: false, showFailToast: false });
			}, 80);
		},
		methods: {
			t,
			async openTool() {
				if (this.opening) {
					return;
				}
				this.opening = true;
				try {
					const transform = (url) => (this.location ? this.buildUrlWithLocation(url, this.location) : url);
					if (this.presetUrl) {
						await openWebTool(transform(this.presetUrl));
					} else {
						await openApiEntry('/api/admin/kml-overlay-entry', { transform });
					}
				} catch (_) {
					toast(this.t('admin.openFailed'), { icon: 'none' });
				} finally {
					this.opening = false;
				}
			},
			buildLocationText(location) {
				const lon = Number(location.longitude).toFixed(6);
				const lat = Number(location.latitude).toFixed(6);
				const acc = Number.isFinite(Number(location.accuracy)) ? ` ±${Math.round(Number(location.accuracy))}m` : '';
				return `${lon}, ${lat}${acc}`;
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
					this.location = location;
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
	.kml-body {
		padding-top: 14px;
		padding-bottom: 24px;
	}
	.kml-intro {
		display: flex;
		gap: 12px;
		align-items: flex-start;
	}
	.kml-intro-icon {
		flex: 0 0 44px;
		height: 44px;
		border-radius: 12px;
		background: var(--c-info-bg);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.kml-intro-text {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}
	.kml-intro-title {
		font-size: 1.0625rem;
		font-weight: 700;
		color: var(--c-text);
	}
	.kml-intro-desc {
		font-size: 0.875rem;
		line-height: 1.6;
		color: var(--c-text-3);
	}
	.kml-loc {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.kml-loc-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.kml-loc-label {
		font-size: 1rem;
		font-weight: 700;
		color: var(--c-text);
	}
	.kml-loc-value {
		font-size: 0.875rem;
		color: var(--c-text-2);
		font-variant-numeric: tabular-nums;
		word-break: break-all;
	}
	.kml-loc-btn {
		align-self: flex-start;
	}
	.kml-tip {
		display: block;
		margin-top: 10px;
		font-size: 0.8125rem;
		line-height: 1.6;
		color: var(--c-text-3);
		text-align: center;
	}
</style>
