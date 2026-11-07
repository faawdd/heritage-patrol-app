// 在运行中的开发服务器页面执行 (await import('/tests/patrol-distance.browser.js')).runPatrolDistanceTests()。
import { createApp, h, nextTick } from 'vue';
import RecordsPage from '../src/views/RecordsPage.vue';

export async function runPatrolDistanceTests() {
	const host = document.createElement('div');
	document.body.appendChild(host);
	const record = { id: 1, site_name: '测试文物点', inspect_time: '2026-01-01 10:00', is_normal: true, distance_meters: 123.4 };
	const pending = { key: 'p', site_name: '待同步文物点', inspect_time: '2026-01-01T10:00:00Z', photos: [], distance_meters: 0 };
	const page = {
		...RecordsPage,
		activated() {},
		mounted() {},
		beforeUnmount() {},
		data() { return { ...RecordsPage.data(), records: [record], pending: [pending] }; },
	};
	const app = createApp({ render: () => h(page) });
	try {
		app.mount(host);
		await nextTick();
		if (!host.textContent.includes('距文物点直线距离：约 123 米')) throw new Error('已同步记录的距离未显示');
		if (!host.textContent.includes('距文物点直线距离：约 0 米')) throw new Error('待同步记录的距离未显示');
		return '巡查记录及待同步距离渲染通过';
	} finally {
		app.unmount();
		host.remove();
	}
}
