import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';
import { parse } from 'vue/compiler-sfc';

async function loadModule(source, context, stubs) {
	const module = new SourceTextModule(source, { context });
	await module.link(specifier => {
		const exports = stubs[specifier];
		assert.ok(exports, `Unexpected dependency: ${specifier}`);
		return new SyntheticModule(Object.keys(exports), function () {
			for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
		}, { context });
	});
	await module.evaluate();
	return module.namespace;
}

test('record pages use isolated account, status and page caches and do not mask permission errors', async () => {
	let userId = 1;
	let response = { statusCode: 200, data: { items: [{ id: 5 }], counts: { all: 1, ok: 1, bad: 0 }, page: 2, pages: 2 } };
	const cache = new Map();
	const calls = [];
	const context = createContext({ navigator: { onLine: true }, window: {}, Event: class {}, Blob });
	const source = await readFile(new URL('../src/lib/patrol.js', import.meta.url), 'utf8');
	const module = await loadModule(source, context, {
		'./auth.js': { getUser: () => ({ id: userId }), isLoggedIn: () => true },
		'./request.js': {
			apiRequest: async options => { calls.push(options); if (response instanceof Error) throw { errMsg: response.message }; return response; },
			apiUpload() {}, extractError: () => '无权查看',
		},
		'./patrolStore.js': {
			readCache: async (id, key) => cache.get(`${id}:${key}`),
			saveCache: async (id, key, value) => cache.set(`${id}:${key}`, { value }),
			enqueuePending() {}, listPending() {}, removePending() {}, savePending() {},
		},
	});
	const result = await module.loadPatrolRecords({ page: 2, status: 'bad' });
	assert.equal(result.items[0].id, 5);
	assert.equal(calls[0].data.page, 2);
	assert.equal(calls[0].data.status, 'bad');
	context.navigator.onLine = false;
	assert.equal((await module.loadPatrolRecords({ page: 2, status: 'bad' })).cached, true);
	await assert.rejects(module.loadPatrolRecords({ page: 1, status: 'bad' }), /没有离线缓存/);
	userId = 2;
	await assert.rejects(module.loadPatrolRecords({ page: 2, status: 'bad' }), /没有离线缓存/);
	userId = 1;
	context.navigator.onLine = true;
	response = { statusCode: 403 };
	await assert.rejects(module.loadPatrolRecords({ page: 2, status: 'bad' }), /无权查看/);
	response = new Error('network');
	assert.equal((await module.loadPatrolRecords({ page: 2, status: 'bad' })).cached, true);
});

test('record page filters and pagination fetch server data and discard stale responses', async () => {
	const source = await readFile(new URL('../src/views/RecordsPage.vue', import.meta.url), 'utf8');
	const { descriptor } = parse(source);
	let currentUser = 1;
	const requests = [];
	const context = createContext({ window: {}, URL, Blob });
	const module = await loadModule(descriptor.script.content, context, {
		'@/components/AppHeader.vue': { default: {} },
		'@/components/AppIcon.vue': { default: {} },
		'@/components/EmptyState.vue': { default: {} },
		'@/lib/patrol.js': {
			loadPatrolRecords: options => new Promise(resolve => requests.push({ options, resolve })),
			PATROL_CHANGED: '', pendingPatrols: async () => [], syncPatrols() {},
		},
		'@/lib/format.js': { friendlyTime() {}, todayKey() {} },
		'@/lib/distance.js': { distanceLabel() {} },
		'@/lib/auth.js': { getUser: () => ({ id: currentUser }) },
		'@/lib/native.js': { previewImage() {} },
		'@/lib/nav.js': { switchTab() {} },
		'@/lib/ui.js': { toast() {} },
	});
	const options = module.default;
	const view = options.data();
	for (const [key, value] of Object.entries(options.methods)) view[key] = value.bind(view);
	for (const [key, value] of Object.entries(options.computed)) Object.defineProperty(view, key, { get: () => value.call(view) });
	options.activated.call(view);
	view.changeFilter('bad');
	assert.equal(requests[1].options.status, 'bad');
	requests[1].resolve({ items: [{ id: 2 }], counts: { all: 3, ok: 1, bad: 2 }, page: 1, pages: 2 });
	await new Promise(resolve => setTimeout(resolve, 0));
	requests[0].resolve({ items: [{ id: 1 }], counts: {}, page: 1, pages: 1 });
	await new Promise(resolve => setTimeout(resolve, 0));
	assert.equal(view.records[0].id, 2);
	view.changePage(2);
	assert.equal(requests[2].options.page, 2);
	currentUser = 2;
	options.activated.call(view);
	assert.equal(view.records.length, 0);
	requests[2].resolve({ items: [{ id: 3 }], counts: {}, page: 2, pages: 2 });
	await new Promise(resolve => setTimeout(resolve, 0));
	assert.equal(view.records.length, 0);
	requests[3].resolve({ items: [{ id: 4 }], counts: { all: 1, ok: 1, bad: 0 }, page: 1, pages: 1 });
	await new Promise(resolve => setTimeout(resolve, 0));
	assert.equal(view.records[0].id, 4);
});
