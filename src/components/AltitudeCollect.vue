<template>
	<!--
	AltitudeCollect.vue — 高精度海拔采集组件
	用法：<AltitudeCollect v-model="form.altitude" />
	-->
	<div class="alt-widget">

		<!-- ① 标签行（含数据来源徽标） -->
		<div class="alt-header">
			<span class="alt-label">海拔高程（米）</span>
			<div v-if="sourceLabel" :class="['alt-badge', sourceBadgeClass]">
				<span class="alt-badge-text">{{ sourceLabel }}</span>
			</div>
		</div>

		<!-- ② 输入框 + 自动采集按钮
		     ⚠ 输入框严禁设为 readonly/disabled，
		       普查员随时可手动录入专业 RTK 读数覆盖自动值！ -->
		<div class="alt-row">
			<input
				:value="altitude"
				type="number"
				inputmode="decimal"
				step="any"
				class="alt-input"
				placeholder="自动采集 或 手动填写"
				@input="onManualInput"
			/>
			<van-button
				native-type="button"
				:class="['alt-btn', collecting ? 'alt-btn--loading' : '']"
				:disabled="collecting"
				@click="startCollect"
			>
				<span v-if="!collecting">📡 一键采集</span>
				<span v-else class="alt-pulse">采集中…</span>
			</van-button>
		</div>

		<!-- ③ 状态提示行 -->
		<div v-if="statusMsg" :class="['alt-status', statusClass]">
			<span class="alt-status-text">{{ statusMsg }}</span>
		</div>

		<!-- ④ 技术详情（供专业人员核查） -->
		<div v-if="detailText" class="alt-detail">
			<span class="alt-detail-text">{{ detailText }}</span>
		</div>

	</div>
</template>

<script setup>
/**
 * AltitudeCollect.vue
 * =====================================================
 * 工作流：
 * 1. 点击【一键采集】→ 按钮立即进入 loading + disabled。
 * 2. 调用原生 GPS（getGpsLocation，Android 下直接读取 GPS 提供者）。
 * 3. 拿到经纬度后立刻请求 Django DEM 接口。
 * 4. 三段降级：
 *    A. DEM 成功：用 DEM altitude 覆盖输入框，标签=🟢 DEM国家高程校准。
 *    B. DEM 失败/弱网：用手机硬件 altitude 保底，标签=🟡 手机硬件高程(无网保底)。
 *    C. 网络失败且硬件 altitude 无效(0/null)：填 0.00，标签=🔴 信号断绝，请手动输入RTK手簿数据。
 *
 * 注意：输入框始终可编辑，允许文保员手工覆盖。
 */

import { ref, watch } from 'vue';
import config from '@/lib/config.js';
import { request } from '@/lib/request.js';
import { toast } from '@/lib/ui.js';
import { getLocation } from '@/lib/native.js';
import { getGpsLocation, getPressure } from '@/lib/sensors.js';

const DEM_TIMEOUT_MS = 15000;
const GPS_TIMEOUT_MS = 12000;
const BARO_TIMEOUT_MS = 3000;
const STD_PRESSURE_HPA = 1013.25;
const BARO_PRESSURE_MIN_HPA = 300;
const BARO_PRESSURE_MAX_HPA = 1100;
const ALTITUDE_MIN_M = -500;
const ALTITUDE_MAX_M = 9000;

const props = defineProps({
	modelValue: {
		type: [String, Number],
		default: '',
	},
	demApiUrl: {
		type: String,
		// script setup 中 defineProps 会被提升，默认值不能引用本地声明变量。
		default: `${config.API_BASE_URL}/api/dem-elevation-lookup/`,
	},
});

const emit = defineEmits(['update:modelValue', 'collect-done']);

const altitude = ref(props.modelValue != null ? String(props.modelValue) : '');
const collecting = ref(false);
const statusMsg = ref('');
const statusClass = ref('');
const detailText = ref('');
const sourceLabel = ref('');
const sourceBadgeClass = ref('');

watch(
	() => props.modelValue,
	(v) => {
		if (v !== null && v !== undefined) {
			altitude.value = String(v);
		}
	}
);

function onManualInput(e) {
	altitude.value = e.target.value;
	sourceLabel.value = '手动录入';
	sourceBadgeClass.value = 'badge--manual';
	statusMsg.value = '已切换为手动输入，可录入 RTK 手簿高程';
	statusClass.value = 'alt-status--info';
	detailText.value = '';
	emit('update:modelValue', altitude.value);
}

function _toValidHardwareAltitude(value) {
	const n = Number(value);
	if (!Number.isFinite(n)) return null;
	// 按需求：0 视为无效海拔，必须进入 C 场景。
	if (Math.abs(n) < 1e-6) return null;
	if (n < ALTITUDE_MIN_M || n > ALTITUDE_MAX_M) return null;
	return n;
}

