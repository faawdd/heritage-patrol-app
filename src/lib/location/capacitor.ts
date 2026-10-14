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
			let watchId: string | undefined;
			// 增加超时时间到60秒，给GPS冷启动留足够时间
			const timer = setTimeout(() => {
				expired = true;
				if (!settled) { 
					settled = true; 
					// 如果已经收到了 watchId，不算超时
					if (watchId) {
						console.warn('[Location] 注册超时，但已收到 watchId，继续监听');
						return;
					}
					reject(new LocationError('TIMEOUT', '原生定位监听注册超时，请确保在开阔处重试。')); 
				}
			}, 60000); // 增加到 60 秒
			
			const cleanup = (): void => {
				clearTimeout(timer);
			};
			
			NativeSurveyLocation.watchPosition({ intervalMs }, (event, error) => {
				// 如果已过期，清理监听
				if (expired) {
					if (event?.id) {
						console.warn('[Location] 过期回调，清理监听:', event.id);
						void NativeSurveyLocation.clearWatch({ id: event.id }).catch(cleanupError => 
							console.error('[Location] 原生监听清理失败', cleanupError));
					}
					return;
				}
				
				// 处理错误
				if (error || event?.error) {
					cleanup();
					if (!settled) {
						settled = true;
						expired = true;
						if (event?.id) void NativeSurveyLocation.clearWatch({ id: event.id }).catch(cleanupError => 
							console.error('[Location] 注册失败监听清理失败', cleanupError));
						reject(locationError(error ?? event.error));
					} else {
						// 已经 resolve 后收到的错误，通过回调传递
						callback(null, error ?? event.error);
					}
					return;
				}
				
				// 处理 watchId 确认
				if (!settled) {
					if (!event?.id) return; // 还没有 id，继续等待
					watchId = event.id;
					settled = true;
					cleanup();
					resolve(event.id);
					// 注意：这里不 return，因为可能同时有 position 数据
				}
				
				// 处理位置数据
				if (event.position) {
					callback(event.position);
				}
			}).catch(error => {
				cleanup();
				if (!settled) { 
					settled = true; 
					reject(locationError(error)); 
				} else {
					// 已经 resolve 后的错误，通过回调传递
					callback(null, error);
				}
			});
		});
	}

	clearWatch(id: string): Promise<void> {
		return available() ? NativeSurveyLocation.clearWatch({ id }) : Geolocation.clearWatch({ id });
	}
}

export const locationSource = new CapacitorLocationSource();
export const backgroundBackend: BackgroundBackend | undefined = available() ? NativeSurveyLocation : undefined;
