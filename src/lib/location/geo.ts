import type { LocationFix, SurveyPoint } from './types.ts';
import { LocationError } from './types.ts';

const EARTH_RADIUS = 6371008.8;
const RAD = Math.PI / 180;
export const wrapLongitude = (value: number): number => ((value + 180) % 360 + 360) % 360 - 180;

/** 局部切平面按米运算，避免对经纬度直接套用“米”的卡尔曼噪声。跨日期变更线也可用。 */
export function project(latitude: number, longitude: number, origin: { latitude: number; longitude: number }): [number, number] {
	return [
		wrapLongitude(longitude - origin.longitude) * RAD * EARTH_RADIUS * Math.cos(origin.latitude * RAD),
		(latitude - origin.latitude) * RAD * EARTH_RADIUS,
	];
}

export function unproject(x: number, y: number, origin: { latitude: number; longitude: number }): { latitude: number; longitude: number } {
	const cos = Math.cos(origin.latitude * RAD);
	if (Math.abs(cos) < 1e-6) throw new LocationError('UNSUPPORTED', '极点附近不支持此局部平面滤波，请使用专用测量工具。');
	return { latitude: origin.latitude + y / EARTH_RADIUS / RAD, longitude: wrapLongitude(origin.longitude + x / (EARTH_RADIUS * cos) / RAD) };
}

export function distance(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
	const lat = (b.latitude - a.latitude) * RAD;
	const lng = wrapLongitude(b.longitude - a.longitude) * RAD;
	const h = Math.sin(lat / 2) ** 2 + Math.cos(a.latitude * RAD) * Math.cos(b.latitude * RAD) * Math.sin(lng / 2) ** 2;
	return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

/** 缓存、重复、未来时间、无效精度和模拟位置都不能充当独立有效样本。 */
export function invalidFix(fix: LocationFix, now: number, maxAgeMs: number, maxAccuracy: number): string | null {
	const c = fix.coords;
	if (!Number.isFinite(c.latitude) || Math.abs(c.latitude) > 90 || !Number.isFinite(c.longitude) || Math.abs(c.longitude) > 180) return '经纬度无效';
	if (!Number.isFinite(fix.timestamp) || fix.timestamp <= 0 || fix.timestamp > now + 2000 || now - fix.timestamp > maxAgeMs) return '坐标时间过期或无效';
	if (!Number.isFinite(c.accuracy) || c.accuracy <= 0 || c.accuracy > maxAccuracy) return '水平精度未达到阈值';
	if (fix.mocked) return '模拟位置不能用于现场采集';
	return null;
}

/** 静止点采用 1/accuracy² 权重。海拔缺失保持 null，不以 0 或水平精度代替。 */
export function averageFixes(fixes: readonly LocationFix[], method: 'weighted' | 'arithmetic', rejectedCount: number): SurveyPoint {
	const first = fixes[0];
	if (!first) throw new LocationError('UNAVAILABLE', '没有有效样本，不能生成坐标。');
	const origin = first.coords;
	const altitudeFixes = fixes.filter(f => f.coords.altitude !== null && Number.isFinite(f.coords.altitude));
	const verticalWeighted = method === 'weighted' && altitudeFixes.every(f => f.coords.altitudeAccuracy != null && Number.isFinite(f.coords.altitudeAccuracy) && f.coords.altitudeAccuracy > 0);
	let x = 0, y = 0, sum = 0, altitude = 0, altitudeWeight = 0;
	const vertical: number[] = [];
	for (const fix of fixes) {
		const c = fix.coords;
		const weight = method === 'arithmetic' ? 1 : 1 / Math.max(c.accuracy, 0.5) ** 2;
		const [px, py] = project(c.latitude, c.longitude, origin);
		x += px * weight;
		y += py * weight;
		sum += weight;
		if (c.altitude !== null && Number.isFinite(c.altitude)) {
			const validVertical = c.altitudeAccuracy != null && Number.isFinite(c.altitudeAccuracy) && c.altitudeAccuracy > 0;
			// 有任何海拔缺少垂直精度时统一算术平均，避免让“未知精度”获得最高权重。
			const aw = verticalWeighted ? 1 / Math.max(c.altitudeAccuracy!, 0.5) ** 2 : 1;
			altitude += c.altitude * aw;
			altitudeWeight += aw;
			if (validVertical) vertical.push(c.altitudeAccuracy!);
		}
	}
	const center = unproject(x / sum, y / sum, origin);
	return {
		...center,
		altitude: altitudeWeight ? altitude / altitudeWeight : null,
		altitudeAccuracy: vertical.length === altitudeFixes.length && vertical.length
			? Math.max(...vertical) : null,
		timestamp: Math.max(...fixes.map(f => f.timestamp)),
		startedAt: first.timestamp,
		sampleCount: fixes.length,
		rejectedCount,
		bestAccuracyRadius: Math.min(...fixes.map(f => f.coords.accuracy)),
		accuracy: Math.max(...fixes.map(f => f.coords.accuracy)),
		spreadMeters: Math.max(...fixes.map(f => distance(center, f.coords))),
		method,
		crs: 'WGS84',
	};
}
