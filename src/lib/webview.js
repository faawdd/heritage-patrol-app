import { Capacitor } from '@capacitor/core';
import { InAppBrowser, DefaultWebViewOptions } from '@capacitor/inappbrowser';
import config from './config.js';
import { apiRequest, extractError } from './request.js';
import { toast, showLoading, hideLoading } from './ui.js';

// 在线系统(Django)页面带有 X-Frame-Options: DENY，不能放进 iframe，
// 必须作为顶层页面打开：原生端使用应用内 WebView，浏览器端打开新窗口。
export async function openWebTool(url) {
	if (!url) {
		throw new Error('missing url');
	}

	if (!Capacitor.isNativePlatform()) {
		const win = window.open(url, '_blank');
		if (!win) {
			window.location.href = url;
		}
		return;
	}

	try {
		await InAppBrowser.openInWebView({
			url,
			options: {
				...DefaultWebViewOptions,
				showURL: false,
				showToolbar: true,
				showNavigationButtons: true,
				closeButtonText: '关闭',
				clearCache: false,
				clearSessionCache: false,
				android: {
					...DefaultWebViewOptions.android,
					allowZoom: true,
					hardwareBack: true,
				},
			},
		});
	} catch (err) {
		// 插件不可用时回退到系统浏览器
		await InAppBrowser.openInExternalBrowser({ url });
	}
}

// 向 App 接口申请带短时令牌的在线系统入口地址（令牌 10 分钟有效，故每次打开前重新获取），再打开。
export async function openApiEntry(apiPath, { pick = (data) => data && data.url, transform } = {}) {
	showLoading('正在打开…');
	let url = '';
	try {
		const res = await apiRequest({ url: `${config.API_BASE_URL}${apiPath}` });
		if (res.statusCode !== 200) {
			throw new Error(extractError(res, '获取在线系统地址失败'));
		}
		url = pick(res.data);
		if (!url) {
			throw new Error('未获取到在线系统地址');
		}
		if (transform) {
			url = transform(url);
		}
	} catch (err) {
		hideLoading();
		toast((err && err.message) || '打开失败，请稍后重试', { icon: 'none' });
		return false;
	}
	hideLoading();
	try {
		await openWebTool(url);
		return true;
	} catch (_) {
		toast('打开失败，请稍后重试', { icon: 'none' });
		return false;
	}
}
