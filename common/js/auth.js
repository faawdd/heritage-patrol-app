const TOKEN_KEY = 'heritage_app_token';
const REFRESH_TOKEN_KEY = 'heritage_app_refresh_token';
const USER_KEY = 'heritage_app_user';
const DEVICE_TOKEN_KEY = 'heritage_app_device_token';
const LAST_USERNAME_KEY = 'heritage_app_last_username';

export function setSession(sessionOrToken, user) {
	if (typeof sessionOrToken === 'string') {
		uni.setStorageSync(TOKEN_KEY, sessionOrToken);
		uni.removeStorageSync(REFRESH_TOKEN_KEY);
		setUser(user || {});
		return;
	}

	const payload = sessionOrToken || {};
	const accessToken = payload.access_token || payload.token || '';
	const refreshToken = payload.refresh_token || payload.refresh || '';
	const userPayload = payload.user || user || {};

	if (accessToken) {
		uni.setStorageSync(TOKEN_KEY, accessToken);
	} else {
		uni.removeStorageSync(TOKEN_KEY);
	}

	if (refreshToken) {
		uni.setStorageSync(REFRESH_TOKEN_KEY, refreshToken);
	} else {
		uni.removeStorageSync(REFRESH_TOKEN_KEY);
	}

	if (payload.device_token) {
		setDeviceToken(payload.device_token);
	}

	setUser(userPayload);
}

export function setUser(user) {
	const value = user || {};
	uni.setStorageSync(USER_KEY, JSON.stringify(value));
	if (value.username) {
		uni.setStorageSync(LAST_USERNAME_KEY, value.username);
	}
}

export function getToken() {
	return uni.getStorageSync(TOKEN_KEY) || '';
}

export function getUser() {
	const raw = uni.getStorageSync(USER_KEY);
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
	return uni.getStorageSync(LAST_USERNAME_KEY) || '';
}

export function getRefreshToken() {
	return uni.getStorageSync(REFRESH_TOKEN_KEY) || '';
}

export function getDeviceToken() {
	return uni.getStorageSync(DEVICE_TOKEN_KEY) || '';
}

export function setDeviceToken(token) {
	if (token) {
		uni.setStorageSync(DEVICE_TOKEN_KEY, token);
	} else {
		uni.removeStorageSync(DEVICE_TOKEN_KEY);
	}
}

// 仅清除访问令牌（会话过期场景），保留快捷登录所需的设备令牌。
export function clearAccessToken() {
	uni.removeStorageSync(TOKEN_KEY);
	uni.removeStorageSync(REFRESH_TOKEN_KEY);
}

export function clearSession() {
	clearAccessToken();
	uni.removeStorageSync(USER_KEY);
	uni.removeStorageSync(DEVICE_TOKEN_KEY);
}

export function isLoggedIn() {
	return !!getToken();
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
