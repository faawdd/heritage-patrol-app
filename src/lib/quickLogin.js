import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth';
import { Capacitor } from '@capacitor/core';
import sha256 from './sha256.js';
import { getItem, setItem, removeItem } from './storage.js';
import { canUseOfflinePatrol, getUser, unlockOfflinePatrol, getDeviceToken, getTokenExpiry, getToken, isTokenFresh, setDeviceToken } from './auth.js';
import { issueDeviceToken, loginWithDeviceToken } from './request.js';

const SETTINGS_KEY = 'heritage_app_quick_login';
const SETUP_ASKED_KEY = 'heritage_app_quick_login_asked';
export const MAX_GESTURE_FAILURES = 5;
export const MIN_GESTURE_POINTS = 4;

/**
 * 快捷登录设置：
 * { username, fullName, gestureHash, biometric: 'fingerprint' | 'facial' | '', failures }
 */
export function getQuickLogin() {
	const raw = getItem(SETTINGS_KEY);
	if (!raw) {
		return null;
	}
	try {
		const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
		return value && value.username ? value : null;
	} catch (error) {
		return null;
	}
}

export function saveQuickLogin(settings) {
	setItem(SETTINGS_KEY, JSON.stringify(settings || {}));
}

export function clearQuickLogin() {
	removeItem(SETTINGS_KEY);
	setDeviceToken('');
}

export function hasQuickLogin(settings = getQuickLogin()) {
	return !!(settings && (settings.gestureHash || settings.biometric));
}

export function wasSetupAsked(username) {
	return getItem(SETUP_ASKED_KEY) === username;
}

export function markSetupAsked(username) {
	setItem(SETUP_ASKED_KEY, username || '');
}

export function hashGesture(username, points) {
	return sha256(`heritage-gesture|${username}|${(points || []).join('-')}`);
}

export function verifyGesture(points) {
	const settings = getQuickLogin();
	if (!settings || !settings.gestureHash) {
		return { ok: false, remaining: 0 };
	}
	if (hashGesture(settings.username, points) === settings.gestureHash) {
		settings.failures = 0;
		saveQuickLogin(settings);
		return { ok: true, remaining: MAX_GESTURE_FAILURES };
	}
	settings.failures = (settings.failures || 0) + 1;
	const remaining = Math.max(0, MAX_GESTURE_FAILURES - settings.failures);
	if (remaining <= 0) {
		// 连续失败过多：清除手势，必须用密码登录
		settings.gestureHash = '';
		settings.failures = 0;
		if (!settings.biometric) {
			clearQuickLogin();
		} else {
			saveQuickLogin(settings);
		}
	} else {
		saveQuickLogin(settings);
	}
	return { ok: false, remaining };
}

// 检测设备生物识别能力：返回 { fingerprint, facial }（仅原生 App 可用）
export async function checkBiometricSupport() {
	const result = { fingerprint: false, facial: false };
	if (!Capacitor.isNativePlatform()) {
		return result;
	}
	try {
		const info = await BiometricAuth.checkBiometry();
		if (!info || !info.isAvailable) {
			return result;
		}
		const types = info.biometryTypes && info.biometryTypes.length ? info.biometryTypes : [info.biometryType];
		types.forEach((type) => {
			if (type === BiometryType.faceId || type === BiometryType.faceAuthentication) {
				result.facial = true;
			} else if (type === BiometryType.touchId || type === BiometryType.fingerprintAuthentication) {
				result.fingerprint = true;
			}
		});
		// 部分 Android 设备只报告“可用”而不区分类型，按指纹处理
		if (!result.fingerprint && !result.facial) {
			result.fingerprint = true;
		}
	} catch (error) {
		// ignore
	}
	return result;
}

export function biometricLabel(mode) {
	return mode === 'facial' ? '面容' : '指纹';
}

export async function authenticateBiometric(mode = 'fingerprint') {
	if (!Capacitor.isNativePlatform()) {
		throw { cancelled: false, message: '当前设备不支持生物识别' };
	}
	try {
		await BiometricAuth.authenticate({
			reason: mode === 'facial' ? '请验证面容以登录' : '请将手指放在指纹识别处',
			cancelTitle: '取消',
			androidTitle: '鄯善文保 · 快捷登录',
			androidSubtitle: mode === 'facial' ? '请验证面容以登录' : '请验证指纹以登录',
			allowDeviceCredential: false,
			androidConfirmationRequired: false,
		});
	} catch (err) {
		const code = err && err.code;
		const cancelled = code === 'userCancel' || code === 'appCancel' || code === 'systemCancel';
		throw { cancelled, message: cancelled ? '已取消验证' : `${biometricLabel(mode)}验证未通过` };
	}
}

/**
 * 本地验证通过后建立会话：
 * 1. 有设备令牌 -> 向服务器换取新访问令牌；
 * 2. 没有设备令牌但本地访问令牌仍有效 -> 直接进入；
 * 3. 否则需要密码登录。
 */
export function resumeSession() {
	const offlineAllowed = () => canUseOfflinePatrol() && getQuickLogin()?.username === getUser()?.username;
	if (navigator.onLine === false && offlineAllowed()) {
		unlockOfflinePatrol();
		return Promise.resolve({ offline: true });
	}
	if (getDeviceToken()) {
		return loginWithDeviceToken().catch((err) => {
			if (err && err.code === 'network' && offlineAllowed()) {
				unlockOfflinePatrol();
				return { offline: true };
			}
			return Promise.reject(err);
		});
	}
	if (isTokenFresh()) {
		return Promise.resolve({ cached: true, exp: getTokenExpiry(getToken()) });
	}
	return Promise.reject({ code: 'no_device_token', message: '登录已过期，请输入密码登录' });
}

// 开通快捷登录：保存本地设置并向服务器申请设备令牌（失败时仍保留本地解锁能力）。
export function enableQuickLogin(user, patch) {
	const current = getQuickLogin();
	const base = current && current.username === user.username ? current : { gestureHash: '', biometric: '' };
	const next = {
		...base,
		...patch,
		username: user.username,
		fullName: user.full_name || user.username,
		failures: 0,
	};
	saveQuickLogin(next);
	markSetupAsked(user.username);
	return issueDeviceToken().then(
		() => ({ settings: next, serverBacked: true }),
		(err) => ({ settings: next, serverBacked: false, error: err }),
	);
}

export function disableQuickLoginMethod(method) {
	const settings = getQuickLogin();
	if (!settings) {
		return null;
	}
	if (method === 'gesture') {
		settings.gestureHash = '';
	} else {
		settings.biometric = '';
	}
	if (!hasQuickLogin(settings)) {
		clearQuickLogin();
		return null;
	}
	saveQuickLogin(settings);
	return settings;
}
