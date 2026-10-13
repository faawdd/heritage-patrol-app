import config from './config.js';
import {
	clearAccessToken,
	getAuthHeader,
	getDeviceToken,
	setDeviceToken,
	setSession,
} from './auth.js';

const API = config.API_BASE_URL;

let refreshing = null;

function rawRequest(options) {
	return new Promise((resolve, reject) => {
		uni.request({
			timeout: 20000,
			...options,
			success: resolve,
			fail: reject,
		});
	});
}

export function extractError(res, fallback = '操作失败，请稍后重试') {
	if (!res) {
		return fallback;
	}
	let body = res.data;
	if (typeof body === 'string') {
		try {
			body = JSON.parse(body);
		} catch (error) {
			body = {};
		}
	}
	const detail = body && (body.detail || body.message);
	if (typeof detail === 'string' && detail) {
		return detail;
	}
	if (res.statusCode === 401) {
		return '登录已过期，请重新登录';
	}
	if (res.statusCode === 403) {
		return '没有操作权限';
	}
	if (res.statusCode === 429) {
		return '操作太频繁，请稍后再试';
	}
	return fallback;
}

// 使用设备令牌（手势/指纹快捷登录开启后签发）换取新的访问令牌。
export function loginWithDeviceToken() {
	const deviceToken = getDeviceToken();
	if (!deviceToken) {
		return Promise.reject({ code: 'no_device_token', message: '未开启快捷登录' });
	}
	return rawRequest({
		url: `${API}/api/auth/device-login`,
		method: 'POST',
		header: { 'Content-Type': 'application/json' },
		data: { device_token: deviceToken },
	}).then((res) => {
		if (res.statusCode === 200 && res.data && res.data.token) {
			setSession(res.data);
			return res.data;
		}
		if (res.statusCode === 401) {
			setDeviceToken('');
		}
		const err = { code: res.statusCode === 401 ? 'revoked' : 'failed', statusCode: res.statusCode, message: extractError(res, '快捷登录失败') };
		return Promise.reject(err);
	}, () => Promise.reject({ code: 'network', message: '网络连接失败，请检查网络' }));
}

export function issueDeviceToken() {
	return rawRequest({
		url: `${API}/api/auth/device-token`,
		method: 'POST',
		header: { ...getAuthHeader(), 'Content-Type': 'application/json' },
		data: {},
	}).then((res) => {
		if (res.statusCode === 200 && res.data && res.data.device_token) {
			setDeviceToken(res.data.device_token);
			return res.data.device_token;
		}
		const message = res.statusCode === 404 ? '服务器暂不支持快捷登录，请联系管理员升级' : extractError(res, '快捷登录开通失败');
		return Promise.reject({ code: res.statusCode === 404 ? 'unsupported' : 'failed', message });
	}, () => Promise.reject({ code: 'network', message: '网络连接失败，请检查网络' }));
}

function refreshSession() {
	if (!refreshing) {
		refreshing = loginWithDeviceToken().finally(() => {
			refreshing = null;
		});
	}
	return refreshing;
}

function redirectToLogin() {
	clearAccessToken();
	const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
	const current = pages.length ? pages[pages.length - 1].route : '';
	if (current === 'pages/index/index') {
		return;
	}
	uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
	setTimeout(() => uni.reLaunch({ url: '/pages/index/index?expired=1' }), 600);
}

/**
 * 统一请求：自动携带令牌；遇到 401 时先尝试用设备令牌静默续期并重试一次，失败则回到登录页。
 * 返回 uni.request 的原始响应（含 statusCode / data）。
 */
export function apiRequest({ url, method = 'GET', data, header = {}, auth = true, retry = true, timeout }) {
	const fullUrl = /^https?:\/\//.test(url) ? url : `${API}${url}`;
	return rawRequest({
		url: fullUrl,
		method,
		data,
		timeout,
		header: {
			'Content-Type': 'application/json',
			...(auth ? getAuthHeader() : {}),
			...header,
		},
	}).then((res) => {
		if (res.statusCode === 401 && auth && retry) {
			return refreshSession().then(
				() => apiRequest({ url, method, data, header, auth, retry: false, timeout }),
				() => {
					redirectToLogin();
					return res;
				},
			);
		}
		return res;
	});
}

export function apiUpload({ url, filePath, name = 'file', formData = {}, retry = true }) {
	const fullUrl = /^https?:\/\//.test(url) ? url : `${API}${url}`;
	return new Promise((resolve, reject) => {
		uni.uploadFile({
			url: fullUrl,
			filePath,
			name,
			formData,
			header: getAuthHeader(),
			success: resolve,
			fail: reject,
		});
	}).then((res) => {
		if (res.statusCode === 401 && retry) {
			return refreshSession().then(
				() => apiUpload({ url, filePath, name, formData, retry: false }),
				() => {
					redirectToLogin();
					return res;
				},
			);
		}
		return res;
	});
}
