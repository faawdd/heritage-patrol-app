import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';
import { parse } from 'vue/compiler-sfc';
import { heritageLevelAccent } from '../src/lib/heritage-level.js';
import { distanceLabel, distanceMeters } from '../src/lib/distance.js';

const { descriptor } = parse(await readFile(new URL('../src/views/PatrolPage.vue', import.meta.url), 'utf8'));

test('confirmed site information remains inside the first-step confirmation card', () => {
	const template = descriptor.template.content;
	const fixed = template.slice(template.indexOf('class="patrol-fixed"'), template.indexOf('ref="content"'));
	const cardStart = template.indexOf('class="u-card step"');
	const cardEnd = template.indexOf('<!-- 第 2 步：拍照 -->');
	assert.doesNotMatch(fixed, /class="site"/);
	assert.match(template.slice(cardStart, cardEnd), /class="site"/);
	assert.match(template.slice(cardStart, cardEnd), /确认文物点/);
});

async function setup({ draft, chooseImage = async () => ({ webPath: 'photo:test' }), getLocation = async () => ({ latitude: 42, longitude: 90 }), addWatermark } = {}) {
	const messages = [];
	const saved = [];
	const removed = [];
	const submitted = [];
	const scrolls = [];
	const watermarks = [];
	const stubs = {
		'@/components/AppHeader.vue': { default: {} },
		'@/components/AppIcon.vue': { default: {} },
		'@/components/EmptyState.vue': { default: {} },
		'@/lib/heritage-level.js': { heritageLevelAccent },
		'@/lib/distance.js': { distanceLabel, distanceMeters },
		'@/lib/watermark.js': { addWatermark: addWatermark || (async (_path, text) => { watermarks.push(text); return { blob: new Blob(['photo']), url: 'blob:test' }; }) },
		'@/lib/auth.js': { getUser: () => ({ id: 42, username: 'test' }) },
		'@/lib/patrol.js': {
			enqueuePatrol: async (payload, files) => { submitted.push({ payload, files }); return { key: 'test', client_id: 'test' }; },
			loadTasks: async () => ({ items: [] }),
			pendingPatrols: async () => [],
			syncPatrols: async () => ({ uploaded: 0 }),
		},
		'@/lib/patrolStore.js': {
			readCache: async () => draft ? { value: draft } : null,
			saveCache: async (...args) => saved.push(args),
			removeCache: async (...args) => removed.push(args),
		},
		'@capacitor/camera': { Camera: {} },
		'@/lib/format.js': { formatDistance: () => '', pad: value => String(value).padStart(2, '0') },
		'@/lib/native.js': { chooseImage, getLocation, previewImage() {}, vibrateLong() {} },
		'@/lib/nav.js': { switchTab() {} },
		'@/lib/ui.js': { hideLoading() {}, showLoading() {}, showModal: async () => ({ confirm: true }), toast: message => messages.push(message) },
	};
	const module = new SourceTextModule(descriptor.script.content, {
		context: createContext({ Blob, URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} }, setTimeout, clearTimeout }),
	});
	await module.link(specifier => {
		const values = stubs[specifier];
		assert.ok(values, `Unexpected dependency: ${specifier}`);
		return new SyntheticModule(Object.keys(values), function() {
			for (const [key, value] of Object.entries(values)) this.setExport(key, value);
		}, { context: module.context });
	});
	await module.evaluate();
	const options = module.namespace.default;
	const view = options.data();
	for (const [name, method] of Object.entries(options.methods)) view[name] = method.bind(view);
	for (const [name, getter] of Object.entries(options.computed)) Object.defineProperty(view, name, { get: () => getter.call(view) });
	view.$nextTick = callback => callback();
	view.$refs = { content: { scrollTo: value => scrolls.push(value) } };
	return { view, options, messages, saved, removed, submitted, scrolls, watermarks };
}

test('steps require a site and then at least one completed photo, and cannot skip the last step', async () => {
	const { view, messages, scrolls } = await setup();
	view.nextStep();
	assert.equal(view.currentStep, 0);
	assert.match(messages.pop(), /文物点/);
	view.site = { id: 1 };
	view.nextStep();
	assert.equal(view.currentStep, 1);
	view.nextStep();
	assert.equal(view.currentStep, 1);
	assert.match(messages.pop(), /至少添加一张/);
	view.photos = [{ file: new Blob(['photo']), url: 'blob:test' }];
	view.nextStep();
	assert.equal(view.currentStep, 2);
	view.nextStep();
	assert.equal(view.currentStep, 2);
	assert.equal(scrolls.length, 2);
});

