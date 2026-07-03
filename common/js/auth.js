const TOKEN_KEY = 'heritage_app_token';
const REFRESH_TOKEN_KEY = 'heritage_app_refresh_token';
const USER_KEY = 'heritage_app_user';

export function setSession(sessionOrToken, user) {
	if (typeof sessionOrToken === 'string') {
		uni.setStorageSync(TOKEN_KEY, sessionOrToken);
		uni.removeStorageSync(REFRESH_TOKEN_KEY);
		uni.setStorageSync(USER_KEY, JSON.stringify(user || {}));
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

	uni.setStorageSync(USER_KEY, JSON.stringify(userPayload));
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

export function getRefreshToken() {
	return uni.getStorageSync(REFRESH_TOKEN_KEY) || '';
}

export function clearSession() {
	uni.removeStorageSync(TOKEN_KEY);
	uni.removeStorageSync(REFRESH_TOKEN_KEY);
	uni.removeStorageSync(USER_KEY);
}

export function isLoggedIn() {
	return !!getToken();
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
