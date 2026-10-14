import { distance, invalidFix, project, unproject } from './geo.ts';
import { LocationError, integer, locationError, positive, waitForOperation } from './types.ts';
import type { BackgroundBackend, BackgroundPage, BackgroundTrack, LocationFix, LocationSource, TrackCallbacks, TrackOptions, TrackPoint } from './types.ts';

export function trackConfig(options: TrackOptions = {}) {
	return {
		intervalMs: integer(options.intervalMs ?? 1000, '定位间隔', 100, 60000),
		maxAccuracyMeters: positive(options.maxAccuracyMeters ?? 20, '轨迹精度阈值', 1000),
		maxAgeMs: integer(options.maxAgeMs ?? 5000, '轨迹有效时间', 100, 60000),
		maxSpeedMetersPerSecond: positive(options.maxSpeedMetersPerSecond ?? 8, '最大移动速度', 100),
		processNoiseMetersPerSecond: positive(options.processNoiseMetersPerSecond ?? 2, '过程噪声', 100),
		resetGapMs: integer(options.resetGapMs ?? 30000, '断点间隔', 1000, 600000),
		signalTimeoutMs: integer(options.signalTimeoutMs ?? 120000, '失联超时', 1000, 600000),
	};
}

/** 二维随机游走卡尔曼滤波，单位为米。长时间断点分段，绝不跨缺失区间连直线。 */
export class TrackFilter {
	private origin: { latitude: number; longitude: number } | null = null;
	private previous: LocationFix | null = null;
	private x = 0;
	private y = 0;
	private variance = 0;
	private segment = 0;
	readonly config;

	constructor(options: TrackOptions = {}) { this.config = trackConfig(options); }

	push(fix: LocationFix, now = Date.now()): { point: TrackPoint | null; reason: string | null } {
		const c = fix.coords;
		let reason = invalidFix(fix, now, this.config.maxAgeMs, this.config.maxAccuracyMeters);
		if (!reason && this.previous && fix.timestamp <= this.previous.timestamp) reason = '重复或乱序坐标';
		if (reason) return { point: null, reason };
		const dt = this.previous ? (fix.timestamp - this.previous.timestamp) / 1000 : 0;
		const reset = !this.origin || dt * 1000 > this.config.resetGapMs;
		if (!reset && this.previous) {
			const uncertainty = this.previous.coords.accuracy + c.accuracy;
			if (distance(this.previous.coords, c) > this.config.maxSpeedMetersPerSecond * dt + uncertainty) {
				return { point: null, reason: '不符合移动速度的轨迹跳变' };
			}
		}
		if (reset) {
			if (this.origin) this.segment++;
			this.origin = { latitude: c.latitude, longitude: c.longitude };
			this.x = 0;
			this.y = 0;
			this.variance = Math.max(c.accuracy, 0.5) ** 2;
		} else {
			const [mx, my] = project(c.latitude, c.longitude, this.origin!);
			const predicted = this.variance + (this.config.processNoiseMetersPerSecond * dt) ** 2;
			const gain = predicted / (predicted + Math.max(c.accuracy, 0.5) ** 2);
			this.x += gain * (mx - this.x);
			this.y += gain * (my - this.y);
			this.variance = (1 - gain) * predicted;
		}
		const center = unproject(this.x, this.y, this.origin!);
		this.previous = fix;
		return {
			point: { ...center, crs: 'WGS84', altitude: c.altitude !== null && Number.isFinite(c.altitude) ? c.altitude : null, timestamp: fix.timestamp, accuracy: c.accuracy, filterRadius: Math.sqrt(this.variance), segment: this.segment, raw: fix },
			reason: null,
		};
	}
}

/**
 * 前台通过 watchPosition 流记录；后台完全由原生服务采集并写 SQLite。
 * 恢复后按页重放原始坐标，使用同一 TrackFilter，JS 被挂起也不会丢失原生采样。
 */
