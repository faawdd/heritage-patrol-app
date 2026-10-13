// 应用内更新：从在线系统的 App 发布页（/app-download/，同步自 GitHub Release）检查新版本，
// 原生插件 AppUpdate（android/.../AppUpdatePlugin.java）负责下载、校验并调起系统安装器。
import { reactive } from 'vue';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import config from './config.js';
import { getAppVersion } from './native.js';
import { getJSON, setItem } from './storage.js';

const AppUpdate = registerPlugin('AppUpdate');

const STATUS_URL = `${config.WEB_BASE_URL}/app-download/status/`;
const AUTO_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const SNOOZE_MS = 24 * 60 * 60 * 1000;
const SNOOZE_KEY = 'app_update_snooze';

export const updateState = reactive({
	visible: false,
	// idle | available | downloading | ready | permission | error
	phase: 'idle',
	currentVersion: '',
	info: null,
	percent: 0,
	loaded: 0,
	total: 0,
	error: '',
	path: '',
});

let lastAutoCheck = 0;
let checking = null;
let resumeListener = null;

export const isUpdateSupported = () =>
	Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('AppUpdate');

export function compareVersions(a, b) {
	const parse = (v) => String(v || '').replace(/^v/i, '').split(/[.-]/).slice(0, 3).map((n) => parseInt(n, 10) || 0);
	const pa = parse(a);
	const pb = parse(b);
	for (let i = 0; i < 3; i += 1) {
		if ((pa[i] || 0) !== (pb[i] || 0)) {
			return (pa[i] || 0) > (pb[i] || 0) ? 1 : -1;
		}
	}
	return 0;
}

async function fetchText(url) {
	const res = await fetch(url, { cache: 'no-store' });
	if (!res.ok) {
		throw new Error(`HTTP ${res.status}`);
	}
	return res.text();
}

async function fetchLatestRelease() {
	const status = JSON.parse(await fetchText(STATUS_URL));
	const tag = status && status.tag;
	const files = Array.isArray(status && status.files) ? status.files : [];
	const apk = files.find((f) => /\.apk$/i.test(f.name) && f.done);
	if (!tag || !apk) {
		return null;
	}
	const base = `${config.WEB_BASE_URL}/app-download/download/${encodeURIComponent(tag)}/`;
	const shaFile = files.find((f) => f.name === `${apk.name}.sha256` && f.done);
	let sha256 = '';
	if (shaFile) {
		try {
			const match = /\b([a-f0-9]{64})\b/i.exec(await fetchText(base + encodeURIComponent(shaFile.name)));
			sha256 = match ? match[1].toLowerCase() : '';
		} catch (_) {
			// 校验文件获取失败时仍允许更新，由系统安装器校验签名
		}
	}
	return {
		tag,
		version: tag.replace(/^v/i, ''),
		fileName: apk.name,
		size: apk.size || 0,
		url: base + encodeURIComponent(apk.name),
		sha256,
	};
}

/**
 * 检查更新。manual=true 时忽略“稍后提醒”，并返回结果供调用方提示“已是最新版本”等。
 * @returns {Promise<{status: 'update'|'latest'|'unsupported'|'error', info?: object, error?: string}>}
 */
export function checkForUpdate({ manual = false } = {}) {
	if (!isUpdateSupported()) {
		return Promise.resolve({ status: 'unsupported' });
	}
	if (checking) {
		return checking;
	}
	checking = (async () => {
		try {
			const [current, info] = await Promise.all([getAppVersion(), fetchLatestRelease()]);
			updateState.currentVersion = current;
			if (!info || compareVersions(info.version, current) <= 0) {
				return { status: 'latest' };
			}
			const snooze = getJSON(SNOOZE_KEY, null);
			const snoozed = snooze && snooze.version === info.version && Date.now() - snooze.at < SNOOZE_MS;
			if (manual || !snoozed) {
				showUpdate(info);
			}
			return { status: 'update', info };
		} catch (err) {
			return { status: 'error', error: (err && err.message) || '检查更新失败' };
		} finally {
			checking = null;
		}
	})();
	return checking;
}

function showUpdate(info) {
	if (updateState.visible && ['downloading', 'ready', 'permission'].includes(updateState.phase)) {
		return;
	}
	Object.assign(updateState, {
		visible: true,
		phase: 'available',
		info,
		percent: 0,
		loaded: 0,
		total: info.size || 0,
		error: '',
		path: '',
	});
}

export function dismissUpdate() {
	if (updateState.phase === 'downloading') {
		AppUpdate.cancel().catch(() => {});
	}
	if (updateState.info) {
		setItem(SNOOZE_KEY, JSON.stringify({ version: updateState.info.version, at: Date.now() }));
	}
	updateState.visible = false;
	updateState.phase = 'idle';
}

export async function startDownload() {
	const info = updateState.info;
	if (!info) {
		return;
	}
	Object.assign(updateState, { phase: 'downloading', percent: 0, loaded: 0, error: '' });
	const listener = await AppUpdate.addListener('progress', (e) => {
		updateState.loaded = e.loaded || 0;
		if (e.total > 0) {
			updateState.total = e.total;
		}
		updateState.percent = e.percent >= 0 ? e.percent : 0;
	});
	try {
		const { path } = await AppUpdate.download({ url: info.url, fileName: info.fileName, sha256: info.sha256 });
		Object.assign(updateState, { phase: 'ready', percent: 100, path });
		await installUpdate();
	} catch (err) {
		if (err && err.code === 'CANCELLED') {
			return;
		}
		Object.assign(updateState, { phase: 'error', error: (err && err.message) || '下载失败，请稍后重试' });
	} finally {
		listener.remove();
	}
}

export async function installUpdate() {
	if (!updateState.path) {
		return;
	}
	try {
		const { allowed } = await AppUpdate.canInstall();
		if (!allowed) {
			updateState.phase = 'permission';
			return;
		}
		await AppUpdate.install({ path: updateState.path });
		updateState.phase = 'ready';
	} catch (err) {
		if (err && err.code === 'INSTALL_PERMISSION') {
			updateState.phase = 'permission';
			return;
		}
		if (err && err.code === 'NOT_FOUND') {
			Object.assign(updateState, { phase: 'available', path: '' });
			return;
		}
		Object.assign(updateState, { phase: 'error', error: (err && err.message) || '无法打开安装程序' });
	}
}

export function openInstallSettings() {
	return AppUpdate.openInstallSettings().catch(() => {});
}

// 启动后自动检查一次；之后每次回到前台时，距上次检查超过 6 小时再检查。
// 从“允许安装未知应用”设置页返回时，自动继续安装。
export function initAutoUpdate() {
	if (!isUpdateSupported() || resumeListener) {
		return;
	}
	const autoCheck = () => {
		if (Date.now() - lastAutoCheck < AUTO_CHECK_INTERVAL_MS) {
			return;
		}
		lastAutoCheck = Date.now();
		checkForUpdate();
	};
	setTimeout(autoCheck, 3000);
	resumeListener = App.addListener('appStateChange', ({ isActive }) => {
		if (!isActive) {
			return;
		}
		if (updateState.visible && updateState.phase === 'permission') {
			installUpdate();
			return;
		}
		autoCheck();
	});
}