test('all watermarks, saved draft and submitted coordinates use the first photo location despite later location updates', async () => {
	let resolveLocation;
	const { view, saved, submitted, watermarks } = await setup({
		getLocation: () => new Promise(resolve => { resolveLocation = resolve; }),
	});
	view.user = { id: 42, username: 'test' };
	view.site = { id: 1, name: '测试文物点' };
	view.location = { latitude: 42.12345678, longitude: 90.98765432 };
	view.locationOk = true;
	view.currentStep = 1;
	const locating = view.locate();
	await view.addPhoto('first');
	resolveLocation({ latitude: 43.1, longitude: 91.2 });
	await locating;
	await view.addPhoto('second');
	for (const text of watermarks) assert.match(text, /坐标: 90\.987654, 42\.123457/);
	assert.equal(saved.at(-1)[2].reportLocation.latitude, 42.123457);
	assert.equal(saved.at(-1)[2].reportLocation.longitude, 90.987654);
	view.status = 'normal';
	view.currentStep = 2;
	await view.submit();
	assert.equal(submitted[0].payload.latitude, 42.123457);
	assert.equal(submitted[0].payload.longitude, 90.987654);
	await view.removePhoto(0);
	await view.removePhoto(0);
	assert.equal(view.reportLocation, null);
	await view.addPhoto('third');
	assert.match(watermarks.at(-1), /坐标: 91\.200000, 43\.100000/);
});

test('photo watermarks include the selected site code and keep it consistent across photos', async () => {
	const { view, watermarks, messages } = await setup();
	view.user = { id: 42, username: 'test' };
	view.site = { id: 1, name: '测试文物点', sip_code: '650100-0001' };
	await view.addPhoto('first');
	view.pickerOpen = true;
	view.chooseSite({ id: 1, name: '更新后的名称', sip_code: 'NEW-CODE' });
	assert.equal(view.pickerOpen, false);
	view.chooseSite({ id: 2, name: '其他文物点', sip_code: 'OTHER' });
	assert.match(messages.at(-1), /先删除已拍照片/);
	await view.addPhoto('second');
	for (const text of watermarks) {
		assert.match(text, /文物点: 测试文物点\n四普编号: 650100-0001\n时间:/);
		assert.match(text, /坐标: 0\.000000, 0\.000000/);
	}
});

test('photo watermark reports missing site code without inventing one', async () => {
	const { view, watermarks } = await setup();
	view.user = { id: 42 };
	view.site = { id: 1, name: '测试文物点' };
	await view.addPhoto('first');
	assert.match(watermarks[0], /四普编号: 未提供/);
});

test('restored snapshots survive relocalization; old drafts require replacing photos', async () => {
	const draft = {
		site: { id: 1 }, location: { latitude: 42, longitude: 90 }, locationOk: true,
		reportLocation: { latitude: 42.123456, longitude: 90.123456 }, reportLocationOk: true,
		status: 'normal', chips: [], issueNote: '', photos: [new Blob(['photo'])], currentStep: 2,
	};
	const restored = await setup({ draft });
	restored.view.refreshTasks = async () => {};
	await restored.options.activated.call(restored.view);
	await new Promise(resolve => setTimeout(resolve, 0));
	await restored.view.submit();
	assert.equal(restored.submitted[0].payload.latitude, 42.123456);
	assert.equal(restored.submitted[0].payload.longitude, 90.123456);

	const old = await setup({ draft: { ...draft, reportLocation: undefined } });
	old.view.refreshTasks = async () => {};
	await old.options.activated.call(old.view);
	assert.equal(old.view.canSubmit, false);
	await old.view.submit();
	assert.match(old.messages.at(-1), /删除全部照片/);
	assert.equal(old.submitted.length, 0);
	await assert.rejects(old.view.addPhoto('next'), /删除全部照片/);
	await old.view.removePhoto(0);
	await old.view.addPhoto('replacement');
	assert.ok(old.view.reportLocation);
});

