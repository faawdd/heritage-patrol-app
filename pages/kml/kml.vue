<template>
	<view class="page">
		<view class="notice">
			<text class="kicker">{{ t('kml.heroLabel') }}</text>
			<text class="title">{{ t('kml.title') }}</text>
			<text class="desc">{{ t('kml.subtitle') }}</text>
			<view class="action-row">
				<button class="locate-btn" :disabled="locating" @click="showCurrentLocation">
					{{ locating ? t('kml.locating') : t('kml.showCurrentLocation') }}
				</button>
				<text v-if="lastLocationText" class="locate-text">{{ lastLocationText }}</text>
			</view>
		</view>
		<web-view :src="url"></web-view>
		<BottomNav current="admin" />
	</view>
</template>

<script>
	import config from '../../common/js/config.js';
	import createPageI18n from '../../common/js/pageI18n.js';
	import BottomNav from '../../components/BottomNav.vue';

	export default {
		mixins: [createPageI18n('kml')],
		components: {
			BottomNav,
		},
		data() {
			return {
				baseUrl: `${config.WEB_BASE_URL}/admin/kml-overlay-check/`,
				url: `${config.WEB_BASE_URL}/admin/kml-overlay-check/`,
				locating: false,
				lastLocationText: '',
				autoLocateTried: false,
			};
		},
		onLoad(options) {
			if (options && options.url) {
				this.baseUrl = decodeURIComponent(options.url);
				this.url = this.baseUrl;
			}
			this.tryAutoLocateOnEnter();
		},
		methods: {
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
						const nextPath = target.searchParams.get('next') || '/admin/kml-overlay-check/';
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
			getHighAccuracyLocation() {
				return new Promise((resolve, reject) => {
					// #ifdef APP-PLUS
					plus.geolocation.getCurrentPosition(
						(position) => {
							const coords = position && position.coords ? position.coords : {};
							resolve({
								longitude: Number(coords.longitude),
								latitude: Number(coords.latitude),
								altitude: coords.altitude != null ? Number(coords.altitude) : null,
								accuracy: coords.accuracy != null ? Number(coords.accuracy) : null,
							});
						},
						(err) => reject(err || new Error('定位失败')),
						{
							provider: 'gps',
							enableHighAccuracy: true,
							coordsType: 'wgs84',
							timeout: 12000,
							maximumAge: 0,
							geocode: false,
						}
					);
					// #endif

					// #ifndef APP-PLUS
					uni.getLocation({
						type: 'wgs84',
						altitude: true,
						isHighAccuracy: true,
						highAccuracyExpireTime: 12000,
						success: (res) => {
							resolve({
								longitude: Number(res.longitude),
								latitude: Number(res.latitude),
								altitude: res.altitude != null ? Number(res.altitude) : null,
								accuracy: res.accuracy != null ? Number(res.accuracy) : null,
							});
						},
						fail: (err) => reject(err || new Error('定位失败')),
					});
					// #endif
				});
			},
			async showCurrentLocation(options = {}) {
				if (this.locating) {
					return;
				}
				const showLoading = options.showLoading !== false;
				const showSuccessToast = options.showSuccessToast !== false;
				const showFailToast = options.showFailToast !== false;
				this.locating = true;
				if (showLoading) {
					uni.showLoading({ title: this.t('kml.locating') });
				}
				try {
					const location = await this.getHighAccuracyLocation();
					if (!Number.isFinite(location.longitude) || !Number.isFinite(location.latitude)) {
						throw new Error('invalid location');
					}
					this.lastLocationText = this.buildLocationText(location);
					this.url = this.buildUrlWithLocation(this.baseUrl, location);
					if (showSuccessToast) {
						uni.showToast({ title: this.t('kml.locationUpdated'), icon: 'none' });
					}
				} catch (_) {
					if (showFailToast) {
						uni.showToast({ title: this.t('kml.locationFailed'), icon: 'none' });
					}
				} finally {
					this.locating = false;
					if (showLoading) {
						uni.hideLoading();
					}
				}
			},
		},
	}
</script>

<style>
	.page {
		min-height: 100vh;
		padding-bottom: calc(184rpx + env(safe-area-inset-bottom));
		padding-bottom: calc(184rpx + constant(safe-area-inset-bottom));
		background: var(--bg-primary);
	}
	.notice {
		min-height: var(--topbar-min-height);
		width: 100%;
		box-sizing: border-box;
		padding: var(--card-padding);
		background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
		color: #fff;
		box-shadow: var(--shadow-strong);
	}
	.kicker {
		display: block;
		font-size: 20rpx;
		letter-spacing: 3rpx;
		text-transform: uppercase;
		opacity: 0.72;
		margin-bottom: 10rpx;
	}
	.title {
		display: block;
		font-size: var(--title-xl);
		font-weight: 700;
		margin-bottom: 10rpx;
	}
	.desc {
		display: block;
		font-size: 14px;
		line-height: 1.6;
		opacity: 0.9;
	}
	.action-row {
		margin-top: 16rpx;
		display: flex;
		align-items: center;
		gap: 16rpx;
		flex-wrap: wrap;
	}
	.locate-btn {
		min-height: 64rpx;
		line-height: 64rpx;
		padding: 0 24rpx;
		border-radius: 999rpx;
		border: 1rpx solid rgba(255, 255, 255, 0.8);
		background: rgba(255, 255, 255, 0.2);
		color: #fff;
		font-size: 24rpx;
		font-weight: 700;
	}
	.locate-btn[disabled] {
		opacity: 0.75;
	}
	.locate-text {
		font-size: 22rpx;
		line-height: 1.4;
		opacity: 0.9;
	}
</style>
