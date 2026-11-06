import config from './config.js';
import {
	clearAccessToken,
	getAuthHeader,
	getDeviceToken,
	getUser,
	setDeviceToken,
	setSession,
} from './auth.js';
import { toast } from './ui.js';
import { reLaunch, currentPath } from './nav.js';

const API = config.API_BASE_URL;

let refreshing = null;

function buildUrl(url, method, data) {
	const full = /^https?:\/\//.test(url) || url.startsWith('/app-api') ? url : `${API}${url}`;
	if (method !== 'GET' || !data || typeof data !== 'object') {
		return full;
	}
	const params = new URLSearchParams();
	Object.keys(data).forEach((key) => {
		const value = data[key];
		if (value !== undefined && value !== null) {
			params.append(key, String(value));
		}
	});
	const qs = params.toString();
	if (!qs) {
		return full;
	}
	return `${full}${full.includes('?') ? '&' : '?'}${qs}`;
}

async function parseBody(response) {
	const text = await response.text();
	if (!text) {
		return '';
	}
	try {
		return JSON.parse(text);
	} catch (error) {
		return text;
	}
}

/**
 * 发送请求，返回与 uni.request 兼容的 { statusCode, data, header }。
 * 网络失败时 reject（{ errMsg }）。
 */
export async function request({ url, method = 'GET', data, header = {}, timeout = 20000, body }) {
	const upper = String(method || 'GET').toUpperCase();
	const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
	const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;
	const init = { method: upper, headers: { ...header }, signal: controller ? controller.signal : undefined };
	if (body !== undefined) {
		init.body = body;
	} else if (upper !== 'GET' && data !== undefined) {
		const contentType = Object.keys(init.headers).find((k) => k.toLowerCase() === 'content-type');
		if (contentType && /x-www-form-urlencoded/.test(init.headers[contentType]) && typeof data === 'object') {
			init.body = new URLSearchParams(data).toString();
		} else {
			init.body = typeof data === 'string' ? data : JSON.stringify(data);
		}
	}
	try {
		const response = await fetch(buildUrl(url, upper, data), init);
		const headers = {};
		response.headers.forEach((value, key) => {
			headers[key] = value;
		});
		return { statusCode: response.status, data: await parseBody(response), header: headers };
	} catch (error) {
		throw { errMsg: error && error.name === 'AbortError' ? 'request:fail timeout' : `request:fail ${error && error.message ? error.message : ''}` };
	} finally {
		if (timer) {
			clearTimeout(timer);
		}
	}
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
	return request({
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
	return request({
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

let redirectingToLogin = false;

function redirectToLogin() {
	clearAccessToken();
	if (redirectingToLogin || currentPath() === '/login') {
		return;
	}
	redirectingToLogin = true;
	toast('登录已过期，请重新登录');
	setTimeout(() => {
		reLaunch('/login?expired=1');
		redirectingToLogin = false;
	}, 600);
}

/**
 * 统一请求：自动携带令牌；遇到 401 时先尝试用设备令牌静默续期并重试一次，失败则回到登录页。
 * 返回 { statusCode, data } 原始响应。
 */
export function apiRequest({ url, method = 'GET', data, header = {}, auth = true, retry = true, timeout }) {
	return request({
		url,
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

async function toBlob(file) {
	if (file instanceof Blob) {
		return file;
	}
	const response = await fetch(file);
	return response.blob();
}

/**
 * 上传文件（multipart/form-data）。file 可为 Blob/File，或 dataURL / blob: / http(s) 路径。
 */
export async function apiUpload({ url, file, filePath, files, fileName = 'photo.jpg', name = 'file', formData = {}, retry = true }) {
	const userId = getUser()?.id;
	const authHeader = getAuthHeader();
	const blobs = await Promise.all((files || [file || filePath]).map(toBlob));
	if (getUser()?.id !== userId) throw new Error('账号已切换，请使用原账号同步巡查');
	const form = new FormData();
	Object.keys(formData || {}).forEach((key) => {
		const value = formData[key];
		if (value !== undefined && value !== null) {
			form.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
		}
	});
	blobs.forEach((blob, index) => form.append(name, blob, files ? `photo-${index + 1}.jpg` : (file && file.name) || fileName));
	const res = await request({ url, method: 'POST', header: authHeader, body: form, timeout: 120000 });
	if (res.statusCode === 401 && retry) {
		return refreshSession().then(
			() => {
				if (getUser()?.id !== userId) throw new Error('账号已切换，请使用原账号同步巡查');
				return apiUpload({ url, files: files ? blobs : undefined, file: blobs[0], fileName, name, formData, retry: false });
			},
			() => {
				redirectToLogin();
				return res;
			},
		);
	}
	return res;
}