function _toValidPressureHpa(value) {
	const p = Number(value);
	if (!Number.isFinite(p)) return null;
	if (p < BARO_PRESSURE_MIN_HPA || p > BARO_PRESSURE_MAX_HPA) return null;
	return p;
}

function _toFixed2(value) {
	return Number(value).toFixed(2);
}

function pressureToAltitude(pressureHpa, refPressureHpa = STD_PRESSURE_HPA) {
	return 44330 * (1 - Math.pow(pressureHpa / refPressureHpa, 1 / 5.255));
}

function fuseHardwareAltitude(gpsAlt, baroAlt, accuracy) {
	const acc = Number.isFinite(Number(accuracy)) ? Number(accuracy) : 999;
	const gpsW = acc <= 5 ? 0.6 : acc <= 15 ? 0.5 : acc <= 50 ? 0.4 : 0.3;
	return gpsAlt * gpsW + baroAlt * (1 - gpsW);
}

function _mapGpsError(err) {
	const raw = String((err && (err.message || err.errMsg || err.code)) || err || '');
	const msg = raw.toLowerCase();
	if (msg.includes('permission') || msg.includes('denied') || msg.includes('auth')) {
		return '定位权限被拒绝，请在系统设置中开启定位权限';
	}
	if (msg.includes('timeout') || msg.includes('timed out')) {
		return 'GPS 搜星超时，请移至开阔区域后重试';
	}
	if (msg.includes('provider') || msg.includes('gps') || msg.includes('disabled')) {
		return 'GPS 可能未开启，请先打开系统定位并重试';
	}
	return '获取原生 GPS 失败，请重试';
}

async function getNativeGpsPosition() {
	try {
		const res = await getGpsLocation({ timeout: GPS_TIMEOUT_MS + 6000 });
		return {
			longitude: Number(res.longitude),
			latitude: Number(res.latitude),
			altitude: res.altitude != null ? Number(res.altitude) : null,
			accuracy: res.accuracy != null ? Number(res.accuracy) : null,
		};
	} catch (err) {
		throw new Error(_mapGpsError(err));
	}
}

async function buildHardwareAltitude(gps) {
	const gpsAlt = _toValidHardwareAltitude(gps && gps.altitude);
	const pressure = await getPressure({ timeout: BARO_TIMEOUT_MS });

	let baroAlt = null;
	if (Number.isFinite(Number(pressure)) && pressure != null) {
		const validPressure = _toValidPressureHpa(pressure);
		if (validPressure == null) {
			return {
				altitude: gpsAlt,
				source: gpsAlt != null ? 'gps-only' : 'none',
				detail: gpsAlt != null
					? `硬件来源: GPS ${gpsAlt.toFixed(2)}m（气压值异常已忽略）`
					: '硬件来源: 气压值异常且GPS海拔无效',
			};
		}

		if (gpsAlt != null) {
			// 使用 GPS 绝对高程反推当前海平面参考气压，降低天气漂移误差。
			const refPressure = STD_PRESSURE_HPA * Math.pow(1 - gpsAlt / 44330, 5.255);
			baroAlt = _toValidHardwareAltitude(pressureToAltitude(validPressure, refPressure));
		} else {
			baroAlt = _toValidHardwareAltitude(pressureToAltitude(validPressure, STD_PRESSURE_HPA));
		}
	}

	if (gpsAlt != null && baroAlt != null) {
		const fused = _toValidHardwareAltitude(fuseHardwareAltitude(gpsAlt, baroAlt, gps && gps.accuracy));
		if (fused != null) {
			return {
				altitude: fused,
				source: 'gps+barometer',
				detail: `硬件融合: GPS ${gpsAlt.toFixed(2)}m + 气压推算 ${baroAlt.toFixed(2)}m`,
			};
		}
	}

	if (gpsAlt != null) {
		return {
			altitude: gpsAlt,
			source: 'gps-only',
			detail: `硬件来源: GPS ${gpsAlt.toFixed(2)}m（设备无气压计或读数不可用）`,
		};
	}

	if (baroAlt != null) {
		return {
			altitude: baroAlt,
			source: 'barometer-only',
			detail: `硬件来源: 气压计 ${baroAlt.toFixed(2)}m（GPS海拔无效，已通过范围校验）`,
		};
	}

	return {
		altitude: null,
		source: 'none',
		detail: '硬件来源: GPS海拔无效且设备未返回可用气压值',
	};
}

