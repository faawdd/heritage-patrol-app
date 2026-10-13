export function pad(n) {
	return String(n).padStart(2, '0');
}

export function todayKey(date = new Date()) {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function monthKey(date = new Date()) {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function greeting(date = new Date()) {
	const h = date.getHours();
	if (h < 6) return '凌晨好';
	if (h < 11) return '早上好';
	if (h < 13) return '中午好';
	if (h < 18) return '下午好';
	return '晚上好';
}

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

export function dateLabel(date = new Date()) {
	return `${date.getMonth() + 1}月${date.getDate()}日 星期${WEEK[date.getDay()]}`;
}

// 将 "YYYY-MM-DD HH:MM" 显示为「今天 09:30 / 昨天 18:20 / 3月5日 10:00」
export function friendlyTime(value) {
	if (!value) return '';
	const text = String(value);
	const day = text.slice(0, 10);
	const time = text.slice(11, 16);
	const now = new Date();
	if (day === todayKey(now)) return `今天 ${time}`;
	const y = new Date(now.getTime() - 86400000);
	if (day === todayKey(y)) return `昨天 ${time}`;
	const parts = day.split('-');
	if (parts.length === 3) {
		const prefix = parts[0] === String(now.getFullYear()) ? '' : `${parts[0]}年`;
		return `${prefix}${Number(parts[1])}月${Number(parts[2])}日 ${time}`;
	}
	return text;
}

export function formatDistance(km) {
	const value = Number(km);
	if (!Number.isFinite(value)) return '';
	if (value < 1) return `${Math.round(value * 1000)} 米`;
	return `${value.toFixed(value < 10 ? 1 : 0)} 公里`;
}

export function getLocation() {
	return new Promise((resolve, reject) => {
		uni.getLocation({
			type: 'wgs84',
			isHighAccuracy: true,
			highAccuracyExpireTime: 4000,
			success: resolve,
			fail: reject,
		});
	});
}
