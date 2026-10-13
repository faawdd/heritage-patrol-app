// 原生能力封装（替代 uni.getLocation / chooseImage / previewImage / makePhoneCall / openLocation 等）。
import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Clipboard } from '@capacitor/clipboard';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import { Geolocation } from '@capacitor/geolocation';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { modalController } from '@ionic/vue';
import ImagePreview from '@/components/ImagePreview.vue';
import { getAuthHeader } from './auth.js';

export const isNative = () => Capacitor.isNativePlatform();
export const platform = () => Capacitor.getPlatform();
export const isAndroid = () => Capacitor.getPlatform() === 'android';

/* global __APP_VERSION__ */
export async function getAppVersion() {
	if (isNative()) {
		try {
			const info = await App.getInfo();
			return info.version;
		} catch (error) {
			// fall through
		}
	}
	return typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';
}

export async function ensureLocationPermission() {
	if (!isNative()) {
		return true;
	}
	try {
		let status = await Geolocation.checkPermissions();
		if (status.location !== 'granted' && status.coarseLocation !== 'granted') {
			status = await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] });
		}
		return status.location === 'granted' || status.coarseLocation === 'granted';
	} catch (error) {
		// 系统定位服务关闭时 checkPermissions 也会抛错
		throw normalizeLocationError(error);
	}
}

function normalizeLocationError(error) {
	const message = String((error && (error.message || error.errorMessage)) || error || '');
	const code = String((error && error.code) || '');
	let errMsg = '定位失败，请稍后重试';
	if (code === 'PERMISSION_DENIED' || /denied|permission/i.test(message) || code === '1') {
		errMsg = '定位权限被拒绝，请在系统设置中允许本应用使用位置信息';
	} else if (code === 'LOCATION_DISABLED' || /disabled|not enabled|turned off|services|provider/i.test(message)) {
		errMsg = '手机定位(GPS)未开启，请在下拉菜单中打开"位置信息"';
	} else if (code === 'TIMEOUT' || /timeout|timed out|in time/i.test(message) || code === '3') {
		errMsg = '定位超时，请到室外或窗边开阔处重试';
	}
	return { errMsg, code, message, raw: error, isLocationError: true };
}

export const NativeSensors = registerPlugin('NativeSensors');

function toLocationResult(c, timestamp, extra = {}) {
	return {
		latitude: Number(c.latitude),
		longitude: Number(c.longitude),
		altitude: c.altitude != null ? Number(c.altitude) : null,
		accuracy: c.accuracy != null ? Number(c.accuracy) : null,
		altitudeAccuracy: c.altitudeAccuracy != null ? Number(c.altitudeAccuracy) : null,
		speed: c.speed != null ? Number(c.speed) : null,
		timestamp,
		...extra,
	};
}

async function getPluginLocation({ highAccuracy, timeout, maximumAge }) {
	const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: highAccuracy, timeout, maximumAge });
	return toLocationResult(pos.coords || {}, pos.timestamp);
}

/**
 * 获取当前位置（WGS84），返回与 uni.getLocation 相似的结构：
 * { latitude, longitude, altitude, accuracy, altitudeAccuracy, speed }
 *
 * Android 上优先使用自定义原生插件（同时监听 GPS 与系统网络定位，并利用缓存位置），
 * 因为 @capacitor/geolocation 在装有 Google 服务的手机上只走 Google 融合定位，国内无法使用其网络定位，
 * 室内基本只能等 GPS 而超时。原生插件失败（非权限/开关问题）时再回退到 @capacitor/geolocation。
 */
export async function getLocation({ highAccuracy = true, timeout = 20000, maximumAge = 30000 } = {}) {
	const granted = await ensureLocationPermission();
	if (!granted) {
		throw { errMsg: '定位权限被拒绝，请在系统设置中允许本应用使用位置信息', code: 'PERMISSION_DENIED', isLocationError: true };
	}
	if (isAndroid() && Capacitor.isPluginAvailable('NativeSensors')) {
		try {
			const res = await NativeSensors.getLocation({
				timeout,
				maximumAge,
				desiredAccuracy: highAccuracy ? 50 : 500,
			});
			return toLocationResult(res, res.timestamp, { provider: res.provider, cached: !!res.cached, stale: !!res.stale });
		} catch (error) {
			const normalized = normalizeLocationError(error);
			if (normalized.code === 'PERMISSION_DENIED' || normalized.code === 'LOCATION_DISABLED') {
				throw normalized;
			}
			try {
				return await getPluginLocation({ highAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 });
			} catch (fallbackError) {
				throw normalized;
			}
		}
	}
	try {
		return await getPluginLocation({ highAccuracy, timeout, maximumAge });
	} catch (error) {
		throw normalizeLocationError(error);
	}
}

