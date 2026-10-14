/** 所有坐标均为 WGS84；长度、速度分别使用米、米/秒，时间戳使用 Unix 毫秒。 */
export interface LocationFix {
	timestamp: number;
	mocked?: boolean;
	coords: {
		latitude: number;
		longitude: number;
		accuracy: number;
		altitude: number | null;
		altitudeAccuracy?: number | null;
		speed: number | null;
		heading: number | null;
	};
}

export interface LocationSource {
	ensurePermission(background?: boolean): Promise<void>;
	watchPosition(intervalMs: number, callback: (fix: LocationFix | null, error?: unknown) => void): Promise<string>;
	clearWatch(id: string): Promise<void>;
}

export type LocationErrorCode = 'PERMISSION_DENIED' | 'PRECISE_REQUIRED' | 'LOCATION_DISABLED'
	| 'TIMEOUT' | 'CANCELLED' | 'BUSY' | 'INVALID_OPTIONS' | 'UNSUPPORTED' | 'UNAVAILABLE'
	| 'NOTIFICATION_PERMISSION' | 'FOREGROUND_REQUIRED' | 'NO_SIGNAL' | 'STORAGE_ERROR' | 'INTERRUPTED';

/** 使用 Error 而非成功形状的兜底对象，UI 可统一显示 message 并按 code 分类。 */
export class LocationError extends Error {
	readonly code: LocationErrorCode;
	constructor(code: LocationErrorCode, message: string, options?: ErrorOptions) {
		super(message, options);
		this.code = code;
		this.name = 'LocationError';
	}
}

export function locationError(error: unknown): LocationError {
	if (error instanceof LocationError) return error;
	const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
	const message = error instanceof Error ? error.message
		: typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : String(error);
	if (['PERMISSION_DENIED', 'OS-PLUG-GLOC-0003', '1'].includes(code)) {
		return new LocationError('PERMISSION_DENIED', '位置权限被拒绝，请在应用设置中允许使用位置。', { cause: error });
	}
	if (['TIMEOUT', 'START_TIMEOUT', 'OS-PLUG-GLOC-0010', '3'].includes(code)) {
		return new LocationError('TIMEOUT', '定位或采样超时，请到开阔处保持静止后重试。', { cause: error });
	}
	if (['LOCATION_DISABLED', 'PROVIDER_DISABLED', 'OS-PLUG-GLOC-0007'].includes(code)) {
		return new LocationError('LOCATION_DISABLED', '请开启手机位置信息和 GPS。', { cause: error });
	}
	if (code === 'INVALID_ARGUMENT') return new LocationError('INVALID_OPTIONS', '定位参数无效，请检查采样间隔和读取游标。', { cause: error });
	const unavailableMessages: Record<string, string> = {
		LOCATION_UNAVAILABLE: '系统 GPS 服务不可用，请开启位置信息后重试。',
		LOCATION_CLEANUP_FAILED: '停止 GPS 监听失败，请重新尝试停止记录。',
		FOREGROUND_START_FAILED: '后台巡查服务启动失败，请确认 App 在前台且允许通知和精确位置。',
		NOT_FOUND: '找不到本机轨迹，可能已经被删除。',
		SETTINGS_UNAVAILABLE: '无法打开系统设置，请手动进入应用权限设置。',
	};
	if (Object.hasOwn(unavailableMessages, code)) return new LocationError('UNAVAILABLE', unavailableMessages[code]!, { cause: error });
	const messages: Partial<Record<LocationErrorCode, string>> = {
		PRECISE_REQUIRED: '高精度采集需要精确位置权限，请在应用设置中开启。',
		NOTIFICATION_PERMISSION: '后台巡查需要通知权限，以显示正在记录的提示。',
		FOREGROUND_REQUIRED: '请在 App 可见时点击开始后台巡查。',
		NO_SIGNAL: '长时间未收到新的 GPS 坐标，轨迹已停止，请检查信号后重新开始。',
		STORAGE_ERROR: '本机轨迹保存失败，请检查存储空间。',
		INTERRUPTED: '后台轨迹被系统中断，已有记录仍保存在本机；请回到 App 手动重新开始。',
		BUSY: '已有定位任务正在运行，请先停止。',
		UNSUPPORTED: '当前平台或安装包不支持此定位功能。',
	};
	if (Object.hasOwn(messages, code)) {
		const known = code as LocationErrorCode;
		return new LocationError(known, messages[known]!, { cause: error });
	}
	return new LocationError('UNAVAILABLE', `定位失败：${message || code || '未知错误'}`, { cause: error });
}

