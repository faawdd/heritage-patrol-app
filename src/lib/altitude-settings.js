const SETTINGS_KEY = 'heritage_altitude_settings';

export const DEFAULT_ALTITUDE_SETTINGS = Object.freeze({
	source: 'both',
	method: 'average',
	sampleCount: 3,
	seaLevelPressure: 1013.25,
});

export function validateAltitudeSettings(settings) {
	if (!settings || !['both', 'gps', 'barometer'].includes(settings.source)) throw new Error('请选择有效的海拔来源');
	if (!['average', 'median'].includes(settings.method)) throw new Error('请选择有效的处理方式');
	if (![2, 3, 5].includes(Number(settings.sampleCount))) throw new Error('请选择有效的采样次数');
	const pressure = Number(settings.seaLevelPressure);
	if (settings.seaLevelPressure === '' || !Number.isFinite(pressure) || pressure < 870 || pressure > 1085) {
		throw new Error('海平面参考气压须在 870–1085 hPa 之间');
	}
	return {
		source: settings.source,
		method: settings.method,
		sampleCount: Number(settings.sampleCount),
		seaLevelPressure: pressure,
	};
}

export function loadAltitudeSettings() {
	const raw = window.localStorage.getItem(SETTINGS_KEY);
	if (raw === null) return { ...DEFAULT_ALTITUDE_SETTINGS };
	let settings;
	try {
		settings = JSON.parse(raw);
	} catch {
		throw new Error('海拔设置无法读取，请到软件设置中重新保存');
	}
	return validateAltitudeSettings(settings);
}

export function saveAltitudeSettings(settings) {
	const validated = validateAltitudeSettings(settings);
	window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(validated));
	return validated;
}
