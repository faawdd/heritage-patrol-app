import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';
import { parse } from 'vue/compiler-sfc';

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

async function setup({ draft, chooseImage = async () => ({ webPath: 'photo:test' }) } = {}) {
	const messages = [];
	const saved = [];
	const removed = [];
	const submitted = [];
	const scrolls = [];
	const stubs = {
		'@/components/AppHeader.vue': { default: {} },
		'@/components/AppIcon.vue': { default: {} },
		'@/lib/watermark.js': { addWatermark: async () => ({ blob: new Blob(['photo']), url: 'blob:test' }) },
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
		'@/lib/native.js': { chooseImage, getLocation: async () => ({ latitude: 42, longitude: 90 }), previewImage() {}, vibrateLong() {} },
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
	return { view, options, messages, saved, removed, submitted, scrolls };
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
