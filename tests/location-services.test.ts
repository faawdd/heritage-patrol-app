import assert from 'node:assert/strict';
import test from 'node:test';
import { HighAccuracyLocationService } from '../src/lib/location/HighAccuracyLocationService.ts';
import { TrackFilter, TrackService } from '../src/lib/location/TrackService.ts';
import { averageFixes, distance, invalidFix } from '../src/lib/location/geo.ts';
import { LocationError, locationError } from '../src/lib/location/types.ts';
import type { BackgroundBackend, LocationFix, LocationSource, TrackPoint } from '../src/lib/location/types.ts';

const tick = (): Promise<void> => new Promise(resolve => setImmediate(resolve));
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
function fix(timestamp = Date.now(), accuracy = 3, longitude = 90, latitude = 42): LocationFix {
	return { timestamp, coords: { latitude, longitude, accuracy, altitude: 0, altitudeAccuracy: 4, speed: 0, heading: null } };
}

class FakeSource implements LocationSource {
	callback: ((fix: LocationFix | null, error?: unknown) => void) | null = null;
	cleared: string[] = [];
	watches = 0;
	permissions = 0;
	permissionError: unknown = null;
	registrationDelay = 0;
	permissionPromise: Promise<void> | null = null;
	async ensurePermission(): Promise<void> {
		this.permissions++;
		if (this.permissionError) throw this.permissionError;
		if (this.permissionPromise) await this.permissionPromise;
	}
	async watchPosition(_interval: number, callback: (fix: LocationFix | null, error?: unknown) => void): Promise<string> {
		this.callback = callback;
		const id = String(++this.watches);
		if (this.registrationDelay) await sleep(this.registrationDelay);
		return id;
	}
	async clearWatch(id: string): Promise<void> { this.cleared.push(id); this.callback = null; }
	emit(value: LocationFix): void { this.callback?.(value); }
}

test('defaults require exactly 10 fresh samples, reject >5m and report progress without fabricated accuracy', async () => {
	const source = new FakeSource();
	const progress: number[] = [];
	const promise = new HighAccuracyLocationService(source).collect({ intervalMs: 100, retries: 0, onProgress: p => progress.push(p.accepted) });
	await tick();
	const now = Date.now() + 10;
	source.emit(fix(now, 5.01));
	for (let i = 0; i < 10; i++) source.emit(fix(now + i * 100, i === 0 ? 5 : 3, 90 + i * 0.000001));
	const result = await promise;
	assert.equal(result.sampleCount, 10);
	assert.equal(result.rejectedCount, 1);
	assert.equal(result.bestAccuracyRadius, 3);
	assert.equal(result.accuracy, 5);
	assert.equal(result.altitude, 0, '海拔0是合法的海平面读数');
	assert.equal(result.timestamp, now + 900);
	assert.equal(result.crs, 'WGS84');
	assert.equal(progress.at(-1), 10);
	assert.deepEqual(source.cleared, ['1']);
	assert.ok(result.longitude > 90 && result.longitude < 90.000009);
});

test('weighted and arithmetic averages, dateline crossing and unknown altitude', () => {
	const a = fix(100, 1, 179.99999);
	const b = fix(200, 3, -179.99999);
	a.coords.altitude = b.coords.altitude = null;
	const weighted = averageFixes([a, b], 'weighted', 0);
	const arithmetic = averageFixes([a, b], 'arithmetic', 0);
	assert.ok(distance(weighted, a.coords) < distance(arithmetic, a.coords));
	assert.ok(Math.abs(arithmetic.longitude) > 179.99, '不能平均到经度0');
	assert.equal(weighted.altitude, null);
	assert.equal(weighted.altitudeAccuracy, null);
});

test('altitude uses vertical accuracy, never horizontal accuracy or an invented zero', () => {
	const a = fix(100, 1), b = fix(200, 5);
	a.coords.altitude = 10; a.coords.altitudeAccuracy = 1;
	b.coords.altitude = 20; b.coords.altitudeAccuracy = 2;
	assert.equal(averageFixes([a, b], 'weighted', 0).altitude, 12);
	b.coords.altitudeAccuracy = null;
	const unknown = averageFixes([a, b], 'weighted', 0);
	assert.equal(unknown.altitude, 15);
	assert.equal(unknown.altitudeAccuracy, null);
});

