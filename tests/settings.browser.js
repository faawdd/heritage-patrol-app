// 在运行中的开发服务器页面执行 (await import('/tests/settings.browser.js')).runSettingsTests()。
import { createApp, nextTick } from 'vue';
import SettingsPage from '../src/views/SettingsPage.vue';
import { DEFAULT_ALTITUDE_SETTINGS, loadAltitudeSettings } from '../src/lib/altitude-settings.js';
import { settings, updateSettings } from '../src/lib/settings.js';

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

export async function runSettingsTests() {
	const oldPrefs = { ...settings };
	const altitudeKey = 'heritage_altitude_settings';
	const oldAltitude = localStorage.getItem(altitudeKey);
	const host = document.createElement('div');
	document.body.appendChild(host);
	const app = createApp(SettingsPage);
	try {
		localStorage.removeItem(altitudeKey);
		app.mount(host);
		await nextTick();
		const sections = [...host.querySelectorAll('details.settings-section')];
		assert(sections.length === 4, '设置分区数量错误');
		assert(sections.every(section => !section.open), '设置分区应默认折叠');
		assert(sections.map(section => section.querySelector('summary').textContent.trim()).join('|') === '海拔获取设置|深色模式|主题色|字体大小', '设置分区名称错误');

		sections[0].querySelector('summary').click();
		await nextTick();
		assert(sections[0].open && sections.slice(1).every(section => !section.open), '展开海拔设置失败');
		const source = sections[0].querySelector('select');
		source.value = 'gps';
		source.dispatchEvent(new Event('change', { bubbles: true }));
		await nextTick();
		sections[0].querySelector('summary').click();
		sections[0].querySelector('summary').click();
		await nextTick();
		assert(source.value === 'gps', '折叠丢失了未保存的设置');
		sections[0].querySelector('button').click();
		assert(loadAltitudeSettings().source === 'gps', '海拔设置保存失败');
		assert(loadAltitudeSettings().sampleCount === DEFAULT_ALTITUDE_SETTINGS.sampleCount, '海拔默认值发生变化');

		sections[1].querySelector('summary').click();
		await nextTick();
		assert(sections[0].open && sections[1].open, '分区应可独立展开');
		const dark = [...sections[1].querySelectorAll('button')].find(button => button.textContent.includes('深色'));
		dark.click();
		await nextTick();
		assert(settings.theme === 'dark' && document.documentElement.dataset.theme === 'dark', '主题切换失败');

		sections[2].querySelector('summary').click();
		sections[3].querySelector('summary').click();
		await nextTick();
		assert(sections[2].querySelectorAll('.color-option').length === 4, '主题色选项缺失');
		assert(sections[3].querySelectorAll('button').length === 4, '字号选项缺失');
		return '分区默认折叠、独立展开、设置保存及主题切换检查通过';
	} finally {
		app.unmount();
		host.remove();
		updateSettings(oldPrefs);
		if (oldAltitude == null) localStorage.removeItem(altitudeKey);
		else localStorage.setItem(altitudeKey, oldAltitude);
	}
}
