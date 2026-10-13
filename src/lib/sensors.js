// 自定义原生插件 NativeSensors（android/app/src/main/java/.../NativeSensorsPlugin.java）：
// - getGpsLocation：直接读取 Android LocationManager 的 GPS 提供者（含海拔），绕过融合定位
// - getPressure：读取气压传感器（hPa）
import { Capacitor } from '@capacitor/core';
import { NativeSensors, ensureLocationPermission, getLocation } from './native.js';

const hasNativeSensors = () => Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('NativeSensors');

/**
 * 读取原生 GPS 定位（WGS84）。返回 { longitude, latitude, altitude, accuracy }；
 * 非 Android 或插件不可用时回退到 @capacitor/geolocation。
 */
export async function getGpsLocation({ timeout = 20000, useLastKnown = true } = {}) {
	if (!hasNativeSensors()) {
		const res = await getLocation({ highAccuracy: true, timeout });
		return { longitude: res.longitude, latitude: res.latitude, altitude: res.altitude, accuracy: res.accuracy };
	}
	const granted = await ensureLocationPermission();
	if (!granted) {
		throw new Error('permission denied');
	}
	const res = await NativeSensors.getGpsLocation({ timeout, useLastKnown });
	return {
		longitude: Number(res.longitude),
		latitude: Number(res.latitude),
		altitude: res.altitude != null ? Number(res.altitude) : null,
		accuracy: res.accuracy != null ? Number(res.accuracy) : null,
	};
}

/**
 * 读取一次气压（hPa）。设备无气压计或超时返回 null。
 */
export async function getPressure({ timeout = 3000 } = {}) {
	if (!hasNativeSensors()) {
		return null;
	}
	try {
		const res = await NativeSensors.getPressure({ timeout });
		const value = res && res.pressure != null ? Number(res.pressure) : null;
		if (!Number.isFinite(value)) {
			return null;
		}
		return value > 50000 ? value / 100 : value;
	} catch (error) {
		return null;
	}
}
