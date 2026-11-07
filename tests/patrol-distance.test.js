import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';
import { distanceLabel, distanceMeters } from '../src/lib/distance.js';

test('geodesic distances handle known distances, invalid coordinates and zero', () => {
	assert.equal(distanceMeters({ latitude: 42, longitude: 90 }, { latitude: 42, longitude: 90 }), 0);
	assert.ok(Math.abs(distanceMeters({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }) - 111195) < 1);
	for (const bad of [null, '', '  ', undefined, NaN, 181, true]) {
		assert.equal(distanceMeters({ latitude: 0, longitude: bad }, { latitude: 0, longitude: 0 }), null);
	}
	assert.equal(distanceLabel(0), '约 0 米');
	assert.equal(distanceLabel(null), '无法计算');
	assert.equal(distanceLabel(1200), '约 1.2 公里');
});

async function setupSync(row, supported) {
	const uploads = [], saved = [], removed = [];
	const context = createContext({ navigator: { onLine: true }, window: { dispatchEvent() {} }, Event: class {}, Blob, crypto: { randomUUID: () => 'id' } });
	const source = await readFile(new URL('../src/lib/patrol.js', import.meta.url), 'utf8');
	const module = new SourceTextModule(source, { context });
	const stubs = {
		'./auth.js': { getUser: () => ({ id: 1 }), isLoggedIn: () => true },
		'./request.js': {
			apiRequest: async () => ({ statusCode: supported ? 200 : 404, data: supported ? { distance_meters: true } : {} }),
			apiUpload: async options => { uploads.push(options); return { statusCode: 201 }; },
			extractError: () => '请求失败',
		},
		'./patrolStore.js': {
			enqueuePending: async () => {}, listPending: async () => [row], readCache: async () => {},
			removePending: async key => removed.push(key), saveCache: async () => {}, savePending: async item => saved.push(item),
		},
	};
	await module.link(specifier => new SyntheticModule(Object.keys(stubs[specifier]), function () {
		for (const [key, value] of Object.entries(stubs[specifier])) this.setExport(key, value);
	}, { context }));
	await module.evaluate();
	return { sync: module.namespace.syncPatrols, uploads, saved, removed };
}

test('offline sync uploads measured distance only to a compatible server', async () => {
	const row = { key: '1:one', latitude: 42, longitude: 90, distance_meters: 123.45, photos: [new Blob(['x'])] };
	const ok = await setupSync(row, true);
	assert.equal((await ok.sync()).uploaded, 1);
	assert.equal(ok.uploads[0].formData.distance_meters, 123.45);
	assert.deepEqual(ok.removed, [row.key]);
	const old = await setupSync(row, false);
	assert.equal((await old.sync()).uploaded, 0);
	assert.equal(old.uploads.length, 0);
	assert.equal(old.removed.length, 0);
	assert.match(old.saved[0].error, /服务器尚不支持巡查距离/);
	const legacy = await setupSync({ ...row, distance_meters: undefined }, false);
	assert.equal((await legacy.sync()).uploaded, 1);
});
