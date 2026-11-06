import { averageFixes, distance, invalidFix } from './geo.ts';
import { LocationError, integer, locationError, positive, waitForOperation } from './types.ts';
import type { LocationFix, LocationSource, SamplingOptions, SurveyPoint } from './types.ts';

/** 单次采样锁：同一实例不可并发打点；可取消，所有退出路径都会清除定位监听。 */
export class HighAccuracyLocationService {
	private busy = false;
	private readonly source: LocationSource;
	constructor(source: LocationSource) { this.source = source; }

	async collect(options: SamplingOptions = {}): Promise<SurveyPoint> {
		if (this.busy) throw new LocationError('BUSY', '正在采集坐标，请等待或取消当前采样。');
		const config = {
			count: integer(options.sampleCount ?? 10, '样本数量', 2, 1000),
			accuracy: positive(options.maxAccuracyMeters ?? 5, '精度阈值', 1000),
			timeout: integer(options.timeoutMs ?? 60000, '单次超时', 100, 600000),
			retries: integer(options.retries ?? 1, '重试次数', 0, 5),
			delay: integer(options.retryDelayMs ?? 1500, '重试间隔', 0, 30000),
			interval: integer(options.intervalMs ?? 1000, '采样间隔', 100, 60000),
			maxAge: integer(options.maxAgeMs ?? 3000, '有效时间', 100, 60000),
			radius: positive(options.maxStationaryRadiusMeters ?? 10, '静止半径', 1000),
			speed: positive(options.maxStationarySpeedMetersPerSecond ?? 0.8, '静止速度阈值', 20),
			method: options.average ?? 'weighted',
		};
		if (!['weighted', 'arithmetic'].includes(config.method)) throw new LocationError('INVALID_OPTIONS', '不支持的平均算法。');
		this.busy = true;
		try {
			this.checkAbort(options.signal);
			await waitForOperation(this.source.ensurePermission(), config.timeout, options.signal);
			this.checkAbort(options.signal);
			for (let attempt = 1; attempt <= config.retries + 1; attempt++) {
				try {
					return await this.sample(config, options, attempt);
				} catch (error) {
					const failure = locationError(error);
					// 只重试信号不足造成的超时，不重试拒权、关闭 GPS、存储或调用错误。
					if (failure.code !== 'TIMEOUT' || attempt > config.retries) throw failure;
					await this.pause(config.delay, options.signal);
				}
			}
			throw new LocationError('TIMEOUT', '采样超时。');
		} finally {
			this.busy = false;
		}
	}

	private checkAbort(signal?: AbortSignal): void {
		if (signal?.aborted) throw new LocationError('CANCELLED', '已取消坐标采集。');
	}

	private pause(ms: number, signal?: AbortSignal): Promise<void> {
		this.checkAbort(signal);
		return new Promise((resolve, reject) => {
			const abort = (): void => { clearTimeout(timer); signal?.removeEventListener('abort', abort); reject(new LocationError('CANCELLED', '已取消坐标采集。')); };
			const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
			signal?.addEventListener('abort', abort, { once: true });
		});
	}

	private async sample(
		config: { count: number; accuracy: number; timeout: number; interval: number; maxAge: number; radius: number; speed: number; method: 'weighted' | 'arithmetic' },
		options: SamplingOptions, attempt: number,
	): Promise<SurveyPoint> {
		const accepted: LocationFix[] = [];
		let rejected = 0, lastTimestamp = 0, finished = false, watchId: string | undefined;
		let timer: ReturnType<typeof setTimeout> | undefined;
		let abort: (() => void) | undefined;
		const startedAt = Date.now();
		try {
			return await new Promise<SurveyPoint>((resolve, reject) => {
				const fail = (error: unknown): void => { if (!finished) { finished = true; reject(locationError(error)); } };
				abort = () => fail(new LocationError('CANCELLED', '已取消坐标采集。'));
				options.signal?.addEventListener('abort', abort, { once: true });
				if (options.signal?.aborted) { abort(); return; }
				timer = setTimeout(() => fail(new LocationError('TIMEOUT', `采样超时：只获得 ${accepted.length}/${config.count} 个精度 ≤${config.accuracy} 米的有效样本，请在开阔处保持静止重试。`)), config.timeout);
				const progress = (fix: LocationFix | null, reason: string | null): void => {
					const accuracy = fix?.coords.accuracy;
					options.onProgress?.({ attempt, accepted: accepted.length, rejected, target: config.count, lastAccuracy: accuracy != null && Number.isFinite(accuracy) && accuracy > 0 ? accuracy : null, reason });
				};
				try { progress(null, null); } catch (error) { fail(error); return; }
				this.source.watchPosition(config.interval, (fix, error) => {
					if (finished) return;
					if (error) { fail(error); return; }
					if (!fix) return;
					try {
						let reason = invalidFix(fix, Date.now(), config.maxAge, config.accuracy);
						if (!reason && fix.coords.speed != null && Number.isFinite(fix.coords.speed) && fix.coords.speed > config.speed) reason = '检测到移动，请停稳后采样';
						if (!reason && (fix.timestamp < startedAt || fix.timestamp - lastTimestamp < config.interval)) reason = '历史或重复样本';
						if (!reason && accepted.length && distance(averageFixes(accepted, config.method, rejected), fix.coords) > config.radius) reason = '点位跳变或正在移动，请保持静止';
						if (reason) rejected++;
						else { accepted.push(fix); lastTimestamp = fix.timestamp; }
						progress(fix, reason);
						if (accepted.length === config.count) {
							const result = averageFixes(accepted, config.method, rejected);
							finished = true;
							resolve(result);
						}
					} catch (error) { fail(error); }
				}).then(id => {
					if (finished) {
						// 超时可能先于原生注册完成；迟到的监听也必须清理。
						return this.source.clearWatch(id).catch(error => console.error('迟到的采样监听清理失败', error));
					}
					watchId = id;
				}).catch(fail);
			});
		} finally {
			finished = true;
			if (timer) clearTimeout(timer);
			if (abort) options.signal?.removeEventListener('abort', abort);
			if (watchId) await this.source.clearWatch(watchId);
		}
	}
}