export class TrackService {
	private state: 'idle' | 'starting' | 'foreground' | 'background' | 'stopping' = 'idle';
	private watchId: string | null = null;
	private watchdog: ReturnType<typeof setTimeout> | null = null;
	private generation = 0;
	private startPromise: Promise<void> | null = null;
	private callbacks: TrackCallbacks | null = null;
	private readonly source: LocationSource;
	private readonly background?: BackgroundBackend;
	private controller: AbortController | null = null;

	constructor(source: LocationSource, background?: BackgroundBackend) {
		this.source = source;
		this.background = background;
	}
	get running(): boolean { return this.state !== 'idle'; }

	async start(callbacks: TrackCallbacks, options: TrackOptions = {}): Promise<void> {
		if (this.running) throw new LocationError('BUSY', '已有轨迹记录正在运行。');
		const filter = new TrackFilter(options);
		const generation = ++this.generation;
		this.state = 'starting';
		this.controller = new AbortController();
		const controller = this.controller;
		this.callbacks = callbacks;
		let startupError: LocationError | null = null;
		const operation = async (): Promise<void> => {
			try {
				await waitForOperation(this.source.ensurePermission(), 60000, controller.signal);
				if (generation !== this.generation) throw new LocationError('CANCELLED', '已取消开始轨迹记录。');
				const report = (error: unknown): void => {
					const failure = locationError(error);
					if (this.state === 'starting') { startupError = failure; controller.abort(); }
					else this.fail(failure);
				};
				const resetWatchdog = (): void => {
					if (this.watchdog) clearTimeout(this.watchdog);
					this.watchdog = setTimeout(() => this.fail(new LocationError('NO_SIGNAL', '长时间未收到有效的新坐标，轨迹记录已停止。')), filter.config.signalTimeoutMs);
				};
				resetWatchdog();
				const registration = this.source.watchPosition(filter.config.intervalMs, (fix, error) => {
					if (generation !== this.generation) return;
					if (error) { report(error); return; }
					if (!fix) return;
					try {
						const result = filter.push(fix);
						if (result.point) { resetWatchdog(); callbacks.onPoint(result.point); }
						else callbacks.onRejected?.(result.reason!, fix);
					} catch (error) { report(error); }
				}).then(async id => {
					if (generation !== this.generation || controller.signal.aborted) {
						try { await this.source.clearWatch(id); }
						catch (error) {
							console.error('迟到的轨迹监听清理失败', error);
							callbacks.onError(locationError(error));
							throw error;
						}
					} else this.watchId = id;
					return id;
				});
				// 不把“调用正在注册”当作已经开始；超时/取消后迟到的原生监听由上面的 then 清理。
				const id = await waitForOperation(registration, 60000, controller.signal);
				if (generation !== this.generation) {
					throw new LocationError('CANCELLED', '已取消开始轨迹记录。');
				}
				this.watchId = id;
				this.state = 'foreground';
			} catch (error) {
				controller.abort();
				if (generation === this.generation) {
					this.generation++;
					if (this.watchdog) clearTimeout(this.watchdog);
					this.watchdog = null;
					this.callbacks = null;
					this.state = 'idle';
				}
				throw startupError ?? locationError(error);
			}
		};
		this.startPromise = operation();
		try { await this.startPromise; } finally { this.startPromise = null; }
	}

	private fail(error: LocationError): void {
		const callback = this.callbacks?.onError;
		// 错误先通知 UI；停止/取消监听失败同样报告，不悄悄吞掉。
		try { callback?.(error); }
		finally { void this.stop().catch(stopError => callback?.(locationError(stopError))); }
	}

	async stop(): Promise<void> {
		const previous = this.state;
		if (previous === 'idle') return;
		if (previous === 'stopping') throw new LocationError('BUSY', '轨迹正在停止，请等待。');
		this.state = 'stopping';
		this.generation++;
		this.controller?.abort();
		if (this.watchdog) clearTimeout(this.watchdog);
		this.watchdog = null;
		try {
			if (previous === 'background') await this.backend().stopBackgroundTrack();
			else {
				if (this.startPromise) {
					try { await this.startPromise; }
					catch (error) { if (locationError(error).code !== 'CANCELLED') throw error; }
				}
				if (this.watchId) await this.source.clearWatch(this.watchId);
			}
		} catch (error) {
			this.state = previous === 'starting' ? 'foreground' : previous;
			throw locationError(error);
		}
		this.watchId = null;
		this.callbacks = null;
		this.controller = null;
		this.state = 'idle';
	}

