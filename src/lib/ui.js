// 交互反馈（替代 uni.showToast / showLoading / showModal / showActionSheet），基于 Ionic overlay 控制器。
import { actionSheetController, alertController, loadingController, toastController } from '@ionic/vue';
import { checkmarkCircleOutline, alertCircleOutline } from 'ionicons/icons';

let loadingEl = null;
let loadingPending = null;

export async function toast(message, options = {}) {
	const opts = typeof options === 'string' ? { icon: options } : options;
	const icon = opts.icon === 'success' ? checkmarkCircleOutline : opts.icon === 'error' ? alertCircleOutline : undefined;
	const el = await toastController.create({
		message: String(message || ''),
		duration: opts.duration || 2000,
		position: opts.position || 'middle',
		icon,
		cssClass: 'app-toast',
	});
	await el.present();
	return el;
}

export async function showLoading(message = '加载中…') {
	if (loadingEl || loadingPending) {
		if (loadingEl) {
			loadingEl.message = message;
		}
		return;
	}
	loadingPending = loadingController.create({ message, spinner: 'crescent', backdropDismiss: false });
	const el = await loadingPending;
	loadingPending = null;
	loadingEl = el;
	await el.present();
}

export async function hideLoading() {
	if (loadingPending) {
		await loadingPending;
	}
	if (loadingEl) {
		const el = loadingEl;
		loadingEl = null;
		await el.dismiss().catch(() => {});
	}
}

/**
 * 模态对话框，返回 { confirm, cancel }（与 uni.showModal 结果一致）。
 */
export async function showModal({ title = '提示', content = '', showCancel = true, confirmText = '确定', cancelText = '取消', danger = false, confirmColor } = {}) {
	return new Promise((resolve) => {
		const buttons = [];
		if (showCancel) {
			buttons.push({ text: cancelText, role: 'cancel', handler: () => resolve({ confirm: false, cancel: true }) });
		}
		buttons.push({
			text: confirmText,
			role: 'confirm',
			cssClass: danger || confirmColor === '#C62828' ? 'alert-btn-danger' : 'alert-btn-primary',
			handler: () => resolve({ confirm: true, cancel: false }),
		});
		alertController.create({
			header: title,
			message: content,
			buttons,
			backdropDismiss: showCancel,
			cssClass: 'app-alert',
		}).then((el) => {
			el.onDidDismiss().then(({ role }) => {
				if (role === 'backdrop') {
					resolve({ confirm: false, cancel: true });
				}
			});
			el.present();
		});
	});
}

export async function confirm(content, title = '提示', options = {}) {
	const res = await showModal({ title, content, ...options });
	return res.confirm;
}

export async function alert(content, title = '提示') {
	await showModal({ title, content, showCancel: false });
}

/**
 * 操作菜单，返回被选中的下标；取消返回 -1。
 */
export async function showActionSheet(itemList, header) {
	return new Promise((resolve) => {
		actionSheetController.create({
			header,
			buttons: [
				...itemList.map((text, index) => ({ text, handler: () => resolve(index) })),
				{ text: '取消', role: 'cancel', handler: () => resolve(-1) },
			],
		}).then((el) => {
			el.onDidDismiss().then(({ role }) => {
				if (role === 'backdrop') {
					resolve(-1);
				}
			});
			el.present();
		});
	});
}