test('stationary mean cancels symmetric random noise but does not claim to cancel systematic bias', () => {
	const metersPerDegree = 111195.08 * Math.cos(42 * Math.PI / 180);
	const samples = Array.from({ length: 10 }, (_, i) => fix(100 + i * 1000, 3, 90 + (i % 2 ? 2 : -2) / metersPerDegree));
	const point = averageFixes(samples, 'weighted', 0);
	assert.ok(distance(point, { latitude: 42, longitude: 90 }) < 0.02);
	assert.equal(point.accuracy, 3);
	assert.equal(point.bestAccuracyRadius, 3);
	const biased = averageFixes(samples.map(sample => ({ ...sample, coords: { ...sample.coords, longitude: sample.coords.longitude + 4 / metersPerDegree } })), 'weighted', 0);
	assert.ok(distance(biased, { latitude: 42, longitude: 90 }) > 3.9, '系统偏差不会因为平均就消失');
});

test('rejects duplicate, stale, future, mocked, invalid accuracy and movement samples', async () => {
	const source = new FakeSource();
	const reasons: string[] = [];
	const promise = new HighAccuracyLocationService(source).collect({ sampleCount: 2, intervalMs: 100, retries: 0, onProgress: p => { if (p.reason) reasons.push(p.reason); } });
	await tick();
	const now = Date.now() + 10;
	source.emit(fix(now));
	source.emit(fix(now));
	source.emit(fix(now - 10000));
	source.emit(fix(now + 100000));
	source.emit({ ...fix(now + 100), mocked: true });
	source.emit(fix(now + 100, 0));
	source.emit(fix(now + 100, NaN));
	source.emit(fix(now + 100, 3, 91));
	const moving = fix(now + 100);
	moving.coords.speed = 1.5;
	source.emit(moving);
	source.emit(fix(now + 100, 3, 90.000001));
	const result = await promise;
	assert.equal(result.sampleCount, 2);
	assert.equal(result.rejectedCount, 8);
	assert.equal(reasons.length, 8);
});

test('bounded retry resets samples and always clears listeners', async () => {
	const source = new FakeSource();
	const attempts: number[] = [];
	const promise = new HighAccuracyLocationService(source).collect({ sampleCount: 2, timeoutMs: 100, intervalMs: 100, retries: 1, retryDelayMs: 0, onProgress: p => attempts.push(p.attempt) });
	await assert.rejects(promise, error => error instanceof LocationError && error.code === 'TIMEOUT' && /0\/2/.test(error.message));
	assert.equal(source.watches, 2);
	assert.deepEqual(source.cleared, ['1', '2']);
	assert.deepEqual(attempts, [1, 2]);
});

test('permission denial is not retried and does not open hardware', async () => {
	const source = new FakeSource();
	source.permissionError = new LocationError('PERMISSION_DENIED', '权限拒绝');
	await assert.rejects(new HighAccuracyLocationService(source).collect(), { code: 'PERMISSION_DENIED' });
	assert.equal(source.permissions, 1);
	assert.equal(source.watches, 0);
});

test('abort during an unresolved permission dialog completes promptly', async () => {
	const source = new FakeSource();
	source.permissionPromise = new Promise(() => {});
	const abort = new AbortController();
	const promise = new HighAccuracyLocationService(source).collect({ signal: abort.signal });
	abort.abort();
	await assert.rejects(promise, { code: 'CANCELLED' });
	assert.equal(source.watches, 0);
});

test('abort, concurrent guard and late registration cleanup', async () => {
	const source = new FakeSource();
	source.registrationDelay = 30;
	const service = new HighAccuracyLocationService(source);
	const abort = new AbortController();
	const promise = service.collect({ signal: abort.signal });
	await tick();
	await assert.rejects(service.collect(), { code: 'BUSY' });
	abort.abort();
	await assert.rejects(promise, { code: 'CANCELLED' });
	await sleep(50);
	assert.deepEqual(source.cleared, ['1']);
});

test('invalid config fails before permissions; zero and NaN accuracy are never trusted', async () => {
	const source = new FakeSource();
	for (const options of [{ sampleCount: 1 }, { retries: -1 }, { maxAccuracyMeters: NaN }, { timeoutMs: Infinity }]) {
		await assert.rejects(new HighAccuracyLocationService(source).collect(options), { code: 'INVALID_OPTIONS' });
	}
	assert.equal(source.permissions, 0);
	assert.ok(invalidFix(fix(Date.now(), 0), Date.now(), 5000, 5));
});

