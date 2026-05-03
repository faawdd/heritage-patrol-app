const TOKEN_KEY = 'heritage_app_token';
const USER_KEY = 'heritage_app_user';

export function setSession(token, user) {
	uni.setStorageSync(TOKEN_KEY, token);
	uni.setStorageSync(USER_KEY, JSON.stringify(user || {}));
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

export function clearSession() {
	uni.removeStorageSync(TOKEN_KEY);
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
