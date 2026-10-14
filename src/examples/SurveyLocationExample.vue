<template>
	<section>
		<h2>高精度打点与巡查轨迹</h2>
		<HighAccuracyCapture @captured="point = $event" />
		<p v-if="point">已采集 {{ point.sampleCount }} 个样本，保守报告半径 {{ point.accuracy }} 米。</p>
		<van-button :disabled="busy || foreground || !!sessionId" @click="startForeground">开始前台轨迹</van-button>
		<van-button :disabled="busy || foreground || !!sessionId" @click="startBackground">开始锁屏巡查</van-button>
		<van-button :disabled="busy || (!foreground && !sessionId)" @click="stop">停止记录</van-button>
		<van-button :disabled="busy" @click="reloadHistory">读取本机历史</van-button>
		<van-button :disabled="busy" @click="refresh">刷新后台状态</van-button>
		<p>前台轨迹：{{ foreground ? '记录中' : '已停止' }}；后台会话：{{ sessionId || '未记录' }}</p>
		<p>界面最近 {{ points.length }} 个平滑点。锁屏原始轨迹独立保存在本机，不随页面关闭而删除。</p>
		<p v-if="error" role="alert">{{ error }}</p>
		<ul>
			<li v-for="item in history" :key="item.sessionId">
				<van-button @click="replay(item.sessionId)">查看 {{ new Date(item.startedAt).toLocaleString() }}</van-button>
				{{ item.error?.message || (item.stoppedAt ? '已结束' : '记录中') }}
			</li>
		</ul>
	</section>
</template>

<script setup lang="ts">
/**
 * Vue 3 调用示例：可放入管理员现场采集/巡查工具页。
 * React 可直接使用相同服务类，在 effect 清理中取消采样并 stop() 前台监听。
 * 不以 JS setInterval 采 GPS；此处定时器只在界面可见时读取原生已落盘数据。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { App } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import HighAccuracyCapture from '../components/HighAccuracyCapture.vue';
import { TrackFilter, TrackService, backgroundBackend, locationError, locationSource } from '../lib/location/index.ts';
import type { BackgroundTrack, SurveyPoint, TrackPoint } from '../lib/location/index.ts';

const track = new TrackService(locationSource, backgroundBackend);
const point = ref<SurveyPoint | null>(null);
const points = ref<TrackPoint[]>([]);
const history = ref<BackgroundTrack[]>([]);
const foreground = ref(false);
const sessionId = ref<string | null>(null);
const busy = ref(false);
const error = ref('');
let filter = new TrackFilter();
let cursor = 0;
let displayedSession: string | null = null;
let reading = false;
let disposed = false;
let listener: PluginListenerHandle | null = null;
let poll: ReturnType<typeof setInterval> | null = null;

function append(values: TrackPoint[]): void {
	// 只限制绘图缓冲，不截断 SQLite 的持久轨迹；按 segment 分段画线，保留 raw 以便审计。
	points.value = [...points.value, ...values].slice(-5000);
}

async function startForeground(): Promise<void> {
	busy.value = true; error.value = ''; points.value = [];
	try {
		await track.start({
			onPoint: value => append([value]),
			onRejected: reason => { error.value = `已剔除噪点：${reason}`; },
			onError: failure => { error.value = failure.message; foreground.value = false; },
		});
		foreground.value = true;
	} catch (failure) { error.value = locationError(failure).message; }
	finally { busy.value = false; }
}

async function startBackground(): Promise<void> {
	busy.value = true; error.value = '';
	try {
		// 内部检查精确位置、通知和前台可见状态；不在退到后台后偷偷启动 FGS。
		sessionId.value = await track.startBackground();
		displayedSession = sessionId.value;
		filter = new TrackFilter(); cursor = 0; points.value = [];
	} catch (failure) { error.value = locationError(failure).message; }
	finally { busy.value = false; }
}

async function stop(): Promise<void> {
	busy.value = true; error.value = '';
	try {
		if (foreground.value) { await track.stop(); foreground.value = false; }
		else { await track.stopBackground(); sessionId.value = null; }
		await refresh();
	} catch (failure) { error.value = locationError(failure).message; }
	finally { busy.value = false; }
}

async function refresh(): Promise<void> {
	if (reading || !backgroundBackend || disposed) return;
	reading = true;
	try {
		const status = await track.backgroundStatus();
		sessionId.value = status.sessionId;
		if (status.error) error.value = locationError(status.error).message;
		if (!displayedSession && status.sessionId) {
			displayedSession = status.sessionId;
			filter = new TrackFilter(); cursor = 0; points.value = [];
		}
		if (displayedSession) {
			// 分页游标即使该页全是噪点也前移；避免重复回放或死循环。
			for (let pageCount = 0; pageCount < 10; pageCount++) {
				const page = await track.readBackgroundPage(displayedSession, cursor, filter);
				append(page.points);
				if (page.error) error.value = locationError(page.error).message;
				if (page.cursor === cursor) break;
				cursor = page.cursor;
			}
		}
	} catch (failure) { error.value = locationError(failure).message; }
	finally { reading = false; }
}

async function reloadHistory(): Promise<void> {
	try { history.value = await track.listBackgroundTracks(); }
	catch (failure) { error.value = locationError(failure).message; }
}

async function replay(id: string): Promise<void> {
	if (reading) return;
	displayedSession = id; cursor = 0; filter = new TrackFilter(); points.value = [];
	await refresh();
}

onMounted(async () => {
	try {
		listener = await App.addListener('appStateChange', state => { if (state.isActive) void refresh(); });
		if (disposed) { await listener.remove(); return; }
		poll = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 3000);
		await refresh();
	} catch (failure) { error.value = locationError(failure).message; }
});

onBeforeUnmount(() => {
	disposed = true;
	if (poll) clearInterval(poll);
	if (listener) void listener.remove().catch(failure => console.error('应用状态监听清理失败', failure));
	// 后台服务由明确的“停止记录”/通知停止按钮控制；页面卸载不应中断锁屏巡查。
	if (foreground.value || (track.running && !sessionId.value)) {
		void track.stop().catch(failure => console.error('前台轨迹停止失败', failure));
	}
});
</script>
