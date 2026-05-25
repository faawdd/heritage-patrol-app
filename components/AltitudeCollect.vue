<template>
	<!--
	╔════════════════════════════════════════════════════════════╗
	║  AltitudeCollect.vue — 高精度海拔采集组件                  ║
	║  用法：<AltitudeCollect v-model="form.altitude" />        ║
	╚════════════════════════════════════════════════════════════╝
	-->
	<view class="alt-widget">

		<!-- ── ① 标签行（含数据来源徽标）─────────────────────────── -->
		<view class="alt-header">
			<text class="alt-label">海拔高程（米）</text>
			<view v-if="sourceLabel" :class="['alt-badge', sourceBadgeClass]">
				<text class="alt-badge-text">{{ sourceLabel }}</text>
			</view>
		</view>

		<!-- ── ② 输入框 + 自动采集按钮 ─────────────────────────────
		     ⚠ 输入框严禁设为 readonly/disabled，
		       普查员随时可手动录入专业 RTK 读数覆盖自动值！ -->
		<view class="alt-row">
			<input
				:value="altitude"
				type="digit"
				class="alt-input"
				placeholder="自动采集 或 手动填写"
				@input="onManualInput"
			/>
			<button
				:class="['alt-btn', collecting ? 'alt-btn--loading' : '']"
				:disabled="collecting"
				hover-class="alt-btn--press"
				@click="startCollect"
			>
				<text v-if="!collecting">📡 一键采集</text>
				<text v-else class="alt-pulse">采集中…</text>
			</button>
		</view>

		<!-- ── ③ 状态提示行 ──────────────────────────────────────── -->
		<view v-if="statusMsg" :class="['alt-status', statusClass]">
			<text class="alt-status-text">{{ statusMsg }}</text>
		</view>

		<!-- ── ④ 技术详情（供专业人员核查，可不显示） ────────────── -->
		<view v-if="detailText" class="alt-detail">
			<text class="alt-detail-text">{{ detailText }}</text>
		</view>

	</view>
</template>

<script setup>
/**
 * AltitudeCollect.vue
 * =====================================================
 * 工作流（严格按需求实现）：
 * 1. 点击【一键采集】→ 按钮立即进入 loading + disabled。
 * 2. 在 APP 端强制调用 plus.geolocation.getCurrentPosition，
 *    参数锁定 { provider: 'gps', enableHighAccuracy: true }。
 * 3. 拿到经纬度后立刻请求 Django DEM 接口。
 * 4. 三段降级：
 *    A. DEM 成功：用 DEM altitude 覆盖输入框，标签=🟢 DEM国家高程校准。
 *    B. DEM 失败/弱网：用手机硬件 altitude 保底，标签=🟡 手机硬件高程(无网保底)。
 *    C. 网络失败且硬件 altitude 无效(0/null)：填 0.00，标签=🔴 信号断绝，请手动输入RTK手簿数据。
 *
 * 注意：输入框始终可编辑，允许文保员手工覆盖。
 */

import { ref, watch } from 'vue';
import config from '../common/js/config.js';

// DEM 接口默认地址；如后端路径变化，可通过 props.demApiUrl 透传覆盖。
const DEFAULT_DEM_API_URL = `${config.API_BASE_URL}/api/dem-elevation-lookup/`;
const DEM_TIMEOUT_MS = 8000;
const GPS_TIMEOUT_MS = 12000;