async function requestDemAltitude(longitude, latitude) {
	const fallbackDirectUrl = `${config.WEB_BASE_URL}/api/dem-elevation-lookup/`;
	const fallbackAppApiUrl = `${config.WEB_BASE_URL}/app-api/api/dem-elevation-lookup/`;
	const fallbackByReplace = `${String(config.API_BASE_URL || '').replace(/\/app-api\/?$/, '')}/api/dem-elevation-lookup/`;
	const urlCandidates = Array.from(
		new Set([props.demApiUrl, fallbackDirectUrl, fallbackAppApiUrl, fallbackByReplace].filter(Boolean))
	);

	let lastError = null;
	for (const targetUrl of urlCandidates) {
		let res;
		try {
			res = await request({
				url: targetUrl,
				method: 'POST',
				timeout: DEM_TIMEOUT_MS,
				header: { 'Content-Type': 'application/json' },
				data: { longitude, latitude },
			});
		} catch (err) {
			lastError = new Error(`DEM 请求失败: ${(err && err.errMsg) || 'network fail'} @ ${targetUrl}`);
			continue;
		}

		const data = res && res.data && typeof res.data === 'object' ? res.data : {};
		if (res.statusCode !== 200) {
			lastError = new Error(`DEM HTTP ${res.statusCode || 'ERR'} @ ${targetUrl}`);
			continue;
		}

		// 兼容多种后端格式：
		// 1) { code: 200, altitude: 421.50 }
		// 2) { success: true, elevation: 421.50 }
		// 3) { data: { altitude: 421.50 } }
		const demOk = data.code === 200 || data.success === true || data.status === 'success';
		const demAltitude = data.altitude ?? data.elevation ?? (data.data && (data.data.altitude ?? data.data.elevation));
		if (!demOk || demAltitude === null || demAltitude === undefined || Number.isNaN(Number(demAltitude))) {
			lastError = new Error(`DEM 返回无有效高程 @ ${targetUrl}`);
			continue;
		}

		return Number(demAltitude);
	}
	throw lastError || new Error('DEM 请求失败');
}

async function requestHardwareAltitudeFallback() {
	try {
		const res = await getLocation({ highAccuracy: true, timeout: 6000 });
		return _toValidHardwareAltitude(res && res.altitude);
	} catch (_) {
		return null;
	}
}

async function startCollect() {
	if (collecting.value) return;

	collecting.value = true;
	statusMsg.value = '正在调用原生 GPS 并请求 DEM 校准，请稍候…';
	statusClass.value = 'alt-status--info';
	sourceLabel.value = '';
	sourceBadgeClass.value = '';
	detailText.value = '';

	try {
		// 第一步：原生 GPS，拿到 WGS-84 平面坐标 + 硬件海拔。
		const gps = await getNativeGpsPosition();
		const longitude = Number(gps.longitude);
		const latitude = Number(gps.latitude);
		const hardware = await buildHardwareAltitude(gps);
		let hardwareAltitude = hardware.altitude;
		const accuracy = Number.isFinite(Number(gps.accuracy)) ? Number(gps.accuracy) : null;

		if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
			throw new Error('GPS 返回经纬度无效');
		}

		// 某些机型能返回经纬度，但 altitude 先返回 0/null。
		// 此处追加一次 getLocation 的海拔兜底读取，尽量避免误触发红色告警。
		if (hardwareAltitude == null) {
			hardwareAltitude = await requestHardwareAltitudeFallback();
		}

		let chosenAltitude = null;
		let chosenLabel = '';
		let chosenBadgeClass = '';
		let chosenStatus = '';
		let chosenStatusClass = '';
		let demFailureReason = '';

		// 第二步：优先尝试 DEM 反查。
		try {
			const demAltitude = await requestDemAltitude(longitude, latitude);
			chosenAltitude = demAltitude;
			chosenLabel = '🟢 DEM国家高程校准';
			chosenBadgeClass = 'badge--dem';
			chosenStatus = '后端 DEM 反查成功，已使用国家高程校准值';
			chosenStatusClass = 'alt-status--success';
		} catch (demErr) {
			demFailureReason = (demErr && demErr.message) || 'DEM 请求失败';
			// B/C 降级：网络失败或后端不可用时，绝不阻塞采集流程。
			if (hardwareAltitude != null) {
				chosenAltitude = hardwareAltitude;
				chosenLabel = '🟡 手机硬件高程(无网保底)';
				chosenBadgeClass = 'badge--hardware';
				chosenStatus = 'DEM 不可用，已降级为手机硬件海拔保底';
				chosenStatusClass = 'alt-status--success';
			} else {
				chosenAltitude = 0;
				chosenLabel = '🔴 信号断绝，请手动输入RTK手簿数据';
				chosenBadgeClass = 'badge--critical';
				chosenStatus = '网络中断且硬件海拔无效，已填充 0.00，请立即手动录入 RTK 数据';
				chosenStatusClass = 'alt-status--warn';
			}
		}

		altitude.value = _toFixed2(chosenAltitude);
		sourceLabel.value = chosenLabel;
		sourceBadgeClass.value = chosenBadgeClass;
		statusMsg.value = chosenStatus;
		statusClass.value = chosenStatusClass;

		detailText.value = `经度 ${longitude.toFixed(8)} ｜ 纬度 ${latitude.toFixed(8)} ｜ ${hardware.detail} ｜ 精度 ${accuracy != null ? `±${Math.round(accuracy)}m` : '未知'}${demFailureReason ? ` ｜ DEM失败: ${demFailureReason}` : ''}`;

		emit('update:modelValue', altitude.value);
		emit('collect-done', {
			longitude,
			latitude,
			accuracy,
			altitude: Number(altitude.value),
			hardwareAltitude,
			hardwareSource: hardware.source,
			source: chosenLabel,
		});

		toast(`海拔 ${altitude.value}m`, { icon: 'none', duration: 1800 });
	} catch (err) {
		statusMsg.value = (err && err.message) || '采集失败，请检查定位权限后重试';
		statusClass.value = 'alt-status--error';
		sourceLabel.value = '定位失败';
		sourceBadgeClass.value = 'badge--critical';
		detailText.value = '';
		toast(statusMsg.value, { icon: 'none', duration: 2600 });
	} finally {
		collecting.value = false;
	}
}