test('progress exceptions and watch errors propagate while cleaning listeners', async () => {
	const source = new FakeSource();
	const promise = new HighAccuracyLocationService(source).collect({ onProgress: p => { if (p.accepted) throw new Error('UI failed'); } });
	await tick();
	source.emit(fix(Date.now() + 10));
	await assert.rejects(promise, /UI failed/);
	assert.deepEqual(source.cleared, ['1']);
	const second = new HighAccuracyLocationService(source).collect();
	await tick();
	source.callback?.(null, new LocationError('LOCATION_DISABLED', 'GPS关闭'));
	await assert.rejects(second, { code: 'LOCATION_DISABLED' });
	assert.deepEqual(source.cleared, ['1', '2']);
});

test('Kalman smooths metre-space noise and rejects jumps, poor accuracy and duplicate times', () => {
	const filter = new TrackFilter();
	const now = Date.now();
	const first = filter.push(fix(now, 3));
	assert.ok(first.point);
	const next = filter.push(fix(now + 1000, 3, 90.00001), now + 1000);
	assert.ok(next.point);
	assert.ok(next.point.longitude > 90 && next.point.longitude < 90.00001);
	assert.equal(next.point.raw.coords.longitude, 90.00001);
	assert.equal(next.point.accuracy, 3);
	assert.equal(filter.push(fix(now + 2000, 3, 91), now + 2000).point, null);
	assert.equal(filter.push(fix(now + 2000, 21), now + 2000).point, null);
	assert.equal(filter.push(fix(now + 1000), now + 2000).point, null);
});

test('long GPS gaps create separate segments instead of joining missed route', () => {
	const filter = new TrackFilter();
	const now = Date.now();
	assert.equal(filter.push(fix(now)).point?.segment, 0);
	const resumed = filter.push(fix(now + 40000, 3, 91), now + 40000).point;
	assert.equal(resumed?.segment, 1);
	assert.equal(resumed?.longitude, 91);
});

test('deterministic walking route has at least 30 percent lower noise RMS after warmup', () => {
	const filter = new TrackFilter();
	const start = Date.now() - 120000;
	const metersPerDegree = 111195.08 * Math.cos(42 * Math.PI / 180);
	let rawSquare = 0, filteredSquare = 0, count = 0;
	for (let i = 0; i < 100; i++) {
		const truth = { latitude: 42, longitude: 90 + i * 0.6 / metersPerDegree };
		const input = fix(start + i * 1000, 3, truth.longitude + (i % 2 ? 2 : -2) / metersPerDegree);
		const point = filter.push(input, input.timestamp).point!;
		if (i >= 10) {
			rawSquare += distance(truth, input.coords) ** 2;
			filteredSquare += distance(truth, point) ** 2;
			count++;
		}
	}
	const ratio = Math.sqrt(filteredSquare / count) / Math.sqrt(rawSquare / count);
	assert.ok(ratio < 0.7, `平滑后/原始RMSE比值为 ${ratio}，应小于0.7`);
});

test('track errors stop foreground watching and expose errors to UI', async () => {
	const source = new FakeSource();
	const points: TrackPoint[] = [];
	const failures: string[] = [];
	const track = new TrackService(source);
	await track.start({ onPoint: value => points.push(value), onError: error => failures.push(error.code) });
	source.emit(fix());
	source.callback?.(null, new LocationError('LOCATION_DISABLED', 'GPS关闭'));
	await tick();
	assert.equal(points.length, 1);
	assert.deepEqual(failures, ['LOCATION_DISABLED']);
	assert.deepEqual(source.cleared, ['1']);
	assert.equal(track.running, false);
});

test('stop while requesting permissions cancels foreground start', async () => {
	const source = new FakeSource();
	source.permissionPromise = new Promise(() => {});
	const track = new TrackService(source);
	const start = track.start({ onPoint: () => {}, onError: () => {} });
	const rejection = assert.rejects(start, { code: 'CANCELLED' });
	await track.stop();
	await rejection;
	assert.equal(track.running, false);
	assert.equal(source.watches, 0);
});

test('failure during watch registration rejects startup rather than reporting success', async () => {
	const source = new FakeSource();
	source.watchPosition = async (_interval, callback) => {
		callback(null, new LocationError('LOCATION_DISABLED', 'GPS关闭'));
		return 'early-error';
	};
	const track = new TrackService(source);
	await assert.rejects(track.start({ onPoint: () => {}, onError: () => {} }), { code: 'LOCATION_DISABLED' });
	await tick();
	assert.equal(track.running, false);
	assert.deepEqual(source.cleared, ['early-error']);
});

