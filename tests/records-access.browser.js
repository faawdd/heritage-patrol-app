// 在运行中的开发服务器页面执行 (await import('/tests/records-access.browser.js')).runRecordsAccessTests()。
import { createApp, h, nextTick } from 'vue';
import RecordsPage from '../src/views/RecordsPage.vue';

export async function runRecordsAccessTests() {
	const host = document.createElement('div');
	document.body.appendChild(host);
	const records = [
		{ id: 1, site_name: '文物一', inspector_name: '看护员甲', inspect_time: '2026-01-01 10:00', is_normal: true },
		{ id: 2, site_name: '文物二', inspector_name: '管理员乙', inspect_time: '2026-01-01 11:00', is_normal: false },
	];
	const page = {
		...RecordsPage,
		activated() {},
		mounted() {},
		beforeUnmount() {},
		data() { return { ...RecordsPage.data(), records, counts: { all: 3, ok: 1, bad: 2 }, page: 1, pages: 2 }; },
		methods: { ...RecordsPage.methods, load() { this.records = [records[1]]; return Promise.resolve(); } },
	};
	const app = createApp({ render: () => h(page) });
	try {
		app.mount(host);
		await nextTick();
		if (!host.textContent.includes('巡查员：看护员甲')) throw new Error('巡查员姓名未显示');
		let buttons = [...host.querySelectorAll('button')].filter(button => button.textContent.includes('下一页'));
		if (buttons.length !== 1) throw new Error(`分页按钮数量不正确：${buttons.length}`);
		buttons[0].click();
		await nextTick();
		if (!host.textContent.includes('第 2 / 2 页') || !host.textContent.includes('巡查员：管理员乙')) throw new Error('分页切换未显示正确记录');
		buttons = [...host.querySelectorAll('button')].filter(button => button.textContent.includes('有问题'));
		buttons[0].click();
		await nextTick();
		if (!host.textContent.includes('第 1 / 2 页')) throw new Error('切换筛选未返回第一页');
		return '巡查员信息、分页和状态筛选渲染通过';
	} finally {
		app.unmount();
		host.remove();
	}
}