test('location changing while watermark is processing does not change the stored snapshot', async () => {
	let finish;
	let watermark;
	const { view, submitted } = await setup({
		addWatermark: (_path, text) => {
			watermark = text;
			return new Promise(resolve => { finish = resolve; });
		},
	});
	view.user = { id: 42 };
	view.site = { id: 1 };
	view.location = { latitude: 42.123456, longitude: 90.123456 };
	view.locationOk = true;
	const adding = view.addPhoto('first');
	await view.locate();
	finish({ blob: new Blob(['photo']), url: 'blob:test' });
	await adding;
	view.currentStep = 2;
	view.status = 'normal';
	await view.submit();
	assert.match(watermark, /坐标: 90\.123456, 42\.123456/);
	assert.equal(submitted[0].payload.latitude, 42.123456);
	assert.equal(submitted[0].payload.longitude, 90.123456);
});

test('submitted distance uses confirmed site and captured location, including manual selection', async () => {
	const { view, submitted } = await setup();
	view.user = { id: 42 };
	view.site = { id: 1, latitude: 42, longitude: 90, manual: true };
	view.location = { latitude: 42.001, longitude: 90 };
	view.locationOk = true;
	await view.addPhoto('first');
	await view.locate();
	view.status = 'normal';
	view.currentStep = 2;
	await view.submit();
	assert.ok(Math.abs(submitted[0].payload.distance_meters - 111.195) < 0.01);
});

test('fallback coordinates and absent site coordinates never produce a fabricated distance', async () => {
	for (const site of [{ id: 1, latitude: 42, longitude: 90 }, { id: 1, latitude: null, longitude: 90 }]) {
		const { view, submitted } = await setup();
		view.user = { id: 42 };
		view.site = site;
		view.location = { latitude: 42, longitude: 90 };
		view.locationOk = site.latitude === null;
		await view.addPhoto('first');
		view.status = 'normal';
		view.currentStep = 2;
		await view.submit();
		assert.equal(submitted[0].payload.distance_meters, null);
	}
});

test('failed watermark does not lock the location or create a photo', async () => {
	const { view } = await setup({ addWatermark: async () => { throw new Error('水印失败'); } });
	view.user = { id: 42 };
	view.site = { id: 1 };
	await assert.rejects(view.addPhoto('first'), /水印失败/);
	assert.equal(view.reportLocation, null);
	assert.equal(view.photos.length, 0);
});

test('record coordinates display the same six decimal places as photo watermarks', async () => {
	const { descriptor: records } = parse(await readFile(new URL('../src/views/RecordsPage.vue', import.meta.url), 'utf8'));
	const context = createContext({});
	const module = new SourceTextModule(records.script.content, { context });
	await module.link(specifier => {
		const exports = {
			'@/components/AppHeader.vue': { default: {} },
			'@/components/AppIcon.vue': { default: {} },
			'@/components/EmptyState.vue': { default: {} },
			'@/lib/patrol.js': { loadPatrolRecords() {}, PATROL_CHANGED: '', pendingPatrols() {}, syncPatrols() {} },
			'@/lib/format.js': { friendlyTime() {}, todayKey() {} },
			'@/lib/distance.js': { distanceLabel },
			'@/lib/native.js': { previewImage() {} },
			'@/lib/nav.js': { switchTab() {} },
			'@/lib/ui.js': { toast() {} },
		}[specifier];
		assert.ok(exports, `Unexpected dependency: ${specifier}`);
		return new SyntheticModule(Object.keys(exports), function () {
			for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
		}, { context });
	});
	await module.evaluate();
	const coord = module.namespace.default.methods.coord;
	assert.equal(coord(90.987654), '90.987654');
	assert.equal(coord(42.123457), '42.123457');
	assert.equal(coord(null), '-');
	assert.match(records.template.content, /coord\(item\.longitude\).*coord\(item\.latitude\)/);
	const pending = records.template.content.slice(records.template.content.indexOf('v-for="item in pending"'), records.template.content.indexOf('<p v-if="cached">'));
	const uploaded = records.template.content.slice(records.template.content.indexOf('v-for="item in group.items"'));
	assert.match(pending, /distanceLabel\(item\.distance_meters\)/);
	assert.match(uploaded, /distanceLabel\(item\.distance_meters\)/);
});

