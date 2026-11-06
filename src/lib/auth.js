import { getItem, setItem, removeItem } from './storage.js';

const TOKEN_KEY = 'heritage_app_token';
const REFRESH_TOKEN_KEY = 'heritage_app_refresh_token';
const USER_KEY = 'heritage_app_user';
const DEVICE_TOKEN_KEY = 'heritage_app_device_token';
const LAST_USERNAME_KEY = 'heritage_app_last_username';
const OFFLINE_USER_KEY = 'heritage_app_offline_user';
let offlineUnlocked = false;

export function setSession(sessionOrToken, user) {
	offlineUnlocked = false;
	if (typeof sessionOrToken === 'string') {
		setItem(TOKEN_KEY, sessionOrToken);
		removeItem(REFRESH_TOKEN_KEY);
		setUser(user || {});
		rememberOfflineUser(user);
		return;
	}

	const payload = sessionOrToken || {};
	const accessToken = payload.access_token || payload.token || '';
	const refreshToken = payload.refresh_token || payload.refresh || '';
	const userPayload = payload.user || user || {};

	if (accessToken) {
		setItem(TOKEN_KEY, accessToken);
	} else {
		removeItem(TOKEN_KEY);
	}

	if (refreshToken) {
		setItem(REFRESH_TOKEN_KEY, refreshToken);
	} else {
		removeItem(REFRESH_TOKEN_KEY);
	}

	if (payload.device_token) {
		setDeviceToken(payload.device_token);
	}

	setUser(userPayload);
	rememberOfflineUser(userPayload);
}

function rememberOfflineUser(user) {
	if (user?.id) {
		// This proof is written only after the server has authenticated the account.
		window.localStorage.setItem(OFFLINE_USER_KEY, String(user.id));
	}
}

export function canUseOfflinePatrol() {
	const user = getUser();
	return !!user?.id && getItem(OFFLINE_USER_KEY) === String(user.id);
}

export function unlockOfflinePatrol() {
	if (!canUseOfflinePatrol()) throw new Error('首次使用必须联网登录');
	offlineUnlocked = true;
}

export function setUser(user) {
	const value = user || {};
	setItem(USER_KEY, JSON.stringify(value));
	if (value.username) {
		setItem(LAST_USERNAME_KEY, value.username);
	}
}

export function getToken() {
	return getItem(TOKEN_KEY) || '';
}

export function getUser() {
	const raw = getItem(USER_KEY);
	if (!raw) {
		return null;
	}
	try {
		return JSON.parse(raw);
	} catch (error) {
		return null;
	}
}

export function getLastUsername() {
	return getItem(LAST_USERNAME_KEY) || '';
}

export function getRefreshToken() {
	return getItem(REFRESH_TOKEN_KEY) || '';
}

export function getDeviceToken() {
	return getItem(DEVICE_TOKEN_KEY) || '';
}

export function setDeviceToken(token) {
	if (token) {
		setItem(DEVICE_TOKEN_KEY, token);
	} else {
		removeItem(DEVICE_TOKEN_KEY);
	}
}

// 仅清除访问令牌（会话过期场景），保留快捷登录所需的设备令牌。
export function clearAccessToken() {
	removeItem(TOKEN_KEY);
	removeItem(REFRESH_TOKEN_KEY);
}

export function clearSession() {
	offlineUnlocked = false;
	clearAccessToken();
	removeItem(USER_KEY);
	removeItem(DEVICE_TOKEN_KEY);
}

export function isLoggedIn() {
	return !!getToken() || (offlineUnlocked && canUseOfflinePatrol());
}

function base64UrlDecode(input) {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	const str = String(input).replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
	const bytes = [];
	let buffer = 0;
	let bits = 0;
	for (let i = 0; i < str.length; i += 1) {
		const value = chars.indexOf(str.charAt(i));
		if (value < 0) {
			return '';
		}
		buffer = (buffer << 6) | value;
		bits += 6;
		if (bits >= 8) {
			bits -= 8;
			bytes.push((buffer >> bits) & 0xff);
		}
	}
	let out = '';
	for (let i = 0; i < bytes.length; i += 1) {
		out += String.fromCharCode(bytes[i]);
	}
	try {
		return decodeURIComponent(escape(out));
	} catch (error) {
		return out;
	}
}

// 解析令牌过期时间（秒）。兼容 FastAPI 自签令牌（payload.sig）与 JWT（header.payload.sig）。
export function getTokenExpiry(token) {
	if (!token) {
		return 0;
	}
	const parts = String(token).split('.');
	const candidates = parts.length >= 3 ? [parts[1]] : [parts[0]];
	for (let i = 0; i < candidates.length; i += 1) {
		try {
			const payload = JSON.parse(base64UrlDecode(candidates[i]));
			if (payload && payload.exp) {
				return Number(payload.exp) || 0;
			}
		} catch (error) {
			// ignore
		}
	}
	return 0;
}

export function isTokenFresh(token = getToken(), marginSeconds = 120) {
	const exp = getTokenExpiry(token);
	if (!exp) {
		return false;
	}
	return exp - marginSeconds > Math.floor(Date.now() / 1000);
}

export function isAdminUser(user) {
	if (!user) {
		return false;
	}
	return !!user.is_admin || user.role === '管理员' || user.role === '超级管理员';
}

export function getAuthHeader() {
	const token = getToken();
	return token ? { Authorization: `Bearer ${token}` } : {};
}