export interface SampleProgress {
	attempt: number;
	accepted: number;
	rejected: number;
	target: number;
	lastAccuracy: number | null;
	reason: string | null;
}

export interface SamplingOptions {
	sampleCount?: number;
	maxAccuracyMeters?: number;
	timeoutMs?: number;
	/** 重试次数，不包含首次尝试；每次重试重新采样，不混用历史样本。 */
	retries?: number;
	retryDelayMs?: number;
	intervalMs?: number;
	maxAgeMs?: number;
	maxStationaryRadiusMeters?: number;
	/** 设备报告速度超过此值时不作为静止样本；速度缺失时仍依赖位置离散检查。 */
	maxStationarySpeedMetersPerSecond?: number;
	average?: 'weighted' | 'arithmetic';
	signal?: AbortSignal;
	onProgress?: (progress: SampleProgress) => void;
}

export interface SurveyPoint {
	latitude: number;
	longitude: number;
	/** GPS 海拔未经 DEM/大地水准面校正，不应标为国家高程。 */
	altitude: number | null;
	altitudeAccuracy: number | null;
	timestamp: number;
	startedAt: number;
	sampleCount: number;
	rejectedCount: number;
	/** 样本最小水平精度半径，仅为设备报告值，不是最终点实测误差。 */
	bestAccuracyRadius: number;
	/** 保守采用样本最差报告半径，不使用 accuracy/sqrt(N) 宣称精度提升。 */
	accuracy: number;
	spreadMeters: number;
	method: 'weighted' | 'arithmetic';
	crs: 'WGS84';
}

export interface TrackOptions {
	intervalMs?: number;
	maxAccuracyMeters?: number;
	maxAgeMs?: number;
	maxSpeedMetersPerSecond?: number;
	processNoiseMetersPerSecond?: number;
	resetGapMs?: number;
	signalTimeoutMs?: number;
}

export interface TrackPoint {
	crs: 'WGS84';
	latitude: number;
	longitude: number;
	altitude: number | null;
	timestamp: number;
	accuracy: number;
	/** 模型内部估计，不能作为现场测量精度保证。 */
	filterRadius: number;
	segment: number;
	raw: LocationFix;
}

export interface TrackCallbacks {
	onPoint: (point: TrackPoint) => void;
	onRejected?: (reason: string, fix: LocationFix) => void;
	onError: (error: LocationError) => void;
}

export interface BackgroundTrack {
	sessionId: string;
	startedAt: number;
	stoppedAt: number | null;
	error: { code: string; message: string } | null;
}

export interface BackgroundPage {
	points: { id: number; position: LocationFix }[];
	active: boolean;
	error: { code: string; message: string } | null;
}

export interface BackgroundBackend {
	startBackgroundTrack(options: { intervalMs: number }): Promise<{ sessionId: string }>;
	stopBackgroundTrack(): Promise<{ sessionId: string | null }>;
	getBackgroundStatus(): Promise<{ sessionId: string | null; error: { code: string; message: string } | null }>;
	listBackgroundTracks(): Promise<{ tracks: BackgroundTrack[] }>;
	readBackgroundTrack(options: { sessionId: string; afterId: number; limit: number }): Promise<BackgroundPage>;
	deleteBackgroundTrack(options: { sessionId: string }): Promise<void>;
}

export function positive(value: number, name: string, max = Number.MAX_SAFE_INTEGER): number {
	if (!Number.isFinite(value) || value <= 0 || value > max) {
		throw new LocationError('INVALID_OPTIONS', `${name} 必须为大于 0 且不超过 ${max} 的有限数值。`);
	}
	return value;
}

export function integer(value: number, name: string, min: number, max: number): number {
	if (!Number.isInteger(value) || value < min || value > max) {
		throw new LocationError('INVALID_OPTIONS', `${name} 必须为 ${min}–${max} 的整数。`);
	}
	return value;
}

/** 原生权限弹窗/桥接也可能不返回；限制等待并响应取消，但不假装已撤销系统权限弹窗。 */
export function waitForOperation<T>(operation: Promise<T>, timeoutMs: number, signal?: AbortSignal): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const cleanup = (): void => { clearTimeout(timer); signal?.removeEventListener('abort', abort); };
		const abort = (): void => { cleanup(); reject(new LocationError('CANCELLED', '已取消定位操作。')); };
		const timer = setTimeout(() => { cleanup(); reject(new LocationError('TIMEOUT', '等待定位权限或原生服务响应超时。')); }, timeoutMs);
		signal?.addEventListener('abort', abort, { once: true });
		if (signal?.aborted) abort();
		operation.then(value => { cleanup(); resolve(value); }, error => { cleanup(); reject(error); });
	});
}