	private backend(): BackgroundBackend {
		if (!this.background) throw new LocationError('UNSUPPORTED', '后台轨迹仅支持安装了原生巡查插件的 Android App，浏览器不支持锁屏记录。');
		return this.background;
	}

	async startBackground(options: TrackOptions = {}): Promise<string> {
		if (this.running) throw new LocationError('BUSY', '请先停止当前轨迹记录。');
		const config = trackConfig(options);
		const backend = this.backend();
		const generation = ++this.generation;
		this.state = 'starting';
		this.controller = new AbortController();
		let sessionId: string | null = null;
		const operation = async (): Promise<void> => {
			await waitForOperation(this.source.ensurePermission(true), 60000, this.controller?.signal);
			if (generation !== this.generation) return;
			const result = await backend.startBackgroundTrack({ intervalMs: config.intervalMs });
			if (generation !== this.generation) { await backend.stopBackgroundTrack(); return; }
			sessionId = result.sessionId;
			this.state = 'background';
		};
		this.startPromise = operation();
		try {
			await this.startPromise;
			if (!sessionId) throw new LocationError('CANCELLED', '已取消开始后台巡查。');
			return sessionId;
		} catch (error) {
			if (generation === this.generation) this.state = 'idle';
			throw locationError(error);
		} finally { this.startPromise = null; }
	}

	/** 即使页面重建/通知栏已经停止服务，也能显式停止或查询原生会话。 */
	async stopBackground(): Promise<string | null> {
		if (this.state === 'starting') throw new LocationError('BUSY', '服务正在启动，请调用 stop() 取消。');
		try {
			const result = await this.backend().stopBackgroundTrack();
			if (this.state === 'background') this.state = 'idle';
			return result.sessionId;
		} catch (error) { throw locationError(error); }
	}

	async backgroundStatus() {
		try { return await this.backend().getBackgroundStatus(); }
		catch (error) { throw locationError(error); }
	}

	async listBackgroundTracks(): Promise<BackgroundTrack[]> {
		try { return (await this.backend().listBackgroundTracks()).tracks; }
		catch (error) { throw locationError(error); }
	}

	/**
	 * 调用者保留一个 TrackFilter 跨页重放；只显示原始坐标不应称为平滑轨迹。
	 * 历史重放以记录时间校验，不能拿当前时间误删锁屏期间的有效历史点。
	 */
	async readBackgroundPage(sessionId: string, afterId = 0, filter = new TrackFilter(), limit = 500): Promise<{
		points: TrackPoint[]; rejected: number; cursor: number; active: boolean; error: BackgroundPage['error'];
	}> {
		if (!sessionId.trim()) throw new LocationError('INVALID_OPTIONS', '轨迹会话编号不能为空。');
		integer(afterId, '读取游标', 0, Number.MAX_SAFE_INTEGER);
		integer(limit, '每页数量', 1, 1000);
		let page: BackgroundPage;
		try { page = await this.backend().readBackgroundTrack({ sessionId, afterId, limit }); }
		catch (error) { throw locationError(error); }
		const points: TrackPoint[] = [];
		let cursor = afterId, rejected = 0;
		for (const row of page.points) {
			if (!Number.isSafeInteger(row.id) || row.id <= cursor) throw new LocationError('STORAGE_ERROR', '本机轨迹顺序无效，无法安全重放。');
			cursor = row.id;
			const result = filter.push(row.position, row.position.timestamp);
			if (result.point) points.push(result.point);
			else rejected++;
		}
		return { points, rejected, cursor, active: page.active, error: page.error };
	}

	async deleteBackgroundTrack(sessionId: string): Promise<void> {
		try { await this.backend().deleteBackgroundTrack({ sessionId }); }
		catch (error) { throw locationError(error); }
	}
}