test('stop during a late foreground registration cleans the eventual watch', async () => {
	const source = new FakeSource();
	source.registrationDelay = 30;
	const track = new TrackService(source);
	const start = track.start({ onPoint: () => {}, onError: () => {} });
	const rejected = assert.rejects(start, { code: 'CANCELLED' });
	await tick();
	await track.stop();
	await rejected;
	await sleep(50);
	assert.equal(track.running, false);
	assert.deepEqual(source.cleared, ['1']);
});

function fakeBackground(rows: { id: number; position: LocationFix }[]): BackgroundBackend {
	let active = false;
	return {
		startBackgroundTrack: async () => { active = true; return { sessionId: 'test-session' }; },
		stopBackgroundTrack: async () => { active = false; return { sessionId: 'test-session' }; },
		getBackgroundStatus: async () => ({ sessionId: active ? 'test-session' : null, error: null }),
		listBackgroundTracks: async () => ({ tracks: [{ sessionId: 'test-session', startedAt: 1000, stoppedAt: active ? null : 2000, error: null }] }),
		readBackgroundTrack: async ({ afterId, limit }) => ({ points: rows.filter(row => row.id > afterId).slice(0, limit), active, error: null }),
		deleteBackgroundTrack: async () => { if (active) throw new LocationError('BUSY', '不能删除正在记录的轨迹'); },
	};
}

test('background persistence interface supports resume, page replay and explicit stop/delete', async () => {
	const old = Date.now() - 3600000;
	const rows = [{ id: 1, position: fix(old) }, { id: 2, position: fix(old + 1000, 30) }, { id: 3, position: fix(old + 2000, 3, 90.00001) }];
	const source = new FakeSource();
	const background = fakeBackground(rows);
	const track = new TrackService(source, background);
	assert.equal(await track.startBackground(), 'test-session');
	assert.equal(source.watches, 0, '后台不得依赖JavaScript监听');
	await assert.rejects(track.deleteBackgroundTrack('test-session'), { code: 'BUSY' });
	const filter = new TrackFilter();
	const first = await track.readBackgroundPage('test-session', 0, filter, 2);
	assert.equal(first.points.length, 1);
	assert.equal(first.rejected, 1);
	assert.equal(first.cursor, 2);
	const next = await track.readBackgroundPage('test-session', first.cursor, filter, 2);
	assert.equal(next.points.length, 1);
	assert.equal(next.cursor, 3);
	assert.ok(next.points[0]!.longitude < 90.00001, '分页使用同一滤波状态');
	await track.stop();
	assert.equal((await track.backgroundStatus()).sessionId, null);
	await track.deleteBackgroundTrack('test-session');
});

test('background startup cancelled during permission check does not launch service', async () => {
	const source = new FakeSource();
	source.permissionPromise = new Promise(() => {});
	const background = fakeBackground([]);
	const track = new TrackService(source, background);
	const start = track.startBackground();
	const rejected = assert.rejects(start, { code: 'CANCELLED' });
	await track.stop();
	await rejected;
	assert.equal((await background.getBackgroundStatus()).sessionId, null);
	assert.equal(track.running, false);
});

test('background unsupported and bad paging options fail explicitly', async () => {
	const track = new TrackService(new FakeSource());
	await assert.rejects(track.startBackground(), { code: 'UNSUPPORTED' });
	await assert.rejects(track.readBackgroundPage('', 0), { code: 'INVALID_OPTIONS' });
	await assert.rejects(track.readBackgroundPage('x', -1), { code: 'INVALID_OPTIONS' });
});

test('native foreground service failures have friendly error codes/messages', () => {
	for (const [native, expected] of [
		['START_TIMEOUT', 'TIMEOUT'],
		['INVALID_ARGUMENT', 'INVALID_OPTIONS'],
		['INTERRUPTED', 'INTERRUPTED'],
		['PROVIDER_DISABLED', 'LOCATION_DISABLED'],
		['LOCATION_CLEANUP_FAILED', 'UNAVAILABLE'],
		['FOREGROUND_START_FAILED', 'UNAVAILABLE'],
		['NOT_FOUND', 'UNAVAILABLE'],
	]) {
		const error = locationError({ code: native, message: 'native failure' });
		assert.equal(error.code, expected);
		assert.ok(!error.message.includes('native failure'));
	}
});
