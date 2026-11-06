import { reactive } from 'vue';
import { allowMultipleToast, showToast, showLoadingToast, showDialog, closeDialog, showImagePreview } from 'vant';

allowMultipleToast();

let loading = null;
let activeDialog = null;
let activePreview = null;
let resolveActionSheet = null;

export const actionSheetState = reactive({ show: false, title: '', actions: [] });

export async function toast(message, options = {}) {
	const opts = typeof options === 'string' ? { icon: options } : options;
	return showToast({
		message: String(message || ''),
		duration: opts.duration ?? 2000,
		position: opts.position || 'middle',
		type: opts.icon === 'success' ? 'success' : opts.icon === 'error' ? 'fail' : 'text',
	});
}

export async function showLoading(message = '加载中…') {
	if (loading) {
		loading.message = message;
		return;
	}
	loading = showLoadingToast({ message, duration: 0, forbidClick: true });
}

export async function hideLoading() {
	loading?.close();
	loading = null;
}

export function showModal({ title = '提示', content = '', showCancel = true, confirmText = '确定', cancelText = '取消', danger = false, confirmColor } = {}) {
	return new Promise((resolve, reject) => {
		activeDialog?.cancel();
		const dialog = {
			showCancel,
			cancel() {
				closeDialog();
				finish(false);
			},
		};
		function finish(confirmed) {
			if (activeDialog === dialog) activeDialog = null;
			resolve({ confirm: confirmed, cancel: !confirmed });
		}
		activeDialog = dialog;
		showDialog({
			title,
			message: content,
			showCancelButton: showCancel,
			confirmButtonText: confirmText,
			cancelButtonText: cancelText,
			confirmButtonClass: danger || confirmColor ? 'is-danger' : '',
			confirmButtonColor: danger ? '#C62828' : confirmColor,
			closeOnClickOverlay: showCancel,
			closeOnPopstate: false,
		}).then(() => finish(true), (error) => {
			if (error === 'cancel' || error === 'overlay') finish(false);
			else {
				if (activeDialog === dialog) activeDialog = null;
				reject(error);
			}
		});
	});
}

export async function confirm(content, title = '提示', options = {}) {
	return (await showModal({ title, content, ...options })).confirm;
}

export async function alert(content, title = '提示') {
	await showModal({ title, content, showCancel: false });
}

export function finishActionSheet(action) {
	actionSheetState.show = false;
	resolveActionSheet?.(action?.index ?? -1);
	resolveActionSheet = null;
}

export function showActionSheet(itemList, header) {
	finishActionSheet();
	actionSheetState.title = header || '';
	actionSheetState.actions = itemList.map((name, index) => ({ name, index }));
	actionSheetState.show = true;
	return new Promise(resolve => { resolveActionSheet = resolve; });
}

export function previewImages(images, startPosition) {
	let resolveClosed;
	const closed = new Promise(resolve => { resolveClosed = resolve; });
	const instance = showImagePreview({
		images, startPosition, loop: false, closeable: true,
		onClose: () => { activePreview = null; },
		onClosed: () => { resolveClosed(); },
	});
	activePreview = instance;
	return { close: () => instance.close(), closed };
}

// Android 返回键先处理浮层，不能直接离开浮层后的页面。
export function dismissOverlay(force = false) {
	if (actionSheetState.show) {
		finishActionSheet();
		return true;
	}
	if (activePreview) {
		activePreview.close();
		activePreview = null;
		return true;
	}
	if (activeDialog) {
		if (force || activeDialog.showCancel) activeDialog.cancel();
		return true;
	}
	return !!loading;
}
