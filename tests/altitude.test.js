import test from 'node:test';
import assert from 'node:assert/strict';
import { collectHardwareAltitude, pressureAltitude } from '../src/lib/altitude.js';
import { DEFAULT_ALTITUDE_SETTINGS, loadAltitudeSettings, saveAltitudeSettings } from '../src/lib/altitude-settings.js';

function readers(gpsValues, pressures) {
	let gpsIndex = 0;
	let pressureIndex = 0;
	const requests = [];
	return {
		requests,
		async getGpsLocation(options) {
			requests.push(options);
			const value = gpsValues[gpsIndex++];
			if (value instanceof Error) throw value;
			return value;
		},
		async getPressure() {
			const value = pressures[pressureIndex++];
			if (value instanceof Error) throw value;
			return value;
		},
	};
}

const position = (altitude, timestamp) => ({ longitude: 90, latitude: 43, altitude, timestamp });
const settings = (overrides = {}) => ({ ...DEFAULT_ALTITUDE_SETTINGS, ...overrides });

test('默认多次采样后各来源等权平均，并请求更新的 GPS 定位', async () => {
	const sensor = readers([position(100, 1), position(200, 2), position(300, 3)], [1013.25, 1013.25, 1013.25]);
	const result = await collectHardwareAltitude(settings(), sensor);
	assert.equal(result.altitude, 100);
	assert.match(result.sourceTag, /GPS 200\.00m/);
	assert.match(result.sourceTag, /气压估算 0\.00m/);
	assert.deepEqual(sensor.requests.map((request) => request.newerThanTimestamp), [null, 1, 2]);
	assert.ok(sensor.requests.every((request) => request.useLastKnown === false));
});

test('中位数按来源分别处理，之后仍对两种来源等权平均', async () => {
	const sensor = readers([position(10, 1), position(20, 2), position(900, 3)], [1013.25, 1013.25, 1013.25]);
	const result = await collectHardwareAltitude(settings({ method: 'median' }), sensor);
	assert.equal(result.altitude, 10);
	assert.match(result.sourceTag, /中位数/);
});

test('无气压计时只使用有效 GPS 海拔并提示缺失', async () => {
	const sensor = readers([position(0, 1), position(20, 2), position(null, 3)], [null, null, null]);
	const result = await collectHardwareAltitude(settings(), sensor);
	assert.equal(result.altitude, 10);
	assert.match(result.sourceTag, /气压计有效 0\/3/);
	assert.match(result.sourceTag, /GPS 有效 2\/3/);
});

test('气压计单独模式不使用 GPS 海拔，参考气压会影响估算', async () => {
	const sensor = readers([position(800, 1), position(900, 2)], [1000, 1000]);
	const result = await collectHardwareAltitude(settings({ source: 'barometer', sampleCount: 2, seaLevelPressure: 1000 }), sensor);
	assert.equal(result.altitude, 0);
	assert.doesNotMatch(result.sourceTag, /GPS 8/);
	assert.equal(pressureAltitude(null, 1000), null);
	assert.equal(pressureAltitude(0, 1000), null);
	assert.ok(pressureAltitude(1000, 1013.25) > 0);
});

test('仅 GPS 模式不读取气压计；双来源中 GPS 无效时使用气压计', async () => {
	const gpsOnly = readers([position(50, 1), position(70, 2)], []);
	const result = await collectHardwareAltitude(settings({ source: 'gps', sampleCount: 2 }), gpsOnly);
	assert.equal(result.altitude, 60);
	assert.doesNotMatch(result.sourceTag, /气压计/);
	const barometer = readers([position(null, 1), position(null, 2)], [1013.25, 1013.25]);
	const fallback = await collectHardwareAltitude(settings({ sampleCount: 2 }), barometer);
	assert.equal(fallback.altitude, 0);
	assert.match(fallback.sourceTag, /GPS 有效 0\/2/);
});

test('重复定位不会计为新 GPS 样本，传感器错误会提示', async () => {
	const sensor = readers([position(100, 1), position(900, 1), new Error('timeout')], [new Error('pressure'), null, null]);
	const result = await collectHardwareAltitude(settings(), sensor);
	assert.equal(result.altitude, 100);
	assert.match(result.sourceTag, /GPS 返回重复定位/);
	assert.match(result.sourceTag, /气压计读取失败/);
	assert.match(result.sourceTag, /部分 GPS 定位失败/);
});

test('无有效海拔时返回空值，首次定位失败明确报错', async () => {
	const sensor = readers([position(null, 1), position(null, 2)], [null, null]);
	assert.equal((await collectHardwareAltitude(settings({ sampleCount: 2 }), sensor)).altitude, null);
	await assert.rejects(collectHardwareAltitude(settings({ sampleCount: 2 }), readers([new Error('定位失败')], [null])), /定位失败/);
});

test('设置保存与读取、非法值和存储失败', () => {
	let value = null;
	globalThis.window = { localStorage: { getItem: () => value, setItem: (_key, data) => { value = data; } } };
	assert.deepEqual(loadAltitudeSettings(), DEFAULT_ALTITUDE_SETTINGS);
	saveAltitudeSettings(settings({ source: 'gps', sampleCount: 5, seaLevelPressure: 1000 }));
	assert.equal(loadAltitudeSettings().sampleCount, 5);
	assert.equal(loadAltitudeSettings().source, 'gps');
	assert.throws(() => saveAltitudeSettings(settings({ seaLevelPressure: '' })), /气压/);
	assert.throws(() => saveAltitudeSettings(settings({ source: 'dem' })), /来源/);
	value = '{';
	assert.throws(() => loadAltitudeSettings(), /无法读取/);
	window.localStorage.setItem = () => { throw new Error('存储失败'); };
	assert.throws(() => saveAltitudeSettings(settings()), /存储失败/);
	delete globalThis.window;
});