test('photo processing and submission lock forward and backward step navigation', async () => {
	const { view } = await setup();
	view.site = { id: 1 };
	view.photos = [{ file: new Blob(['photo']), url: 'blob:test' }];
	view.currentStep = 1;
	for (const flag of ['processing', 'submitting']) {
		view[flag] = true;
		view.nextStep();
		view.previousStep();
		assert.equal(view.currentStep, 1);
		view[flag] = false;
	}
	view.nextStep();
	view.previousStep();
	assert.equal(view.currentStep, 1);
	view.previousStep();
	view.previousStep();
	assert.equal(view.currentStep, 0);
	assert.equal(view.photos.length, 1);
});

test('late location results cannot replace the site already confirmed for the photo step', async () => {
	const { view } = await setup();
	view.tasks = [{ id: 2, name: '最近的文物点', latitude: 42, longitude: 90 }];
	view.site = { id: 1, name: '已确认的文物点' };
	view.currentStep = 1;
	await view.locate();
	assert.equal(view.site.id, 1);
	view.currentStep = 0;
	await view.locate();
	assert.equal(view.site.id, 2);
});

test('camera selection locks navigation until cancel, without adding a photo', async () => {
	let cancel;
	const { view } = await setup({ chooseImage: () => new Promise((_resolve, reject) => { cancel = reject; }) });
	view.site = { id: 1 };
	view.currentStep = 1;
	const taking = view.takePhoto();
	assert.equal(view.processing, true);
	view.previousStep();
	assert.equal(view.currentStep, 1);
	cancel({ cancelled: true });
	await taking;
	assert.equal(view.processing, false);
	assert.equal(view.photos.length, 0);
});

test('drafts persist and restore the current step and all inputs; old or invalid drafts start at step one', async () => {
	for (const step of [0, 1, 2, undefined, 8]) {
		const draft = {
			site: { id: 1 }, location: { latitude: 42, longitude: 90 }, locationOk: true,
			status: 'problem', chips: ['自然损毁'], issueNote: '现场情况', capturedAt: '2026-10-14T00:00:00Z',
			photos: [new Blob(['photo'])], currentStep: step,
		};
		const { view, options, saved } = await setup({ draft });
		view.refreshTasks = async () => {};
		view.locate = () => {};
		await options.activated.call(view);
		assert.equal(view.currentStep, [0, 1, 2].includes(step) ? step : 0);
		assert.equal(view.issueNote, draft.issueNote);
		assert.equal(view.photos[0].file, draft.photos[0]);
		view.setStep(1);
		await view.draftSaving;
		assert.equal(saved.at(-1)[2].currentStep, 1);
		assert.equal(saved.at(-1)[2].capturedAt, draft.capturedAt);
	}
});

test('deleting the last photo blocks advancing and removes the stored draft', async () => {
	const { view, removed } = await setup();
	view.user = { id: 42 };
	view.site = { id: 1 };
	view.currentStep = 1;
	view.photos = [{ file: new Blob(['photo']), url: 'blob:test' }];
	await view.removePhoto(0);
	assert.equal(view.canGoNext, false);
	view.nextStep();
	assert.equal(view.currentStep, 1);
	assert.deepEqual(removed, [[42, 'draft']]);
});

test('final step submits normal or described problems with all photos and actual capture time', async () => {
	for (const status of ['normal', 'problem']) {
		const { view, submitted } = await setup();
		view.user = { id: 42 };
		view.site = { id: 1, name: '测试文物点' };
		view.photos = [{ file: new Blob(['photo']), url: 'blob:test' }];
		view.reportLocation = { latitude: 42, longitude: 90 };
		view.capturedAt = '2026-10-14T00:00:00Z';
		view.currentStep = 2;
		view.status = status;
		if (status === 'problem') {
			assert.equal(view.canSubmit, false);
			await view.submit();
			assert.equal(submitted.length, 0);
			view.chips = ['自然损毁'];
			view.issueNote = '现场情况';
		}
		await view.submit();
		assert.equal(submitted.length, 1);
		assert.equal(submitted[0].payload.is_normal, status === 'normal');
		assert.equal(submitted[0].payload.inspect_time, view.capturedAt);
		assert.equal(submitted[0].files[0], view.photos[0].file);
		assert.equal(submitted[0].payload.issue_details, status === 'normal' ? '' : '自然损毁：现场情况');
		view.again();
		assert.equal(view.currentStep, 0);
		assert.equal(view.photos.length, 0);
		assert.equal(view.status, '');
		assert.equal(view.success, null);
	}
});
