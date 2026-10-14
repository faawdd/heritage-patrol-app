import { createApp, h, nextTick, ref } from 'vue';
import CoordinateCollectCard from '../src/components/CoordinateCollectCard.vue';
import { locationSource } from '../src/lib/location/capacitor.ts';

/** 无账号/服务器访问；真实组件使用模拟 GPS 连续流验证打点与手动编辑元数据。 */
export async function runSurveyBrowserTests() {
	const methods = {
		ensurePermission: locationSource.ensurePermission,
		watchPosition: locationSource.watchPosition,
		clearWatch: locationSource.clearWatch,
	};
	let callback;
	const cleared = [];
	let app;
	const points = ref([{ id: 'test-point', type: 'boundary', description: '测试边界点' }]);
	const results = [];
	const expect = (condition, message) => {
		if (!condition) throw new Error(message);
		results.push(message);
	};
	try {
		locationSource.ensurePermission = async () => {};
		locationSource.watchPosition = async (_interval, handler) => { callback = handler; return 'test-watch'; };
		locationSource.clearWatch = async id => { cleared.push(id); };
		const fixture = document.querySelector('#fixture');
		app = createApp({
			setup: () => () => h(CoordinateCollectCard, {
				modelValue: points.value,
				'onUpdate:modelValue': value => { points.value = value; },
				capturePointData: async () => { throw new Error('不应进入普通定位路径'); },
			}),
		});
		app.mount(fixture);
		await nextTick();
		fixture.querySelector('.btn-open').click();
		await nextTick();
		fixture.querySelector('.survey-capture button').click();
		await new Promise(resolve => setTimeout(resolve, 0));
		expect(fixture.querySelector('.btn-grab').disabled, '采样时禁用普通定位，避免互相覆盖');
		expect(!!callback, '高精度组件启动连续流');
		for (let index = 0; index < 10; index++) {
			callback({ timestamp: Date.now(), coords: { latitude: 42, longitude: 90, accuracy: 3, altitude: 0, altitudeAccuracy: 4, speed: 0, heading: null } });
			if (index < 9) await new Promise(resolve => setTimeout(resolve, 1010));
		}
		await new Promise(resolve => setTimeout(resolve, 0));
		await nextTick();
		expect(points.value[0].longitude === '90.00000000' && points.value[0].latitude === '42.00000000', '坐标正确回填当前点');
		expect(points.value[0].altitude === '0.00', '海拔0不被误判缺失');
		expect(points.value[0].survey?.sampleCount === 10, '有效样本和精度元数据随v-model保留');
		expect(cleared.length === 1 && cleared[0] === 'test-watch', '完成采样清理定位监听');
		expect(!!fixture.querySelector('.point-window'), 'v-model回写不更换本机点位id或关闭当前窗口');
		const longitude = fixture.querySelector('input[type="number"]');
		longitude.value = '91';
		longitude.dispatchEvent(new Event('input', { bubbles: true }));
		await nextTick();
		expect(points.value[0].survey === null, '手动改坐标后移除旧采样精度背书');
		return { passed: results.length, results };
	} finally {
		app?.unmount();
		Object.assign(locationSource, methods);
	}
}
