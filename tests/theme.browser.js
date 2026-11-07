// 在运行中的开发服务器页面执行 (await import('/tests/theme.browser.js')).runThemeTests()。
import { createApp, nextTick } from 'vue';
import CoordinateCollectCard from '../src/components/CoordinateCollectCard.vue';
import { hideLoading, showLoading, showModal, toast } from '../src/lib/ui.js';

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

function rgba(value) {
	const parts = value.match(/[\d.]+/g)?.map(Number);
	assert(parts && parts.length >= 3, `无法解析颜色：${value}`);
	return [parts[0], parts[1], parts[2], parts[3] ?? 1];
}

function contrast(foreground, background) {
	const fg = rgba(foreground);
	const bg = rgba(background);
	const blended = bg.slice(0, 3).map((value) => value * bg[3] + 255 * (1 - bg[3]));
	const luminance = (rgb) => {
		const linear = rgb.map((value) => {
			const n = value / 255;
			return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
		});
		return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
	};
	const a = luminance(fg.slice(0, 3));
	const b = luminance(blended);
	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export async function runThemeTests() {
	const root = document.documentElement;
	const previousTheme = root.dataset.theme;
	const previousColor = root.dataset.color;
	const host = document.createElement('div');
	document.body.appendChild(host);
	const app = createApp(CoordinateCollectCard);
	app.mount(host);
	try {
		for (let index = 0; index < 5; index++) {
			host.querySelector('button').click();
			await nextTick();
			const pointWindow = host.querySelector('.point-window');
			assert(pointWindow, '坐标窗口未打开');
			pointWindow.querySelector('button').click();
			await nextTick();
		}
		for (const theme of ['light', 'dark']) {
			root.dataset.theme = theme;
			for (const color of ['green', 'blue', 'brown', 'plum']) {
				root.dataset.color = color;
				for (const button of host.querySelectorAll('button')) {
					if (!button.textContent.includes('打开坐标窗口')) continue;
					button.click();
					await nextTick();
					const pointWindow = host.querySelector('.point-window');
					const pointStyle = getComputedStyle(pointWindow);
					assert(rgba(pointStyle.backgroundColor)[3] === 1, `${theme}/${color} 坐标窗口背景透明`);
					const text = getComputedStyle(pointWindow.querySelector('span'));
					assert(contrast(text.color, pointStyle.backgroundColor) >= 4.5, `${theme}/${color} 坐标窗口文字对比度不足`);
					pointWindow.querySelector('button').click();
					await nextTick();
				}
			}
			const notice = await toast('当前已是最新版本', { duration: 0 });
			await nextTick();
			const toastElement = document.querySelector('.van-toast');
			assert(toastElement, `${theme} Toast 未显示`);
			let style = getComputedStyle(toastElement);
			assert(contrast(style.color, style.backgroundColor) >= 4.5, `${theme} Toast 文字对比度不足`);
			notice.close();
			await new Promise((resolve) => setTimeout(resolve, 400));
			await showLoading('正在定位');
			await nextTick();
			const loading = document.querySelector('.van-toast--loading');
			assert(loading, `${theme} 定位提示未显示`);
			style = getComputedStyle(loading);
			assert(contrast(style.color, style.backgroundColor) >= 4.5, `${theme} 加载提示文字对比度不足`);
			assert(contrast(getComputedStyle(loading.querySelector('.van-loading')).color, style.backgroundColor) >= 4.5, `${theme} 加载图标对比度不足`);
			await hideLoading();
			await new Promise((resolve) => setTimeout(resolve, 400));
			const modal = showModal({ title: '定位提示', content: '请检查定位权限', showCancel: false });
			await nextTick();
			const dialog = document.querySelector('.van-dialog');
			assert(dialog, `${theme} 对话框未显示`);
			const background = getComputedStyle(dialog).backgroundColor;
			for (const selector of ['.van-dialog__header', '.van-dialog__message']) {
				assert(contrast(getComputedStyle(dialog.querySelector(selector)).color, background) >= 4.5, `${theme} 对话框 ${selector} 对比度不足`);
			}
			dialog.querySelector('.van-dialog__confirm').click();
			await modal;
			await new Promise((resolve) => setTimeout(resolve, 400));
		}
		return '浅色、暗色及四种主题色的坐标窗口、提示和对话框对比度检查通过';
	} finally {
		app.unmount();
		host.remove();
		root.dataset.theme = previousTheme;
		root.dataset.color = previousColor;
	}
}