/**
 * 拍照或从相册选择图片。source: 'camera' | 'album' | 'prompt'
 * 返回 { webPath, format }，webPath 可直接用于 <img src> 与 fetch()。
 * 用户取消时 reject({ cancelled: true })。
 */
export async function chooseImage({ source = 'prompt', quality = 85, width = 2400 } = {}) {
	const sourceMap = { camera: CameraSource.Camera, album: CameraSource.Photos, prompt: CameraSource.Prompt };
	try {
		const photo = await Camera.getPhoto({
			resultType: CameraResultType.Uri,
			source: sourceMap[source] || CameraSource.Prompt,
			quality,
			width,
			correctOrientation: true,
			saveToGallery: false,
			promptLabelHeader: '选择图片',
			promptLabelCancel: '取消',
			promptLabelPhoto: '从相册选择',
			promptLabelPicture: '拍照',
		});
		return { webPath: photo.webPath, format: photo.format || 'jpeg' };
	} catch (error) {
		const message = String((error && error.message) || error || '');
		if (/cancel/i.test(message)) {
			throw { cancelled: true, errMsg: '已取消' };
		}
		throw { cancelled: false, errMsg: /denied|permission/i.test(message) ? '相机/相册权限被拒绝，请在系统设置中允许' : '获取图片失败', raw: error };
	}
}

export async function previewImage(urls, current) {
	const list = (Array.isArray(urls) ? urls : [urls]).filter(Boolean);
	if (!list.length) {
		return;
	}
	const index = Math.max(0, typeof current === 'number' ? current : list.indexOf(current));
	const modal = await modalController.create({
		component: ImagePreview,
		componentProps: { urls: list, index },
		cssClass: 'image-preview-modal',
	});
	await modal.present();
	return modal;
}

export function makePhoneCall(phoneNumber) {
	window.open(`tel:${phoneNumber}`, '_system');
}

/**
 * 在外部地图 App 中打开坐标（WGS84）。Android 使用 geo: URI，由系统选择地图应用。
 */
export function openLocation({ latitude, longitude, name = '' }) {
	const lat = Number(latitude);
	const lng = Number(longitude);
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
		return;
	}
	const label = encodeURIComponent(name || '目标位置');
	if (isAndroid()) {
		window.open(`geo:${lat},${lng}?q=${lat},${lng}(${label})`, '_system');
		return;
	}
	window.open(`https://uri.amap.com/marker?position=${lng},${lat}&name=${label}&coordinate=wgs84&callnative=1`, '_blank');
}

export async function setClipboard(text) {
	await Clipboard.write({ string: String(text) });
}

export function vibrateShort(style = 'light') {
	if (!isNative()) {
		return;
	}
	const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
	Haptics.impact({ style: map[style] || ImpactStyle.Light }).catch(() => {});
}

export function vibrateLong() {
	if (!isNative()) {
		return;
	}
	Haptics.notification({ type: NotificationType.Error }).catch(() => {});
}

function blobToBase64(blob) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}

/**
 * 下载文件并用系统应用打开（替代 uni.downloadFile + uni.openDocument）。
 */
export async function downloadAndOpen(url, { fileName, mimeType, auth = true } = {}) {
	const response = await fetch(url, { headers: auth ? getAuthHeader() : {} });
	if (!response.ok) {
		throw { statusCode: response.status, errMsg: `下载失败（${response.status}）` };
	}
	const blob = await response.blob();
	const type = mimeType || blob.type || 'application/octet-stream';
	const disposition = response.headers.get('content-disposition') || '';
	const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
	const name = fileName || (match ? decodeURIComponent(match[1]) : `download-${Date.now()}`);
	if (!isNative()) {
		const href = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = href;
		a.download = name;
		a.click();
		setTimeout(() => URL.revokeObjectURL(href), 10000);
		return;
	}
	const data = await blobToBase64(blob);
	const saved = await Filesystem.writeFile({ path: name, data, directory: Directory.Cache, recursive: true });
	await FileOpener.open({ filePath: saved.uri, contentType: type, openWithDefault: false });
}