const props = defineProps({
	modelValue: {
		type: [String, Number],
		default: '',
	},
	demApiUrl: {
		type: String,
		default: DEFAULT_DEM_API_URL,
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
	altitude.value = e.detail.value;
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
	return n;
}

function _toFixed2(value) {
	return Number(value).toFixed(2);
}

function _mapGpsError(err) {
	const raw = String((err && (err.message || err.errMsg)) || err || '');
	const msg = raw.toLowerCase();
	if (msg.includes('permission') || msg.includes('denied') || msg.includes('auth')) {
		return '定位权限被拒绝，请在系统设置中开启定位权限';
	}
	if (msg.includes('timeout')) {
		return 'GPS 搜星超时，请移至开阔区域后重试';
	}
	if (msg.includes('provider') || msg.includes('gps')) {
		return 'GPS 可能未开启，请先打开系统定位并重试';
	}
	return '获取原生 GPS 失败，请重试';
}

function getNativeGpsPosition() {
	return new Promise((resolve, reject) => {
		// #ifdef APP-PLUS
		try {
			plus.geolocation.getCurrentPosition(
				(position) => {
					const coords = position && position.coords ? position.coords : {};
					resolve({
						longitude: Number(coords.longitude),
						latitude: Number(coords.latitude),
						altitude: coords.altitude != null ? Number(coords.altitude) : null,
						accuracy: coords.accuracy != null ? Number(coords.accuracy) : null,
					});
				},
				(err) => {
					reject(new Error(_mapGpsError(err)));
				},
				{
					provider: 'gps',
					enableHighAccuracy: true,
					coordsType: 'wgs84',
					timeout: GPS_TIMEOUT_MS,
					maximumAge: 0,
					geocode: false,
				}
			);
		} catch (e) {
			reject(new Error(_mapGpsError(e)));
		}
		// #endif

		// #ifndef APP-PLUS
		uni.getLocation({
			type: 'wgs84',
			isHighAccuracy: true,
			altitude: true,
			highAccuracyExpireTime: GPS_TIMEOUT_MS,
			success(res) {
				resolve({
					longitude: Number(res.longitude),
					latitude: Number(res.latitude),
					altitude: res.altitude != null ? Number(res.altitude) : null,
					accuracy: res.accuracy != null ? Number(res.accuracy) : null,
				});
			},
			fail(err) {
				reject(new Error(_mapGpsError(err)));
			},
		});
		// #endif
	});
}

function requestDemAltitude(longitude, latitude) {
	return new Promise((resolve, reject) => {
		uni.request({
			url: props.demApiUrl,
			method: 'POST',
			timeout: DEM_TIMEOUT_MS,
			header: {
				'Content-Type': 'application/json',
			},
			data: {
				longitude,
				latitude,
			},
			success: (res) => {
				const data = res && res.data ? res.data : {};
				if (res.statusCode !== 200) {
					reject(new Error(`DEM HTTP ${res.statusCode || 'ERR'}`));
					return;
				}

				// 兼容两种后端格式：
				// 1) { code: 200, altitude: 421.50 }
				// 2) { success: true, elevation: 421.50 }
				const demOk = data.code === 200 || data.success === true;
				const demAltitude = data.altitude ?? data.elevation;
				if (!demOk || demAltitude === null || demAltitude === undefined || Number.isNaN(Number(demAltitude))) {
					reject(new Error('DEM 返回无有效高程')); 
					return;
				}

				resolve(Number(demAltitude));
			},
			fail: (err) => {
				reject(new Error(`DEM 请求失败: ${(err && err.errMsg) || 'network fail'}`));
			},
		});
	});
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
		// 第一步：强制原生 GPS，拿到 WGS-84 平面坐标 + 硬件海拔。
		const gps = await getNativeGpsPosition();
		const longitude = Number(gps.longitude);
		const latitude = Number(gps.latitude);
		const hardwareAltitude = _toValidHardwareAltitude(gps.altitude);
		const accuracy = Number.isFinite(Number(gps.accuracy)) ? Number(gps.accuracy) : null;

		if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
			throw new Error('GPS 返回经纬度无效');
		}

		let chosenAltitude = null;
		let chosenLabel = '';
		let chosenBadgeClass = '';
		let chosenStatus = '';
		let chosenStatusClass = '';

		// 第二步：优先尝试 DEM 反查。
		try {
			const demAltitude = await requestDemAltitude(longitude, latitude);
			chosenAltitude = demAltitude;
			chosenLabel = '🟢 DEM国家高程校准';
			chosenBadgeClass = 'badge--dem';
			chosenStatus = '后端 DEM 反查成功，已使用国家高程校准值';
			chosenStatusClass = 'alt-status--success';
		} catch (_demErr) {
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
				chosenStatusClass = 'alt-status--error';
			}
		}

		altitude.value = _toFixed2(chosenAltitude);
		sourceLabel.value = chosenLabel;
		sourceBadgeClass.value = chosenBadgeClass;
		statusMsg.value = chosenStatus;
		statusClass.value = chosenStatusClass;

		detailText.value = `经度 ${longitude.toFixed(8)} ｜ 纬度 ${latitude.toFixed(8)} ｜ 硬件海拔 ${gps.altitude != null ? Number(gps.altitude).toFixed(2) : 'null'} ｜ 精度 ${accuracy != null ? `±${Math.round(accuracy)}m` : '未知'}`;

		emit('update:modelValue', altitude.value);
		emit('collect-done', {
			longitude,
			latitude,
			accuracy,
			altitude: Number(altitude.value),
			hardwareAltitude,
			source: chosenLabel,
		});

		uni.showToast({
			title: `海拔 ${altitude.value}m`,
			icon: 'none',
			duration: 1800,
		});
	} catch (err) {
		statusMsg.value = (err && err.message) || '采集失败，请检查定位权限后重试';
		statusClass.value = 'alt-status--error';
		sourceLabel.value = '定位失败';
		sourceBadgeClass.value = 'badge--critical';
		detailText.value = '';
		uni.showToast({ title: statusMsg.value, icon: 'none', duration: 2600 });
	} finally {
		collecting.value = false;
	}
}
</script>

