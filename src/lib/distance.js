function coordinate(value, limit) {
	if (value === null || value === undefined || typeof value === 'boolean' || (typeof value === 'string' && !value.trim())) return null;
	const number = Number(value);
	return Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
}

export function distanceMeters(from, to) {
	const lat1 = coordinate(from?.latitude, 90);
	const lon1 = coordinate(from?.longitude, 180);
	const lat2 = coordinate(to?.latitude, 90);
	const lon2 = coordinate(to?.longitude, 180);
	if ([lat1, lon1, lat2, lon2].some(value => value === null)) return null;
	const radians = value => value * Math.PI / 180;
	const dLat = radians(lat2 - lat1);
	const dLon = radians(lon2 - lon1);
	const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
	const bounded = Math.min(1, Math.max(0, a));
	return 6371000 * 2 * Math.atan2(Math.sqrt(bounded), Math.sqrt(1 - bounded));
}

export function distanceLabel(meters) {
	if (meters === null || meters === undefined || meters === '') return '无法计算';
	const value = Number(meters);
	if (!Number.isFinite(value) || value < 0) return '无法计算';
	return value < 1000 ? `约 ${Math.round(value)} 米` : `约 ${(value / 1000).toFixed(value < 10000 ? 1 : 0)} 公里`;
}
