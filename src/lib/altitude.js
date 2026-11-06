import { validateAltitudeSettings } from './altitude-settings.js';

function validAltitude(value) {
	if (value == null || value === '') return null;
	const n = Number(value);
	return Number.isFinite(n) && n >= -500 && n <= 9000 ? n : null;
}

export function pressureAltitude(pressure, seaLevelPressure) {
	if (pressure == null || !Number.isFinite(pressure) || pressure < 300 || pressure > 1100) return null;
	return validAltitude(44330 * (1 - Math.pow(pressure / seaLevelPressure, 1 / 5.255)));
}

function aggregate(values, method) {
	if (!values.length) return null;
	if (method === 'average') return values.reduce((sum, value) => sum + value, 0) / values.length;
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export async function collectHardwareAltitude(settings, { getGpsLocation, getPressure }) {
	const options = validateAltitudeSettings(settings);
	const useGps = options.source !== 'barometer';
	const useBarometer = options.source !== 'gps';
	const gpsValues = [];
	const barometerValues = [];
	const warnings = [];
	let location = null;
	let timestamp = null;

	for (let i = 0; i < options.sampleCount; i++) {
		const [gpsResult, pressureResult] = await Promise.allSettled([
			getGpsLocation({
				timeout: i === 0 ? 12000 : 5000,
				useLastKnown: false,
				requireAltitude: useGps,
				newerThanTimestamp: timestamp,
			}),
			useBarometer ? getPressure({ timeout: 3000 }) : Promise.resolve(null),
		]);
		if (gpsResult.status === 'fulfilled') {
			const gps = gpsResult.value;
			const longitude = Number(gps.longitude);
			const latitude = Number(gps.latitude);
			if (gps.longitude != null && gps.latitude != null && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180 &&
				Number.isFinite(latitude) && latitude >= -90 && latitude <= 90) {
				if (timestamp == null || (gps.timestamp != null && gps.timestamp > timestamp)) {
					location = { longitude, latitude };
					timestamp = gps.timestamp ?? null;
					const altitude = validAltitude(gps.altitude);
					if (useGps && altitude != null) gpsValues.push(altitude);
				} else {
					warnings.push('GPS 返回重复定位');
				}
			} else {
				warnings.push('GPS 坐标无效');
			}
		} else if (!location) {
			throw gpsResult.reason;
		} else {
			warnings.push('部分 GPS 定位失败');
		}
		if (useBarometer) {
			if (pressureResult.status === 'rejected') {
				warnings.push('气压计读取失败');
			} else {
				const altitude = pressureAltitude(pressureResult.value, options.seaLevelPressure);
				if (altitude != null) barometerValues.push(altitude);
			}
		}
	}
	if (!location) throw new Error('未获取到有效 GPS 坐标');

	const gps = aggregate(gpsValues, options.method);
	const barometer = aggregate(barometerValues, options.method);
	const available = [gps, barometer].filter((value) => value != null);
	const altitude = available.length ? available.reduce((sum, value) => sum + value, 0) / available.length : null;
	if (useGps && gpsValues.length < options.sampleCount) warnings.push(`GPS 有效 ${gpsValues.length}/${options.sampleCount} 次`);
	if (useBarometer && barometerValues.length < options.sampleCount) warnings.push(`气压计有效 ${barometerValues.length}/${options.sampleCount} 次`);
	const details = [];
	if (gps != null) details.push(`GPS ${gps.toFixed(2)}m`);
	if (barometer != null) details.push(`气压估算 ${barometer.toFixed(2)}m`);
	const sourceTag = altitude == null
		? `未获取到海拔，请手动录入${warnings.length ? `（${[...new Set(warnings)].join('；')}）` : ''}`
		: `${details.join(' / ')}；${options.method === 'average' ? '平均' : '中位数'}处理${warnings.length ? `（${[...new Set(warnings)].join('；')}）` : ''}`;
	return { ...location, altitude, sourceTag, sourceKey: altitude == null ? 'alert' : 'hardware' };
}
