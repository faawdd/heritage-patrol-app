import { Capacitor, registerPlugin } from '@capacitor/core';
import type { PermissionState } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { LocationError, integer, locationError } from './types.ts';
import type { BackgroundBackend, LocationFix, LocationSource } from './types.ts';

interface NativeSurveyPlugin extends BackgroundBackend {
	checkPermissions(): Promise<{ location: PermissionState; coarseLocation: PermissionState; notifications: PermissionState }>;
	requestPermissions(options: { permissions: ('location' | 'notifications')[] }): ReturnType<NativeSurveyPlugin['checkPermissions']>;
	checkReady(): Promise<{ enabled: boolean; precise: boolean; foreground: boolean }>;
	openSettings(): Promise<void>;
	watchPosition(options: { intervalMs: number }, callback: (event: { id: string; position?: LocationFix; error?: { code: string; message: string } }, error?: unknown) => void): Promise<string>;
	clearWatch(options: { id: string }): Promise<void>;
}

export const NativeSurveyLocation = registerPlugin<NativeSurveyPlugin>('NativeSurveyLocation');
const android = (): boolean => Capacitor.getPlatform() === 'android';
const available = (): boolean => android() && Capacitor.isPluginAvailable('NativeSurveyLocation');

/** Android 使用系统 GPS 连续采样；其他平台使用官方插件，不能悄悄降级 Android 精确采集。 */
export class CapacitorLocationSource implements LocationSource {
	async ensurePermission(background = false): Promise<void> {
		try {
			if (android() && !available()) throw new LocationError('UNSUPPORTED', '安装包缺少高精度原生插件，请更新 App。');
			if (available()) {
				let permissions = await NativeSurveyLocation.checkPermissions();
				if (permissions.location !== 'granted') permissions = await NativeSurveyLocation.requestPermissions({ permissions: ['location'] });
				if (permissions.location !== 'granted') throw new LocationError('PRECISE_REQUIRED', '请允许精确位置；模糊位置不能用于高精度打点。');
				if (background && permissions.notifications !== 'granted') {
					permissions = await NativeSurveyLocation.requestPermissions({ permissions: ['notifications'] });
					if (permissions.notifications !== 'granted') throw new LocationError('NOTIFICATION_PERMISSION', '请允许通知，以显示后台记录状态和停止按钮。');
				}
				const ready = await NativeSurveyLocation.checkReady();
				if (!ready.enabled) throw new LocationError('LOCATION_DISABLED', '请开启 GPS 和手机位置信息。');
				if (!ready.precise) throw new LocationError('PRECISE_REQUIRED', '请在系统设置中允许精确位置。');
				if (background && !ready.foreground) throw new LocationError('FOREGROUND_REQUIRED', '请在 App 可见时开始后台记录。');
			} else {
				if (background) throw new LocationError('UNSUPPORTED', '浏览器和 iOS 示例不支持原生后台轨迹。');
				// Web 权限由浏览器 watchPosition 触发；不能调用不支持的 requestPermissions。
				if (Capacitor.isNativePlatform()) {
					let permissions = await Geolocation.checkPermissions();
					if (permissions.location !== 'granted') permissions = await Geolocation.requestPermissions({ permissions: ['location'] });
					if (permissions.location !== 'granted') throw new LocationError('PERMISSION_DENIED', '请允许使用位置信息。');
				}
			}
		} catch (error) { throw locationError(error); }
	}

	async watchPosition(intervalMs: number, callback: (fix: LocationFix | null, error?: unknown) => void): Promise<string> {
		integer(intervalMs, '定位间隔', 100, 60000);
		if (!available()) {
			if (android()) throw new LocationError('UNSUPPORTED', '高精度原生定位插件不可用。');
			return Geolocation.watchPosition({
				enableHighAccuracy: true, maximumAge: 0, timeout: 60000,
				interval: intervalMs, minimumUpdateInterval: intervalMs,
			}, (position, error) => callback(position, error));
		}
		return new Promise<string>((resolve, reject) => {
			let settled = false;
			let expired = false;
			const timer = setTimeout(() => {
				expired = true;
				if (!settled) { settled = true; reject(new LocationError('TIMEOUT', '原生定位监听注册超时。')); }
			}, 10000);
			NativeSurveyLocation.watchPosition({ intervalMs }, (event, error) => {
				if (expired) {
					if (event?.id) void NativeSurveyLocation.clearWatch({ id: event.id }).catch(cleanup => console.error('原生监听清理失败', cleanup));
					return;
				}
				if (error || event?.error) {
					clearTimeout(timer);
					if (!settled) {
						settled = true;
						expired = true;
						if (event?.id) void NativeSurveyLocation.clearWatch({ id: event.id }).catch(cleanup => console.error('注册失败监听清理失败', cleanup));
						reject(locationError(error ?? event.error));
					}
					else callback(null, error ?? event.error);
					return;
				}
				if (!settled) {
					if (!event?.id) return;
					settled = true;
					clearTimeout(timer);
					resolve(event.id);
				}
				if (event.position) callback(event.position);
			}).catch(error => {
				clearTimeout(timer);
				if (!settled) { settled = true; reject(locationError(error)); }
				else callback(null, error);
			});
		});
	}

	clearWatch(id: string): Promise<void> {
		return available() ? NativeSurveyLocation.clearWatch({ id }) : Geolocation.clearWatch({ id });
	}
}

export const locationSource = new CapacitorLocationSource();
export const backgroundBackend: BackgroundBackend | undefined = available() ? NativeSurveyLocation : undefined;
