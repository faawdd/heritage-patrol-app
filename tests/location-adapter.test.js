import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';
import ts from 'typescript';

const files = await Promise.all(['capacitor.ts', 'types.ts'].map(name => readFile(new URL(`../src/lib/location/${name}`, import.meta.url), 'utf8')));

async function setup({ android = true, available = true, fine = true, notifications = true, enabled = true, foreground = true } = {}) {
	const calls = [];
	let callback;
	const native = {
		checkPermissions: async () => ({ location: fine ? 'granted' : 'denied', coarseLocation: 'granted', notifications: notifications ? 'granted' : 'prompt' }),
		requestPermissions: async options => { calls.push(['request', options.permissions]); return native.checkPermissions(); },
		checkReady: async () => ({ enabled, precise: fine, foreground }),
		watchPosition: async (_options, handler) => { callback = handler; return 'transport-id'; },
		clearWatch: async options => { calls.push(['native.clear', options.id]); },
	};
	const geolocation = {
		checkPermissions: async () => { throw new Error('不应查询Google或Web权限'); },
		requestPermissions: async () => { throw new Error('不应申请Google或Web权限'); },
		watchPosition: async (options, handler) => { calls.push(['web.watch', options]); callback = handler; return 'web-id'; },
		clearWatch: async options => { calls.push(['web.clear', options.id]); },
	};
	const context = createContext({ setTimeout, clearTimeout, console });
	const modules = new Map();
	const module = (name, source) => {
		const result = new SourceTextModule(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText, { context });
		modules.set(name, result);
		return result;
	};
	module('./types.ts', files[1]);
	const source = module('adapter', files[0]);
	const stubs = {
		'@capacitor/core': {
			Capacitor: { getPlatform: () => android ? 'android' : 'web', isNativePlatform: () => android, isPluginAvailable: () => available },
			registerPlugin: () => native,
		},
		'@capacitor/geolocation': { Geolocation: geolocation },
	};
	await source.link(specifier => {
		if (modules.has(specifier)) return modules.get(specifier);
		const values = stubs[specifier];
		assert.ok(values, `未预期的导入${specifier}`);
		return new SyntheticModule(Object.keys(values), function() {
			for (const [key, value] of Object.entries(values)) this.setExport(key, value);
		}, { context });
	});
	await source.evaluate();
	return { source: source.namespace.locationSource, background: source.namespace.backgroundBackend, calls, native, emit: (...args) => callback(...args) };
}

test('precise Android permission never routes through Google', async () => {
	const { source, background } = await setup();
	await source.ensurePermission();
	assert.ok(background);
});

test('high accuracy rejects approximate-only access after requesting an upgrade', async () => {
	const { source, calls } = await setup({ fine: false });
	await assert.rejects(source.ensurePermission(), { code: 'PRECISE_REQUIRED' });
	assert.deepEqual(Array.from(calls[0][1]), ['location']);
});

test('background requires notification permission, visible Activity and enabled GPS', async () => {
	await assert.rejects((await setup({ notifications: false })).source.ensurePermission(true), { code: 'NOTIFICATION_PERMISSION' });
	await assert.rejects((await setup({ foreground: false })).source.ensurePermission(true), { code: 'FOREGROUND_REQUIRED' });
	await assert.rejects((await setup({ enabled: false })).source.ensurePermission(), { code: 'LOCATION_DISABLED' });
});

test('native watch waits for native acknowledgement instead of using Capacitor transport id', async () => {
	const { source, emit, calls } = await setup();
	let resolved = false;
	const positions = [];
	const promise = source.watchPosition(1000, fix => positions.push(fix)).then(id => { resolved = true; return id; });
	await Promise.resolve();
	assert.equal(resolved, false);
	emit({ id: 'native-id' });
	const id = await promise;
	assert.equal(id, 'native-id');
	const position = { timestamp: Date.now(), coords: { latitude: 42, longitude: 90, accuracy: 3, altitude: null, speed: null, heading: null } };
	emit({ id, position });
	assert.deepEqual(positions, [position]);
	await source.clearWatch(id);
	assert.deepEqual(calls, [['native.clear', 'native-id']]);
});

test('native early watch errors reject and clean native registration', async () => {
	const { source, emit, calls } = await setup();
	const promise = source.watchPosition(1000, () => {});
	emit({ id: 'failed-id', error: { code: 'LOCATION_DISABLED', message: 'GPS off' } });
	await assert.rejects(promise, { code: 'LOCATION_DISABLED' });
	assert.deepEqual(calls, [['native.clear', 'failed-id']]);
});

test('native errors after acknowledgement go to the watch error callback', async () => {
	const { source, emit } = await setup();
	const errors = [];
	const promise = source.watchPosition(1000, (_fix, error) => { if (error) errors.push(error); });
	emit({ id: 'native-id' });
	await promise;
	emit({ id: 'native-id', error: { code: 'NO_SIGNAL', message: 'GPS no signal' } });
	assert.equal(errors[0].code, 'NO_SIGNAL');
});

test('Android missing the native plugin fails explicitly, browser still uses watchPosition', async () => {
	const missing = await setup({ available: false });
	await assert.rejects(missing.source.ensurePermission(), { code: 'UNSUPPORTED' });
	await assert.rejects(missing.source.watchPosition(1000, () => {}), { code: 'UNSUPPORTED' });
	const web = await setup({ android: false });
	await web.source.ensurePermission();
	assert.equal(await web.source.watchPosition(1000, () => {}), 'web-id');
	assert.equal(web.calls[0][1].enableHighAccuracy, true);
	assert.equal(web.calls[0][1].maximumAge, 0);
	await web.source.clearWatch('web-id');
	assert.equal(web.calls[1][0], 'web.clear');
	assert.equal(web.background, undefined);
});