<style scoped>
/* ──────────────────────────────────────────────────────────────
   AltitudeCollect 组件样式
   遵循"克制、实用"的体制内 UI 风格，与 collect.vue 主体色调一致
   ────────────────────────────────────────────────────────────── */

/* ── 整体容器 ── */
.alt-widget {
	background: #fff;
	border-radius: 16rpx;
	/* 组件作为独立卡片使用时可加上 box-shadow 和 padding，
	   嵌入 collect.vue 的 .section 时可按需移除 */
	padding: 4rpx 0 8rpx;
}

/* ── 标签行 ── */
.alt-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 14rpx;
	flex-wrap: wrap;
	gap: 8rpx;
}

.alt-label {
	font-size: 28rpx;
	color: #374151;
	font-weight: 600;
}

/* ── 来源徽标 ── */
.alt-badge {
	display: flex;
	align-items: center;
	padding: 4rpx 16rpx;
	border-radius: 20rpx;
}

.alt-badge-text {
	font-size: 20rpx;
	font-weight: 600;
}

/* 仅 GPS */
.badge--gps {
	background: #dbeafe;
}
.badge--gps .alt-badge-text {
	color: #1d4ed8;
}

/* DEM 国家高程校准 */
.badge--dem {
	background: #dcfce7;
}
.badge--dem .alt-badge-text {
	color: #166534;
}

/* 手机硬件海拔保底 */
.badge--hardware {
	background: #fef3c7;
}
.badge--hardware .alt-badge-text {
	color: #92400e;
}

/* 极端降级：提示手动录入 RTK */
.badge--critical {
	background: #fee2e2;
}
.badge--critical .alt-badge-text {
	color: #b91c1c;
}

/* GPS + 气压计融合（绿色，精度更高） */
.badge--fused {
	background: #d1fae5;
}
.badge--fused .alt-badge-text {
	color: #065f46;
}

/* 手动录入 */
.badge--manual {
	background: #f3f4f6;
}
.badge--manual .alt-badge-text {
	color: #6b7280;
}

/* ── 输入框 + 按钮行 ── */
.alt-row {
	display: flex;
	gap: 16rpx;
	align-items: center;
}

/*
 * ⚠ 重要：绝不设置 pointer-events:none、opacity:0.5 或 disabled，
 *   普查员必须能随时点击输入框手动录入 RTK 读数覆盖自动值！
 */
.alt-input {
	flex: 1;
	min-height: 84rpx;
	background: #f8fafc;
	border: 2rpx solid #e2e8f0;
	border-radius: 12rpx;
	padding: 0 24rpx;
	font-size: 32rpx;
	color: #1e293b;
	box-sizing: border-box;
}

/* 采集按钮 */
.alt-btn {
	flex-shrink: 0;
	min-width: 188rpx;
	min-height: 84rpx;
	background: #2563eb;
	color: #fff;
	border-radius: 12rpx;
	font-size: 26rpx;
	font-weight: 600;
	border: none;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0 20rpx;
	box-sizing: border-box;
	line-height: 1;
}

.alt-btn--loading {
	background: #93c5fd;
}

.alt-btn--press {
	background: #1d4ed8;
	opacity: 0.9;
}

/* Loading 文字呼吸动画 */
.alt-pulse {
	animation: alt-pulse-anim 1.2s ease-in-out infinite;
	display: inline-block;
}

@keyframes alt-pulse-anim {
	0%   { opacity: 1; }
	50%  { opacity: 0.35; }
	100% { opacity: 1; }
}

/* ── 状态提示 ── */
.alt-status {
	margin-top: 12rpx;
	padding: 12rpx 18rpx;
	border-radius: 10rpx;
}

.alt-status-text {
	font-size: 24rpx;
	line-height: 1.6;
}

/* 信息（定位中） */
.alt-status--info {
	background: #eff6ff;
}
.alt-status--info .alt-status-text {
	color: #1d4ed8;
}

/* 成功 */
.alt-status--success {
	background: #f0fdf4;
}
.alt-status--success .alt-status-text {
	color: #15803d;
}

/* 失败 */
.alt-status--error {
	background: #fef2f2;
}
.alt-status--error .alt-status-text {
	color: #dc2626;
}

/* ── 技术详情（灰色小字，供专业人员核查原始数据） ── */
.alt-detail {
	margin-top: 10rpx;
	padding: 10rpx 16rpx;
	background: #f8fafc;
	border-radius: 8rpx;
	border-left: 4rpx solid #cbd5e1;
}

.alt-detail-text {
	font-size: 20rpx;
	color: #94a3b8;
	line-height: 1.8;
	/* 等宽字体便于数字对齐阅读 */
	font-family: 'Courier New', Courier, monospace;
}
</style>
