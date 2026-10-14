import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';

const source = await readFile(new URL('../src/lib/native.js', import.meta.url), 'utf8');

async function setup({ android = true, available = true, permission = 'granted', error = null } = {}) {
	const calls = [];
	const warnings = [];
	const coords = { latitude: 42.8, longitude: 90.2, altitude: 120, accuracy: 15, timestamp: 123 };
	const permissions = {
		location: permission,
		coarseLocation: permission === 'coarse' ? 'granted' : permission,
	};
	const native = {
		checkPermissions: async () => { calls.push('native.check'); return permissions; },
		requestPermissions: async options => { calls.push(['native.request', options]); return { location: 'granted' }; },
		getLocation: async options => {
			calls.push(['native.location', options]);
			if (error) throw error;
			return { ...coords, provider: 'gps', cached: false, stale: false };
		},
	};
	const geolocation = {
		checkPermissions: async () => { calls.push('geo.check'); return permissions; },
		requestPermissions: async options => { calls.push(['geo.request', options]); return { location: 'granted' }; },
		getCurrentPosition: async options => {
			calls.push(['geo.location', options]);
			if (error) throw error;
			return { coords, timestamp: coords.timestamp };
		},
	};
	const core = {
		Capacitor: {
			isNativePlatform: () => android,
			getPlatform: () => android ? 'android' : 'web',
			isPluginAvailable: () => available,
		},
		registerPlugin: () => native,
	};
	const stubs = {
		'@capacitor/core': core,
		'@capacitor/geolocation': { Geolocation: geolocation },
		'@capacitor/app': { App: {} },
		'@capacitor/camera': { Camera: {}, CameraResultType: {}, CameraSource: {} },
		'@capacitor/clipboard': { Clipboard: {} },
		'@capacitor/filesystem': { Directory: {}, Filesystem: {} },
		'@capacitor-community/file-opener': { FileOpener: {} },
		'@capacitor/haptics': { Haptics: {}, ImpactStyle: {}, NotificationType: {} },
		'./ui.js': { previewImages: () => {} },
		'./auth.js': { getAuthHeader: () => ({}) },
	};
	const context = createContext({ console: { warn: (...args) => warnings.push(args) } });
	const module = new SourceTextModule(source, { context });
	await module.link(specifier => {
		const values = stubs[specifier];
		assert.ok(values, `Unexpected import: ${specifier}`);
		return new SyntheticModule(Object.keys(values), function() {
			for (const [key, value] of Object.entries(values)) this.setExport(key, value);
		}, { context });
	});
	await module.evaluate();
	return { getLocation: module.namespace.getLocation, native, calls, warnings };
}

test('Android uses native permission checks and high-accuracy cold-start budget', async () => {
	const { getLocation, calls } = await setup();
	const location = await getLocation();
	assert.equal(location.latitude, 42.8);
	assert.equal(location.longitude, 90.2);
	assert.equal(location.provider, 'gps');
	assert.equal(location.stale, false);
	assert.equal(calls[0], 'native.check');
	assert.equal(calls[1][0], 'native.location');
	assert.equal(calls[1][1].timeout, 60000);
	assert.equal(calls[1][1].desiredAccuracy, 50);
	assert.equal(calls[1][1].maximumAge, 30000);
	assert.equal(calls.length, 2);
});

test('explicit collection timeouts and approximate permission remain supported', async () => {
	const { getLocation, calls } = await setup({ permission: 'coarse' });
	await getLocation({ timeout: 6000, highAccuracy: false, maximumAge: 0 });
	assert.equal(calls[1][1].timeout, 6000);
	assert.equal(calls[1][1].desiredAccuracy, 500);
	assert.equal(calls[1][1].maximumAge, 0);
	assert.equal(calls.length, 2);
});

test('native permission request asks for fine and coarse together via location alias', async () => {
	const { getLocation, calls } = await setup({ permission: 'prompt' });
	await getLocation();
	assert.equal(calls[1][0], 'native.request');
	assert.deepEqual(Array.from(calls[1][1].permissions), ['location']);
	assert.equal(calls[2][0], 'native.location');
});

test('high-accuracy patrol requests upgrade coarse-only permission', async () => {
	const { getLocation, calls } = await setup({ permission: 'coarse' });
	await getLocation();
	assert.equal(calls[1][0], 'native.request');
	assert.equal(calls[2][0], 'native.location');
});

test('declining precise permission still allows an approximate system fix', async () => {
	const { getLocation, native, calls } = await setup({ permission: 'coarse' });
	native.requestPermissions = async () => ({ location: 'denied', coarseLocation: 'granted' });
	const location = await getLocation();
	assert.equal(location.latitude, 42.8);
	assert.equal(calls.at(-1)[0], 'native.location');
});

test('permission denial does not start a location request', async () => {
	const { getLocation, native, calls } = await setup({ permission: 'denied' });
	native.requestPermissions = async () => ({ location: 'denied', coarseLocation: 'denied' });
	await assert.rejects(getLocation(), error => error.code === 'PERMISSION_DENIED');
	assert.deepEqual(calls, ['native.check']);
});

for (const [code, message, expected] of [
	['TIMEOUT', 'location timeout; active providers=[gps, network]', '定位超时'],
	['UNAVAILABLE', 'no usable location provider; enabled providers=[gps]', '系统定位服务不可用'],
	['LOCATION_DISABLED', 'location services disabled', '未开启'],
	['PERMISSION_DENIED', 'location permission denied', '权限被拒绝'],
]) {
	test(`native ${code} is reported without a Google/low-accuracy retry`, async () => {
		const { getLocation, calls, warnings } = await setup({ error: { code, message } });
		await assert.rejects(getLocation(), error => {
			assert.equal(error.code, code);
			assert.ok(error.errMsg.includes(expected));
			assert.equal(error.message, message);
			assert.equal(error.isLocationError, true);
			return true;
		});
		assert.equal(calls.length, 2);
		assert.equal(warnings.length, 1);
	});
}

test('web retains browser geolocation and explicit options', async () => {
	const { getLocation, calls } = await setup({ android: false });
	const location = await getLocation({ timeout: 20000, maximumAge: 1000 });
	assert.equal(location.latitude, 42.8);
	assert.equal(calls.length, 1);
	assert.equal(calls[0][0], 'geo.location');
	assert.equal(calls[0][1].enableHighAccuracy, true);
	assert.equal(calls[0][1].timeout, 20000);
	assert.equal(calls[0][1].maximumAge, 1000);
});

test('web default timeout remains 20 seconds', async () => {
	const { getLocation, calls } = await setup({ android: false });
	await getLocation();
	assert.equal(calls[0][1].timeout, 20000);
});

for (const [code, expected] of [
	['OS-PLUG-GLOC-0003', '权限被拒绝'],
	['OS-PLUG-GLOC-0007', '未开启'],
	['OS-PLUG-GLOC-0009', '未开启'],
	['OS-PLUG-GLOC-0010', '定位超时'],
]) {
	test(`standard plugin ${code} is translated correctly`, async () => {
		const { getLocation } = await setup({ android: false, error: { code, message: 'plugin error' } });
		await assert.rejects(getLocation(), error => error.errMsg.includes(expected));
	});
}

test('older Android container without NativeSensors retains standard plugin', async () => {
	const { getLocation, calls } = await setup({ available: false });
	await getLocation();
	assert.equal(calls[0], 'geo.check');
	assert.equal(calls[1][0], 'geo.location');
});
