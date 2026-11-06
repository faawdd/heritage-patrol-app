// 外观设置：主题模式（跟随系统/浅色/深色）、主题色、字体大小。
// 通过 <html> 上的 data-theme / data-color / data-font 属性驱动 CSS 变量切换。
import { reactive } from 'vue';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { getJSON, setItem } from './storage.js';

const STORAGE_KEY = 'app_settings';

export const THEME_MODES = [
	{ key: 'system', name: '跟随系统', icon: 'refresh' },
	{ key: 'light', name: '浅色', icon: 'eye' },
	{ key: 'dark', name: '深色', icon: 'eye-off' },
];

export const THEME_COLORS = [
	{
		key: 'green',
		name: '绿色',
		hex: '#477F5F',
		onPrimary: '#FFFFFF',
		palette: ['#A7C9B2', '#8FB69D', '#78A688', '#5D8B6D', '#477F5F'],
	},
	{
		key: 'blue',
		name: '蓝色',
		hex: '#456985',
		onPrimary: '#FFFFFF',
		palette: ['#A8C1D0', '#8EADC1', '#7599B2', '#5C82A1', '#456985'],
	},
	{
		key: 'brown',
		name: '棕色',
		hex: '#86664B',
		onPrimary: '#FFFFFF',
		palette: ['#C4B09C', '#B5A08B', '#A38B73', '#977757', '#86664B'],
	},
	{
		key: 'plum',
		name: '紫色',
		hex: '#70618E',
		onPrimary: '#FFFFFF',
		palette: ['#B4A9C3', '#A397B5', '#9083A6', '#7D7096', '#70618E'],
	},
];

export const FONT_SIZES = [
	{ key: 'small', name: '小', px: 15 },
	{ key: 'standard', name: '标准', px: 16 },
	{ key: 'large', name: '大', px: 17.5 },
	{ key: 'xlarge', name: '特大', px: 19 },
];

const DEFAULTS = { theme: 'system', color: 'green', fontSize: 'standard' };

function sanitize(raw) {
	const value = raw && typeof raw === 'object' ? raw : {};
	return {
		theme: THEME_MODES.some(item => item.key === value.theme) ? value.theme : DEFAULTS.theme,
		color: THEME_COLORS.some(item => item.key === value.color) ? value.color : DEFAULTS.color,
		fontSize: FONT_SIZES.some(item => item.key === value.fontSize) ? value.fontSize : DEFAULTS.fontSize,
	};
}

export const settings = reactive(sanitize(getJSON(STORAGE_KEY)));

let systemDarkMedia = null;

export function isDarkActive() {
	if (settings.theme === 'dark') return true;
	if (settings.theme === 'light') return false;
	return !!(systemDarkMedia || window.matchMedia('(prefers-color-scheme: dark)')).matches;
}

function syncStatusBar() {
	if (!Capacitor.isNativePlatform()) return;
	const dark = isDarkActive();
	const surface = getComputedStyle(document.documentElement).getPropertyValue('--c-surface').trim();
	// Style.Dark = 深色背景配浅色图标；Style.Light = 浅色背景配深色图标。
	StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
	StatusBar.setBackgroundColor({ color: surface || (dark ? '#1C211E' : '#FFFFFF') }).catch(() => {});
}

export function applySettings() {
	const root = document.documentElement;
	root.dataset.theme = isDarkActive() ? 'dark' : 'light';
	root.dataset.color = settings.color;
	root.dataset.font = settings.fontSize;
	syncStatusBar();
}

export function updateSettings(patch) {
	Object.assign(settings, sanitize({ ...settings, ...patch }));
	setItem(STORAGE_KEY, JSON.stringify({ theme: settings.theme, color: settings.color, fontSize: settings.fontSize }));
	applySettings();
}

export function initSettings() {
	if (!systemDarkMedia && typeof window.matchMedia === 'function') {
		systemDarkMedia = window.matchMedia('(prefers-color-scheme: dark)');
		const onChange = () => { if (settings.theme === 'system') applySettings(); };
		if (typeof systemDarkMedia.addEventListener === 'function') systemDarkMedia.addEventListener('change', onChange);
		else if (typeof systemDarkMedia.addListener === 'function') systemDarkMedia.addListener(onChange);
	}
	applySettings();
}

export default { settings, THEME_MODES, THEME_COLORS, FONT_SIZES, initSettings, applySettings, updateSettings, isDarkActive };
