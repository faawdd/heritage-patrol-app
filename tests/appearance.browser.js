// 在运行中的开发服务器页面执行 (await import('/tests/appearance.browser.js')).runAppearanceTests()。
import { createApp, h, nextTick } from 'vue';
import EmptyState from '../src/components/EmptyState.vue';
import { heritageLevelAccent } from '../src/lib/heritage-level.js';
import AdminPage from '../src/views/AdminPage.vue';

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

export async function runAdminNarrowTest() {
	const host = document.createElement('div');
	host.style.cssText = 'position:fixed;inset:0;width:320px;height:640px;z-index:9999';
	document.body.appendChild(host);
	const page = {
		...AdminPage,
		activated() {},
		mounted() {},
		beforeUnmount() {},
		data() {
			return {
				...AdminPage.data(),
				heritages: [{ id: 1, sip_code: '123456789012345', name: '测试文物遗址名称', category: '古建筑', level: '全国重点文物保护单位' }],
			};
		},
	};
	const app = createApp(page);
	app.config.globalProperties.$route = { query: {} };
	app.config.globalProperties.$router = { push() {}, back() {} };
	try {
		app.mount(host);
		await nextTick();
		const row = host.querySelector('.heritage-row');
		const name = host.querySelector('.heritage-name');
		const badge = host.querySelector('.heritage-level');
		assert(row && name && badge, '文物列表未显示');
		assert(name.getBoundingClientRect().width >= 40, '窄屏文物名称显示空间不足');
		assert(row.scrollWidth <= row.clientWidth + 2, '窄屏文物列表溢出');
		assert(badge.textContent === '国保' && badge.getAttribute('aria-label') === '全国重点文物保护单位', '文物等级显示不正确');
		return '320px 宽文物列表名称及等级显示检查通过';
	} finally {
		app.unmount();
		host.remove();
	}
}

function rgb(value) {
	const parts = value.match(/[\d.]+/g)?.map(Number);
	assert(parts && parts.length >= 3, `无法解析颜色：${value}`);
	return [parts[0], parts[1], parts[2], parts[3] ?? 1];
}

function contrast(foreground, background, surface) {
	const fg = rgb(foreground);
	const bg = rgb(background);
	const base = rgb(surface);
	const blended = bg.slice(0, 3).map((value, i) => value * bg[3] + base[i] * (1 - bg[3]));
	const luminance = (values) => {
		const linear = values.map(value => {
			const n = value / 255;
			return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
		});
		return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
	};
	const a = luminance(fg);
	const b = luminance(blended);
	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export async function runAppearanceTests() {
	const root = document.documentElement;
	const previousTheme = root.dataset.theme;
	const previousColor = root.dataset.color;
	const host = document.createElement('div');
	host.style.width = '288px';
	document.body.appendChild(host);
	const levels = ['全国重点文物保护单位', '省（自治区、直辖市）级文物保护单位', '市（县）级文物保护单位', '尚未定级的不可移动文物'];
	const app = createApp({
		render: () => h('div', { class: 'u-card' }, [
			...levels.map(level => h('div', { class: ['level-badge', heritageLevelAccent(level)], style: 'max-width: 50%; overflow-wrap: anywhere' }, level)),
			h(EmptyState, { message: '暂无采集记录', hint: '开始现场采集后，记录将显示在这里。' }, { default: () => h('button', '去采集') }),
		]),
	});
	app.mount(host);
	try {
		for (const theme of ['light', 'dark']) {
			root.dataset.theme = theme;
			for (const color of ['green', 'blue', 'brown', 'plum']) {
				root.dataset.color = color;
				await nextTick();
				const card = host.querySelector('.u-card');
				const surface = getComputedStyle(card).backgroundColor;
				for (const badge of host.querySelectorAll('.level-badge')) {
					const style = getComputedStyle(badge);
					assert(contrast(style.color, style.backgroundColor, surface) >= 4.5, `${theme}/${color} ${badge.textContent} 对比度不足`);
					assert(badge.getBoundingClientRect().right <= card.getBoundingClientRect().right, `${theme}/${color} 标签超出卡片`);
				}
				assert(getComputedStyle(card).boxShadow.includes('inset'), `${theme}/${color} 卡片高光缺失`);
				assert(host.querySelector('svg[aria-hidden="true"]') && host.querySelector('button').textContent === '去采集', '空状态插画或操作缺失');
				assert(host.scrollWidth <= host.clientWidth, `${theme}/${color} 窄屏内容溢出`);
			}
		}
		return '深浅主题、四种配色下等级标签对比度、窄屏布局及空状态检查通过';
	} finally {
		app.unmount();
		host.remove();
		if (previousTheme === undefined) delete root.dataset.theme; else root.dataset.theme = previousTheme;
		if (previousColor === undefined) delete root.dataset.color; else root.dataset.color = previousColor;
	}
}
