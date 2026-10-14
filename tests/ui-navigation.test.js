import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';

async function setupUi() {
	const dialogs = [];
	const toasts = [];
	const previews = [];
	const stubs = {
		vue: { reactive: value => value },
		vant: {
			allowMultipleToast() {},
			showToast: options => { toasts.push(options); return options; },
			showLoadingToast: options => {
				const toast = { ...options, closed: false, close() { this.closed = true; } };
				toasts.push(toast);
				return toast;
			},
			showDialog: options => new Promise((resolve, reject) => { dialogs.push({ options, resolve, reject }); }),
			closeDialog() {},
			showImagePreview: options => {
				const preview = { options, close() { options.onClose(); options.onClosed(); } };
				previews.push(preview);
				return preview;
			},
		},
	};
	const context = createContext({});
	const module = new SourceTextModule(await readFile(new URL('../src/lib/ui.js', import.meta.url), 'utf8'), { context });
	await module.link(specifier => {
		const values = stubs[specifier];
		assert.ok(values, `Unexpected dependency: ${specifier}`);
		return new SyntheticModule(Object.keys(values), function() {
			for (const [key, value] of Object.entries(values)) this.setExport(key, value);
		}, { context });
	});
	await module.evaluate();
	return { ui: module.namespace, dialogs, toasts, previews };
}

test('Vant modal resolves both confirm and cancel with the existing result shape', async () => {
	const { ui, dialogs } = await setupUi();
	const confirmed = ui.showModal({ danger: true });
	assert.equal(dialogs[0].options.confirmButtonColor, '#C62828');
	dialogs[0].resolve('confirm');
	assert.deepEqual({ ...await confirmed }, { confirm: true, cancel: false });
	const cancelled = ui.showModal();
	dialogs[1].reject('cancel');
	assert.deepEqual({ ...await cancelled }, { confirm: false, cancel: true });
	const broken = ui.showModal();
	dialogs[2].reject(new Error('render failure'));
	await assert.rejects(broken, /render failure/);
});

test('Android back cancels optional dialogs but does not bypass mandatory alerts', async () => {
	const { ui } = await setupUi();
	const cancelled = ui.showModal();
	assert.equal(ui.dismissOverlay(), true);
	assert.equal((await cancelled).cancel, true);
	const mandatory = ui.showModal({ showCancel: false });
	let settled = false;
	mandatory.then(() => { settled = true; });
	assert.equal(ui.dismissOverlay(), true);
	await Promise.resolve();
	assert.equal(settled, false);
	ui.dismissOverlay(true);
	await mandatory;
	assert.equal(ui.dismissOverlay(), false);
});

test('action sheets resolve selection, backdrop cancellation and replacement', async () => {
	const { ui } = await setupUi();
	const selection = ui.showActionSheet(['拍照', '相册'], '选择照片');
	ui.finishActionSheet(ui.actionSheetState.actions[1]);
	assert.equal(await selection, 1);
	const cancel = ui.showActionSheet(['拍照']);
	ui.dismissOverlay();
	assert.equal(await cancel, -1);
	const previous = ui.showActionSheet(['之前']);
	const next = ui.showActionSheet(['之后']);
	assert.equal(await previous, -1);
	ui.finishActionSheet();
	assert.equal(await next, -1);
});

test('loading is reusable and independent of regular toast notifications', async () => {
	const { ui, toasts } = await setupUi();
	await ui.showLoading('定位中');
	await ui.showLoading('上传中');
	assert.equal(toasts.length, 1);
	assert.equal(toasts[0].message, '上传中');
	await ui.toast('失败', { icon: 'error', duration: 3000 });
	assert.equal(toasts[1].type, 'fail');
	assert.equal(ui.dismissOverlay(), true);
	await ui.hideLoading();
	assert.equal(toasts[0].closed, true);
	assert.equal(ui.dismissOverlay(), false);
});

test('image preview exposes a closure promise for safe blob URL cleanup', async () => {
	const { ui, previews } = await setupUi();
	const preview = ui.previewImages(['blob:one', 'blob:two'], 1);
	assert.equal(previews[0].options.startPosition, 1);
	ui.dismissOverlay();
	await preview.closed;
	assert.equal(ui.dismissOverlay(), false);
});

test('navigation replaces tab routes and prevents back crossing the relaunched root', async () => {
	const state = { position: 4, back: '/outside' };
	const calls = [];
	const router = {
		currentRoute: { value: { path: '/tabs/home' } },
		push: url => calls.push(['push', url]),
		replace: url => calls.push(['replace', url]),
		back: () => calls.push(['back']),
	};
	const context = createContext({ window: { history: { state } } });
	const module = new SourceTextModule(await readFile(new URL('../src/lib/nav.js', import.meta.url), 'utf8'), { context });
	await module.link(() => { throw new Error('Unexpected dependency'); });
	await module.evaluate();
	const nav = module.namespace;
	nav.installNav(router);
	assert.equal(nav.canGoBack(), false);
	nav.switchTab('/tabs/admin?tab=tools');
	assert.deepEqual(calls.pop(), ['replace', '/tabs/admin?tab=tools']);
	nav.navigateTo('/collect');
	assert.deepEqual(calls.pop(), ['push', '/collect']);
	state.position = 5;
	assert.equal(nav.canGoBack(), true);
	nav.navigateBack();
	assert.deepEqual(calls.pop(), ['back']);
	nav.reLaunch('/login');
	assert.equal(nav.canGoBack(), false);
	nav.navigateBack('/login');
	assert.deepEqual(calls.pop(), ['replace', '/login']);
});