defineExpose({
	startCollect,
});
</script>

<style scoped>
.alt-widget {
	background: #fff;
	border-radius: 8px;
	padding: 2px 0 4px;
}

.alt-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 7px;
	flex-wrap: wrap;
	gap: 4px;
}

.alt-label {
	font-size: 14px;
	color: #374151;
	font-weight: 600;
}

.alt-badge {
	display: flex;
	align-items: center;
	padding: 2px 8px;
	border-radius: 10px;
}

.alt-badge-text {
	font-size: 10px;
	font-weight: 600;
}

.badge--gps { background: #dbeafe; }
.badge--gps .alt-badge-text { color: #174B8F; }

.badge--dem { background: #dcfce7; }
.badge--dem .alt-badge-text { color: #166534; }

.badge--hardware { background: #fef3c7; }
.badge--hardware .alt-badge-text { color: #92400e; }

.badge--critical { background: #fee2e2; }
.badge--critical .alt-badge-text { color: #b91c1c; }

.badge--fused { background: #d1fae5; }
.badge--fused .alt-badge-text { color: #065f46; }

.badge--manual { background: #f3f4f6; }
.badge--manual .alt-badge-text { color: #6b7280; }

.alt-row {
	display: flex;
	gap: 8px;
	align-items: center;
}

/* ⚠ 重要：绝不设置 pointer-events:none、opacity:0.5 或 disabled，
   普查员必须能随时点击输入框手动录入 RTK 读数覆盖自动值！ */
.alt-input {
	flex: 1;
	min-width: 0;
	min-height: 42px;
	background: #f8fafc;
	border: 1px solid #e2e8f0;
	border-radius: 6px;
	padding: 0 12px;
	font-size: 16px;
	color: #1e293b;
	box-sizing: border-box;
	outline: none;
}

.alt-btn {
	flex-shrink: 0;
	min-width: 94px;
	min-height: 42px;
	background: #1E5AA8;
	color: #fff;
	border-radius: 6px;
	font-size: 13px;
	font-weight: 600;
	border: none;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0 10px;
	box-sizing: border-box;
	line-height: 1;
}

.alt-btn:active {
	background: #174B8F;
	opacity: 0.9;
}

.alt-btn--loading {
	background: #93c5fd;
}

.alt-pulse {
	animation: alt-pulse-anim 1.2s ease-in-out infinite;
	display: inline-block;
}

@keyframes alt-pulse-anim {
	0%   { opacity: 1; }
	50%  { opacity: 0.35; }
	100% { opacity: 1; }
}

.alt-status {
	margin-top: 6px;
	padding: 6px 9px;
	border-radius: 5px;
}

.alt-status-text {
	font-size: 12px;
	line-height: 1.6;
}

.alt-status--info { background: #eff6ff; }
.alt-status--info .alt-status-text { color: #174B8F; }

.alt-status--success { background: #f0fdf4; }
.alt-status--success .alt-status-text { color: #15803d; }

.alt-status--error { background: #fef2f2; }
.alt-status--error .alt-status-text { color: #dc2626; }

.alt-status--warn { background: #fff7ed; }
.alt-status--warn .alt-status-text { color: #c2410c; }

.alt-detail {
	margin-top: 5px;
	padding: 5px 8px;
	background: #f8fafc;
	border-radius: 4px;
	border-left: 2px solid #cbd5e1;
}

.alt-detail-text {
	font-size: 10px;
	color: #94a3b8;
	line-height: 1.8;
	/* 等宽字体便于数字对齐阅读 */
	font-family: 'Courier New', Courier, monospace;
}
</style>
