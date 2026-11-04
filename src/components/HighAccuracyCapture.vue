<template>
	<section class="bg-primary-light p-3 text-sm text-ink-2">
		<p class="mb-2">静止采集 10 个精度 ≤5 米的新样本。手机精度为估计值，不保证 1–3 米。</p>
		<van-button type="primary" plain native-type="button" :disabled="collecting || disabled" @click="capture">
			{{ collecting ? '高精度采样中…' : '静止高精度打点' }}
		</van-button>
		<van-button v-if="collecting" native-type="button" class="ml-1" @click="controller?.abort()">取消采样</van-button>
		<p v-if="progress" class="mt-2" aria-live="polite">
			第 {{ progress.attempt }} 次：{{ progress.accepted }}/{{ progress.target }} 个有效样本，
			剔除 {{ progress.rejected }} 个；
			当前精度 {{ progress.lastAccuracy?.toFixed(1) ?? '未知' }} 米。
			{{ progress.reason || '请保持静止，不要贴近墙面或遮挡天线。' }}
		</p>
		<p v-if="error" class="mt-2 text-warning" role="alert">{{ error }}</p>
		<p v-if="result" class="mt-2">
			WGS84：{{ result.longitude.toFixed(8) }}, {{ result.latitude.toFixed(8) }}；
			最佳样本半径 {{ result.bestAccuracyRadius.toFixed(1) }} 米，
			样本离散 {{ result.spreadMeters.toFixed(1) }} 米。
			GPS 海拔 {{ result.altitude?.toFixed(2) ?? '不可用' }} 米（未作高程校准）。
		</p>
	</section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { HighAccuracyLocationService, locationError, locationSource } from '../lib/location/index.ts';
import type { SampleProgress, SurveyPoint } from '../lib/location/index.ts';

defineProps<{ disabled?: boolean }>();
const emit = defineEmits<{ captured: [point: SurveyPoint]; collecting: [value: boolean] }>();
const collecting = ref(false);
const error = ref('');
const progress = ref<SampleProgress | null>(null);
const result = ref<SurveyPoint | null>(null);
const sampler = new HighAccuracyLocationService(locationSource);
let controller: AbortController | null = null;
let disposed = false;

async function capture(): Promise<void> {
	if (collecting.value) return;
	collecting.value = true;
	emit('collecting', true);
	error.value = '';
	result.value = null;
	progress.value = null;
	controller = new AbortController();
	const signal = controller.signal;
	try {
		// 严格模式：弱信号下宁可明确超时，也不将 20 米坐标伪装为高精度结果。
		const point = await sampler.collect({
			sampleCount: 10, maxAccuracyMeters: 5, timeoutMs: 60000, retries: 1,
			signal, onProgress: value => { progress.value = value; },
		});
		if (!signal.aborted) { result.value = point; emit('captured', point); }
	} catch (failure) { error.value = locationError(failure).message; }
	finally { collecting.value = false; controller = null; if (!disposed) emit('collecting', false); }
}

defineExpose({ cancel: () => controller?.abort() });
onBeforeUnmount(() => { disposed = true; controller?.abort(); });
</script>
