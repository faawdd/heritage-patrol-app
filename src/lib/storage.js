// 同步键值存储（替代 uni.getStorageSync / setStorageSync），基于 WebView localStorage。
export function getItem(key) {
	try {
		const raw = window.localStorage.getItem(key);
		return raw === null ? '' : raw;
	} catch (error) {
		return '';
	}
}

export function setItem(key, value) {
	try {
		window.localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
	} catch (error) {
		// ignore quota errors
	}
}

export function removeItem(key) {
	try {
		window.localStorage.removeItem(key);
	} catch (error) {
		// ignore
	}
}

export function getJSON(key, fallback = null) {
	const raw = getItem(key);
	if (!raw) {
		return fallback;
	}
	try {
		return JSON.parse(raw);
	} catch (error) {
		return fallback;
	}
}

export default { getItem, setItem, removeItem, getJSON };
